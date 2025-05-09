package main

import (
	"log"
	"net/http"
	"real/db"
	"real/handlers"
)

func main() {
	// Initialize database
	if err := db.Init("./forum.db"); err != nil {
		log.Fatalf("Database initialization failed: %v", err)
	}
	defer db.DB.Close()

	// Set up API routes
	http.HandleFunc("/login", handlers.LoginHandler)
	http.HandleFunc("/register", handlers.RegisterHandler)
	
	// Serve static files
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// If it's not an actual file/resource being requested, serve the SPA
		if r.URL.Path != "/" && r.URL.Path != "/index.html" {
			// Check if the file exists
			if _, err := http.Dir("./static").Open(r.URL.Path); err != nil {
				
				http.ServeFile(w, r, "./static/index.html")
				return
			}
		}
		
		http.ServeFile(w, r, "./static/index.html")
	})

	// Start server
	log.Println("Server started at http://localhost:8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}