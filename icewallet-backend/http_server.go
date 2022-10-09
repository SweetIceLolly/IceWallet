package main

import (
	"net/http"
	"os"
	"strings"
)

var corsDomains map[string]bool

func addHttpRoute(method string, path string, handler http.HandlerFunc) {
	if method == "GET" {
		http.HandleFunc(path, func(w http.ResponseWriter, r *http.Request) {
			// Check if domain is allowed
			if !corsDomains[r.Header.Get("Origin")] {
				w.WriteHeader(http.StatusForbidden)
				return
			} else {
				w.Header().Set("Access-Control-Allow-Origin", r.Header.Get("Origin"))
				w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
				if r.Method == "OPTIONS" {
					w.WriteHeader(http.StatusOK)
					return
				}
			}

			// Only allow GET requests
			if r.Method == "GET" {
				handler(w, r)
			} else {
				w.WriteHeader(http.StatusMethodNotAllowed)
			}
		})
	} else if method == "POST" {
		http.HandleFunc(path, func(w http.ResponseWriter, r *http.Request) {
			// Check if domain is allowed
			if !corsDomains[r.Header.Get("Origin")] {
				w.WriteHeader(http.StatusForbidden)
				return
			} else {
				w.Header().Set("Access-Control-Allow-Origin", r.Header.Get("Origin"))
				w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
				if r.Method == "OPTIONS" {
					w.WriteHeader(http.StatusOK)
					return
				}
			}

			// Only allow POST requests
			if r.Method == "POST" {
				handler(w, r)
			} else {
				w.WriteHeader(http.StatusMethodNotAllowed)
			}
		})
	} else {
		panic("Unsupported HTTP method")
	}
}

func startHttpServer(listenAddr string) error {
	// Parse CORS domains
	corsDomains = make(map[string]bool)
	for _, domain := range strings.Split(os.Getenv("CORS_DOMAINS"), ",") {
		corsDomains[domain] = true
	}

	// Start HTTP server
	return http.ListenAndServe(listenAddr, nil)
}
