package main

import (
	"fmt"
	"log"
	"os"
)

func initHttpRoutes() {
	// Credentials
	addHttpRoute("POST", "/login", loginHandler)
	addHttpRoute("POST", "/logout", logoutHandler)
	addHttpRoute("POST", "/changePassword", changePasswordHandler)
	addHttpRoute("GET", "/getPublicKey", getPublicKeyHandler)
	addHttpRoute("POST", "/clearTokens", clearTokensHandler)

	// Entry management
	addHttpRoute("POST", "/createEntry", createEntryHandler)
	addHttpRoute("POST", "/getEntries", getEntriesHandler)
	addHttpRoute("POST", "/deleteEntry", deleteEntryHandler)
	addHttpRoute("POST", "/updateEntry", updateEntryHandler)
	addHttpRoute("POST", "/getMonthlyReport", getMonthlyReportHandler)
}

func main() {
	// Check commandline
	// If we are in the key generation mode, generate keys and exit
	if len(os.Args) == 2 {
		if os.Args[1] == "--genkey" {
			log.Println("Generating key pair...")

			privateKey, publicKey, err := generateKeyPair()
			if err != nil {
				log.Fatal(err)
			}
			println(privateKey)
			println("\n========================================\n\n")
			println(publicKey)

			log.Println("You may want to save these keys to somewhere safe.")
			log.Println("Be sure to update the .env file!")
			log.Println("Key pair generated, exiting...")
			return
		} else if os.Args[1] == "--pwd" {
			log.Println("You are in the password reset mode")
		} else {
			log.Fatal("Use --genkey to generate a key pair\nUse --pwd to reset the password")
		}
	} else if len(os.Args) != 1 {
		log.Fatal("Use --genkey to generate a key pair")
	}

	// Load environment variables
	log.Println("Loading environment variables...")
	err := loadEnvVars()
	if err != nil {
		log.Fatal(err)
	}

	// Connect to database
	log.Println("Connecting to database...")
	err = connectDB(os.Getenv("MONGODB_URI"), os.Getenv("MONGODB_DB"))
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		err := disconnectDB()
		if err != nil {
			log.Fatal(err)
		}
	}()
	log.Println("Connected to database")

	// Check password reset mode
	if len(os.Args) == 2 && os.Args[1] == "--pwd" {
		log.Print("Provide a new password: ")
		var newPassword string
		_, err := fmt.Scanln(&newPassword)
		if err != nil {
			log.Fatal(err)
		}
		err = changePassword(newPassword)
		if err != nil {
			log.Fatal(err)
		}
		log.Println("Password changed successfully, exiting...")
		return
	}

	// Check if password exists
	if !checkPasswordExists() {
		log.Fatal("Password does not exists, please run with --pwd to set a password")
	}

	// Decode private/public keys
	err = initRSAkeys()
	if err != nil {
		log.Fatal(err)
	}
	if verifyKeyPair() {
		log.Println("Private/public key pair seems to be valid")
	} else {
		log.Println("WARNING: The private/public key pair seems to be invalid!")
	}

	// Start HTTP server
	log.Println("Allowed domains:", os.Getenv("CORS_DOMAINS"))
	serverAddr := os.Getenv("LISTENING_ADDRESS") + ":" + os.Getenv("LISTENING_PORT")
	log.Println("HTTP server listening on " + serverAddr)
	initHttpRoutes()
	err = startHttpServer(serverAddr)
	if err != nil {
		log.Fatal(err)
	}
}
