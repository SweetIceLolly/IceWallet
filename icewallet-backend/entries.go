package main

import (
	"context"
	"errors"
	"reflect"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	Date        = 0
	Amount      = 1
	Description = 2
	EntryDate   = 3
)

const (
	Lt          = 0
	Leq         = 1
	Gt          = 2
	Geq         = 3
	Eq          = 4
	Neq         = 5
	Contains    = 6
	NotContains = 7
)

type walletEntry struct {
	Description string    `bson:"description" json:"description"`
	Amount      float64   `bson:"amount" json:"amount"`
	Date        time.Time `bson:"date" json:"date"`
	CreateTime  time.Time `bson:"createTime" json:"createTime"`
}

type entryFilter struct {
	filterType      int
	filterOp        int
	filterFloatVal  float64
	filterStringVal string
	filterTimeVal   time.Time
}

func insertEntry(description string, amount float64, date string) error {
	// Parse time from date string
	t, err := time.Parse(time.RFC3339, date)
	if err != nil {
		return err
	}

	_, err = getEntriesColl().InsertOne(context.TODO(), walletEntry{
		Description: description,
		Amount:      amount,
		Date:        t,
		CreateTime:  time.Now(),
	})
	return err
}

func parseFiltersFromHttpBody(jsonBody map[string]interface{}) ([]entryFilter, error) {
	var filters []entryFilter

	for _, filter := range jsonBody["filter"].([]interface{}) {
		if reflect.TypeOf(filter).String() == "map[string]interface {}" {
			if checkBodyFields(filter.(map[string]interface{}), []string{"type", "operator"}, []string{"float64", "float64"}) {
				if filter.(map[string]interface{})["value"] != nil {
					val := filter.(map[string]interface{})["value"]
					valType := reflect.TypeOf(val).String()
					filterType := int(filter.(map[string]interface{})["type"].(float64))

					if (filterType == Date || filterType == EntryDate) && valType == "string" {
						parsedTime, err := time.Parse(time.RFC3339, val.(string))
						if err != nil {
							return nil, err
						}
						filters = append(filters, entryFilter{
							filterType:    filterType,
							filterOp:      int(filter.(map[string]interface{})["operator"].(float64)),
							filterTimeVal: parsedTime,
						})
					} else if filterType == Amount && valType == "float64" {
						filters = append(filters, entryFilter{
							filterType:     filterType,
							filterOp:       int(filter.(map[string]interface{})["operator"].(float64)),
							filterFloatVal: val.(float64),
						})
					} else if filterType == Description && valType == "string" {
						filters = append(filters, entryFilter{
							filterType:      filterType,
							filterOp:        int(filter.(map[string]interface{})["operator"].(float64)),
							filterStringVal: val.(string),
						})
					} else {
						return nil, errors.New("invalid filter type and value combination")
					}
				} else {
					return nil, errors.New("missing filter value")
				}
			} else {
				return nil, errors.New("invalid filter body format")
			}
		} else {
			return nil, errors.New("invalid filter body format")
		}
	}

	return filters, nil
}

func buildFilters(filters []entryFilter) (map[string]interface{}, error) {
	if len(filters) == 0 {
		return nil, nil
	}

	query := make(map[string]interface{})
	query["$and"] = make([]map[string]interface{}, 0)

	for _, filter := range filters {
		var filterType, filterOp string
		var filterVal interface{}

		switch filter.filterType {
		case Date:
			filterType = "date"
			filterVal = filter.filterTimeVal
		case Amount:
			filterType = "amount"
			filterVal = filter.filterFloatVal
		case Description:
			filterType = "description"
			filterVal = filter.filterStringVal
		case EntryDate:
			filterType = "createTime"
			filterVal = filter.filterTimeVal
		default:
			return nil, errors.New("invalid filter type")
		}

		switch filter.filterOp {
		case Lt:
			filterOp = "$lt"
		case Leq:
			filterOp = "$lte"
		case Gt:
			filterOp = "$gt"
		case Geq:
			filterOp = "$gte"
		case Eq:
			filterOp = "$eq"
		case Neq:
			filterOp = "$ne"
		case Contains:
			filterOp = "$regex"
			filterVal = ".*" + filterVal.(string) + ".*"
		case NotContains:
			filterOp = "$regex"
			filterVal = "^(?!" + filterVal.(string) + ").*$"
		default:
			return nil, errors.New("invalid filter op")
		}

		filterQuery := make(map[string]interface{})
		filterQuery[filterType] = make(map[string]interface{})
		if filterOp == "$regex" {
			filterQuery[filterType].(map[string]interface{})["$regex"] = filterVal
			filterQuery[filterType].(map[string]interface{})["$options"] = "i"
		} else {
			filterQuery[filterType].(map[string]interface{})[filterOp] = filterVal
		}
		query["$and"] = append(query["$and"].([]map[string]interface{}), filterQuery)
	}

	return query, nil
}

func findEntries(query map[string]interface{}, start int64, limit int64, sort string) ([]bson.M, error) {
	// Get sort field
	var sortField string
	switch sort {
	case "date":
		sortField = "date"
	case "amount":
		sortField = "amount"
	case "desc":
		sortField = "description"
	case "entryDate":
		sortField = "createTime"
	default:
		sortField = "date"
	}

	// Execute query
	cursor, err := getEntriesColl().Find(context.TODO(), query, &options.FindOptions{
		Skip:  &start,
		Limit: &limit,
		Sort:  map[string]interface{}{sortField: -1},
	})
	if err != nil {
		return nil, err
	}

	// Parse results
	var results []bson.M
	if err = cursor.All(context.Background(), &results); err != nil {
		return nil, err
	}

	if len(results) == 0 {
		return []bson.M{}, nil
	} else {
		return results, nil
	}
}

/**
 * Get the total number and sum of entries
 * @param filters The filters to apply
 * @return Total number of entries, sum of positive entries, sum of negative entries, error
 */
func sumAndCountEntries(query map[string]interface{}) (bson.M, error) {
	var pipeline []bson.M

	group := bson.M{
		"_id": nil,
		"positiveTotal": bson.M{
			"$sum": bson.M{
				"$cond": bson.M{
					"if": bson.M{
						"$gte": []interface{}{"$amount", 0},
					},
					"then": "$amount",
					"else": 0,
				},
			},
		},
		"negativeTotal": bson.M{
			"$sum": bson.M{
				"$cond": bson.M{
					"if": bson.M{
						"$lt": []interface{}{"$amount", 0},
					},
					"then": "$amount",
					"else": 0,
				},
			},
		},
		"count": bson.M{"$sum": 1},
	}

	if query != nil {
		pipeline = []bson.M{
			{"$match": query},
			{"$group": group},
		}
	} else {
		pipeline = []bson.M{
			{"$group": group},
		}
	}

	cursor, err := getEntriesColl().Aggregate(context.TODO(), pipeline)
	if err != nil {
		return nil, err
	}

	// Parse results
	var results []bson.M
	if err = cursor.All(context.Background(), &results); err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return bson.M{
			"count":         0,
			"positiveTotal": 0,
			"negativeTotal": 0,
		}, nil
	} else {
		return results[0], nil
	}
}

func deleteEntries(entryId string) error {
	id, err := primitive.ObjectIDFromHex(entryId)
	if err != nil {
		return err
	}

	_, err = getEntriesColl().DeleteMany(context.TODO(), bson.M{"_id": id})
	return err
}

func updateEntry(entryId string, description string, amount float64, date string) error {
	id, err := primitive.ObjectIDFromHex(entryId)
	if err != nil {
		return err
	}

	// Parse time from date string
	var t time.Time
	t, err = time.Parse(time.RFC3339, date)
	if err != nil {
		return err
	}

	_, err = getEntriesColl().UpdateOne(context.TODO(), bson.D{
		{"_id", id},
	}, bson.D{
		{"$set", bson.D{
			{"description", description},
			{"amount", amount},
			{"date", t},
		}},
	})
	return err
}
