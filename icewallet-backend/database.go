package main

import (
	"context"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var mongoClient *mongo.Client
var entriesColl *mongo.Collection
var tokensColl	*mongo.Collection
var metaColl 	*mongo.Collection

func connectDB(uri string, dbName string) error {
	var err error

	mongoClient, err = mongo.Connect(context.TODO(), options.Client().ApplyURI(uri))
	if err != nil {
		return err
	}

	err = mongoClient.Ping(context.TODO(), nil)
	if err != nil {
		return err
	}

	db := mongoClient.Database(dbName)
	entriesColl = db.Collection("entries")
	tokensColl = db.Collection("tokens")
	metaColl = db.Collection("meta")
	return nil
}

func disconnectDB() error {
	return mongoClient.Disconnect(context.TODO())
}

func getEntriesColl() *mongo.Collection {
	return entriesColl
}

func getTokensColl() *mongo.Collection {
	return tokensColl
}

func getMetaColl() *mongo.Collection {
	return metaColl
}
