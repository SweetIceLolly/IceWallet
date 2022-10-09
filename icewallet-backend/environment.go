package main

import (
	"github.com/joho/godotenv"
)

func loadEnvVars() error {
	err := godotenv.Load()
	if err != nil {
		return err
	}

	return nil
}
