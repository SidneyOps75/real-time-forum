package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"real/db"
	"real/handlers"

	rt_hub "real/websocket"

	_ "github.com/mattn/go-sqlite3"
)

// initializeDatabaseFromSchema creates the database from schema if it doesn't exist
func initializeDatabaseFromSchema() error {
	// Check if schema file exists
	schemaPath := "db/schema.sql"
	if _, err := os.Stat(schemaPath); os.IsNotExist(err) {
		return fmt.Errorf("schema file not found: %s", schemaPath)
	}

	// Read schema file
	schemaBytes, err := os.ReadFile(schemaPath)
	if err != nil {
		return fmt.Errorf("error reading schema file: %v", err)
	}

	// Create database
	database, err := sql.Open("sqlite3", "./forum.db")
	if err != nil {
		return fmt.Errorf("error creating database: %v", err)
	}
	defer database.Close()

	// Execute schema
	if _, err := database.Exec(string(schemaBytes)); err != nil {
		return fmt.Errorf("error executing schema: %v", err)
	}

	return nil
}

func main() {
	// Check if database exists, if not, initialize it
	if _, err := os.Stat("forum.db"); os.IsNotExist(err) {
		fmt.Println("🔧 Database not found. Initializing...")
		if err := initializeDatabaseFromSchema(); err != nil {
			log.Fatalf("❌ Failed to initialize database: %v", err)
		}
		fmt.Println("✅ Database initialized successfully!")
	}

	if err := db.Init("./forum.db"); err != nil {
		log.Fatalf("Database initialization failed: %v", err)
	}
	defer db.DB.Close()

	// Initialize the WebSocket Hub
	hub := rt_hub.NewHub()
	go hub.Run()

	// Serve static files with proper MIME types
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("./static"))))
	http.Handle("/images/", http.StripPrefix("/images/", http.FileServer(http.Dir("static/images"))))

	// Explicit handler for JavaScript files
	http.HandleFunc("/js/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/javascript")
		http.ServeFile(w, r, "./static"+r.URL.Path)
	})

	// Existing API handlers
	http.HandleFunc("/api/categories", handlers.GetCategoriesHandler)
	http.HandleFunc("/api/posts", handlers.GetPostsHandler)
	http.HandleFunc("/post/create", handlers.CreatePostHandler)
	http.HandleFunc("/login", handlers.LoginHandler)
	http.HandleFunc("/register", handlers.RegisterHandler)
	http.HandleFunc("/like", handlers.LikeHandler)
	http.HandleFunc("/comment/create", handlers.CreateCommentHandler)
	http.HandleFunc("/comments", handlers.GetCommentsHandler)
	http.HandleFunc("/comment/like", handlers.CommentReactionHandler)
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handlers.ServeWs(hub, w, r)
	})
	http.HandleFunc("/api/users", handlers.HandleGetUsers)
	http.HandleFunc("/api/messages", handlers.HandleGetMessages)
	http.HandleFunc("/api/online-users", handlers.HandleGetOnlineUsers)
	http.HandleFunc("/api/validate-session", handlers.ValidateSessionHandler)

	// Serve index.html for all other routes
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if filepath.Ext(r.URL.Path) == "" {
			http.ServeFile(w, r, "./static/index.html")
		} else {
			http.NotFound(w, r)
		}
	})

	log.Println("Server started at http://localhost:9002")
	log.Fatal(http.ListenAndServe(":9002", nil))
}
