package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"reflect"
	"sync"

	"go.mongodb.org/mongo-driver/bson"
)

func checkBodyFields(json map[string]interface{}, fields []string, typeNames []string) bool {
	for i, field := range fields {
		if json[field] == nil || reflect.TypeOf(json[field]).String() != typeNames[i] {
			return false
		}
	}
	return true
}

/*
POST /createEntry
Create a new entry
Header: Authorization: <token>
Body fields: desc, amount, date
	desc: the description of the entry
	amount: the amount of the entry
	date: the date of the entry
Response: 201 Created if successful, no body
*/
func createEntryHandler(w http.ResponseWriter, r *http.Request) {
	// Verify token
	token := r.Header.Get("Authorization")
	if !verifyToken(token) {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Parse body
	var entry map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&entry)
	if err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if !checkBodyFields(entry, []string{"description", "amount", "date"}, []string{"string", "float64", "string"}) {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	// Create entry
	err = insertEntry(entry["description"].(string), entry["amount"].(float64), entry["date"].(string))
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

/*
POST /getEntries
Get entries according to the provided filter and limit. Also return the number and sum of all entries that match the filter.
Header: Authorization: <token>
Body fields: filter, start, limit, sort
	filter: an array of entryFilter objects
	start: the index of the first entry to return
	limit: the maximum number of entries to return. Cannot be greater than 100
	sort: the field to sort by. Must be one of desc, amount, date, dateOfEntry
Response:
	{ entries: [entry], total: <amount of entries>, count: <number of entries> }
*/
func getEntriesHandler(w http.ResponseWriter, r *http.Request) {
	// Verify token
	token := r.Header.Get("Authorization")
	if !verifyToken(token) {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Parse body
	var searchInfo map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&searchInfo)
	if err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if !checkBodyFields(searchInfo, []string{"filter", "start", "limit", "sort"}, []string{"[]interface {}", "float64", "float64", "string"}) {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	// Parse filter
	var filters []entryFilter
	filters, err = parseFiltersFromHttpBody(searchInfo)
	if err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	// Check if limit is valid
	var start = int64(searchInfo["start"].(float64))
	var limit = int64(searchInfo["limit"].(float64))
	if limit > 100 || limit < 0 {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	// Search entries
	var query map[string]interface{}
	query, err = buildFilters(filters)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	var entriesResult []bson.M
	var aggregationResult bson.M
	hasError := false

	wg := sync.WaitGroup{}
	wg.Add(2)

	// Get entries content
	go func() {
		defer wg.Done()

		entriesResult, err = findEntries(query, start, limit, searchInfo["sort"].(string))
		if err != nil {
			hasError = true
			return
		}
	}()

	// Get entries count and sum
	go func() {
		defer wg.Done()

		aggregationResult, err = sumAndCountEntries(query)
		if err != nil {
			hasError = true
			return
		}
	}()

	wg.Wait()
	if hasError {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	err = json.NewEncoder(w).Encode(map[string]interface{}{
		"entries":        entriesResult,
		"positiveAmount": aggregationResult["positiveTotal"],
		"negativeAmount": aggregationResult["negativeTotal"],
		"count":          aggregationResult["count"],
	})
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

/*
POST /deleteEntry
Delete specified entry
Header: Authorization: <token>
Body fields: id
	id: the id of the entry to delete
Response: 200 OK if successful, no body
*/
func deleteEntryHandler(w http.ResponseWriter, r *http.Request) {
	// Verify token
	token := r.Header.Get("Authorization")
	if !verifyToken(token) {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Parse body
	var deleteInfo map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&deleteInfo)
	if err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if !checkBodyFields(deleteInfo, []string{"id"}, []string{"string"}) {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	// Delete entries
	err = deleteEntries(deleteInfo["id"].(string))
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

/*
POST /updateEntry
Update an entry, provided the id and the new content
Header: Authorization: <token>
Body fields: id, description, amount, date
	id: the id of the entry to update
	description: the new description
	amount: the new amount
	date: the new date
Response: 200 OK if successful, no body
*/
func updateEntryHandler(w http.ResponseWriter, r *http.Request) {
	// Verify token
	token := r.Header.Get("Authorization")
	if !verifyToken(token) {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Parse body
	var updateInfo map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&updateInfo)
	if err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if !checkBodyFields(updateInfo, []string{"id", "description", "amount", "date"}, []string{"string", "string", "float64", "string"}) {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	// Update entry
	err = updateEntry(updateInfo["id"].(string), updateInfo["description"].(string), updateInfo["amount"].(float64), updateInfo["date"].(string))
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

/*
POST /changePassword
Change the login password
Header: Authorization: <token>
Body fields: oldPassword, newPassword
	oldPassword: the user's current password, encrypted with the server's public key
	newPassword: the user's new password, encrypted with the server's public key
Response: 200 OK if successful, no body
*/
func changePasswordHandler(w http.ResponseWriter, r *http.Request) {
	// Verify token
	token := r.Header.Get("Authorization")
	if !verifyToken(token) {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Parse body
	var changeInfo map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&changeInfo)
	if err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if !checkBodyFields(changeInfo, []string{"oldPassword", "newPassword"}, []string{"string", "string"}) {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	// Decrypt the old password
	oldPassword, err := decryptPassword(changeInfo["oldPassword"].(string))
	if err != nil {
		http.Error(w, "Invalid old password", http.StatusBadRequest)
		return
	}
	if !verifyPassword(oldPassword) {
		http.Error(w, "Invalid old password", http.StatusBadRequest)
		return
	}

	// Decrypt the new password
	var newPassword string
	newPassword, err = decryptPassword(changeInfo["newPassword"].(string))
	if err != nil {
		http.Error(w, "Invalid new password", http.StatusBadRequest)
		return
	}

	// Update the password
	err = changePassword(newPassword)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

/*
POST /login
Login to the server and get a token
Header: none
Body fields: password
	password: the user's password, encrypted with the server's public key
Response:
	{ token: <token> }
*/
func loginHandler(w http.ResponseWriter, r *http.Request) {
	// Parse body
	var password map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&password)
	if err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if !checkBodyFields(password, []string{"password"}, []string{"string"}) {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	// Decrypt the password
	var decryptedPassword string
	decryptedPassword, err = decryptPassword(password["password"].(string))
	if err != nil {
		http.Error(w, "Invalid password", http.StatusBadRequest)
		return
	}

	// Verify password
	if !verifyPassword(decryptedPassword) {
		http.Error(w, "Invalid password", http.StatusBadRequest)
		return
	}

	// Create token
	var token string
	token, err = generateToken()
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Send token
	var tokenJson map[string]string
	tokenJson = make(map[string]string)
	tokenJson["token"] = token
	err = json.NewEncoder(w).Encode(tokenJson)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

/*
POST /logout
Delete the token from the server
Header: Authorization: <token>
Body fields: none
Response: 200 OK if successful, no body
*/
func logoutHandler(w http.ResponseWriter, r *http.Request) {
	// Verify token
	token := r.Header.Get("Authorization")
	if !verifyToken(token) {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Delete token
	err := deleteToken(token)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

/*
POST /getPublicKey
Obtain the server's public key
Header: none
Body fields: none
Response:
	{ publicKey: <public key> }
*/
func getPublicKeyHandler(w http.ResponseWriter, r *http.Request) {
	// Send public key
	var publicKeyJson map[string]string
	publicKeyJson = make(map[string]string)
	publicKeyJson["key"] = publicKeyStr
	err := json.NewEncoder(w).Encode(publicKeyJson)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

/*
POST /clearTokens
Delete all tokens from the server
Header: Authorization: <token>
Body fields: none
Response: 200 OK if successful, no body
*/
func clearTokensHandler(w http.ResponseWriter, r *http.Request) {
	// Verify token
	token := r.Header.Get("Authorization")
	if !verifyToken(token) {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Delete all tokens
	err := deleteAllTokens()
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

/*
POST /getMonthlyReport
Get monthly income and expense report for a given year
Header: Authorization: <token>
Body fields: year
	year: the year to get the report for (e.g., 2025)
Response:
	{ monthlyData: [{ month: 1, income: 100.00, expense: 50.00 }, ...] }
	Returns 12 months of data, with zero values for months with no entries
*/
func getMonthlyReportHandler(w http.ResponseWriter, r *http.Request) {
	// Verify token
	token := r.Header.Get("Authorization")
	if !verifyToken(token) {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Parse body
	var reportInfo map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&reportInfo)
	if err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	// Parse year - accept both string and number formats
	var year int
	if reportInfo["year"] == nil {
		http.Error(w, "Missing year field", http.StatusBadRequest)
		return
	}
	switch v := reportInfo["year"].(type) {
	case float64:
		year = int(v)
	case string:
		_, err := fmt.Sscanf(v, "%d", &year)
		if err != nil {
			http.Error(w, "Invalid year format", http.StatusBadRequest)
			return
		}
	default:
		http.Error(w, "Invalid year type", http.StatusBadRequest)
		return
	}

	// Validate year range (reasonable bounds)
	if year < 1900 || year > 2100 {
		http.Error(w, "Invalid year", http.StatusBadRequest)
		return
	}

	// Get monthly report
	monthlyData, err := getMonthlyReport(year)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	err = json.NewEncoder(w).Encode(map[string]interface{}{
		"monthlyData": monthlyData,
	})
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}
