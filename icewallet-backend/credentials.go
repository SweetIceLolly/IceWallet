package main

import (
	"context"

	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	mathRnd "math/rand"
	"os"
	"reflect"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"golang.org/x/crypto/bcrypt"
)

var publicKeyStr string
var publicKey *rsa.PublicKey
var privateKey *rsa.PrivateKey

func getRandomHash() string {
	var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	mathRnd.Seed(time.Now().UnixNano())
	b := make([]rune, 32)
	for i := range b {
		b[i] = letters[mathRnd.Intn(len(letters))]
	}
	return string(b)
}

func generateToken() (string, error) {
	// Insert token into database
	token := getRandomHash()
	_, err := getTokensColl().InsertOne(context.TODO(), map[string]interface{}{
		"token": token,
	})
	if err != nil {
		return "", err
	}

	return token, nil
}

func generateKeyPair() (string, string, error) {
	// Generate private key
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return "", "", err
	}

	// Generate public key
	publicKey := privateKey.PublicKey

	// Encode the keys
	privateKeyPem := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(privateKey),
	})
	publicKeyPem := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PUBLIC KEY",
		Bytes: x509.MarshalPKCS1PublicKey(&publicKey),
	})

	replaceNewLine := func(str string) string {
		return strings.ReplaceAll(str, "\n", "\\n")
	}

	return replaceNewLine(string(privateKeyPem)), replaceNewLine(string(publicKeyPem)), nil
}

func verifyKeyPair() bool {
	// Generate random password
	password := getRandomHash()

	// Encrypt password
	encryptedBytes, err := rsa.EncryptPKCS1v15(rand.Reader, publicKey, []byte(password))
	if err != nil {
		return false
	}

	// Decrypt password
	var decryptedChallenge string
	decryptedChallenge, err = decryptPassword(base64.StdEncoding.EncodeToString(encryptedBytes))
	if err != nil {
		return false
	}

	// Verify password
	return decryptedChallenge == password
}

func initRSAkeys() error {
	// Parse private key
	privateKeyStr := os.Getenv("PRIVATE_KEY")
	block, _ := pem.Decode([]byte(privateKeyStr))
	if block == nil {
		return errors.New("private key is invalid")
	}

	var err error
	privateKey, err = x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return err
	}

	// Parse public key
	publicKeyStr = os.Getenv("PUBLIC_KEY")
	block, _ = pem.Decode([]byte(publicKeyStr))
	if block == nil {
		return errors.New("public key is invalid")
	}

	publicKey, err = x509.ParsePKCS1PublicKey(block.Bytes)
	return err
}

func decryptPassword(password string) (string, error) {
	// Decrypt password
	var decryptedBytes []byte

	challengeBytes, err := base64.StdEncoding.DecodeString(password)
	decryptedBytes, err = rsa.DecryptPKCS1v15(rand.Reader, privateKey, challengeBytes)
	if err != nil {
		return "", err
	}
	return string(decryptedBytes), nil
}

func verifyToken(token string) bool {
	// Check if token exists in database
	var result bson.M
	err := getTokensColl().FindOne(context.TODO(), bson.D{{"token", token}}).Decode(&result)
	if err != nil {
		return false
	}

	return reflect.TypeOf(result["token"]).String() == "string" && result["token"].(string) == token
}

func deleteToken(token string) error {
	_, err := getTokensColl().DeleteOne(context.TODO(), bson.D{{"token", token}})
	return err
}

func deleteAllTokens() error {
	_, err := getTokensColl().DeleteMany(context.TODO(), bson.D{})
	return err
}

func checkPasswordExists() bool {
	var result bson.M
	err := getMetaColl().FindOne(context.TODO(), bson.D{{"type", "password"}}).Decode(&result)
	return err == nil
}

func changePassword(password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	if checkPasswordExists() {
		_, err = getMetaColl().UpdateOne(context.TODO(), bson.D{{"type", "password"}}, bson.D{
			{
				"$set", bson.D{
					{"password", string(hashedPassword)},
				},
			},
		})
	} else {
		_, err = getMetaColl().InsertOne(context.TODO(), map[string]interface{}{
			"type":     "password",
			"password": string(hashedPassword),
		})
	}

	return err
}

func verifyPassword(password string) bool {
	// Find the password document
	var result bson.M
	err := getMetaColl().FindOne(context.TODO(), bson.D{{"type", "password"}}).Decode(&result)
	if err != nil {
		return false
	}

	// Compare password
	err = bcrypt.CompareHashAndPassword([]byte(result["password"].(string)), []byte(password))
	return err == nil
}
