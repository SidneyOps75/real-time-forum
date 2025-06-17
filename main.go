package main

import (
	"log"
	"net/http"
	"path/filepath"
	"real/db"
	"real/handlers"
	rt_hub "real/websocket"
)

func main() {
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
	http.HandleFunc("/comment/like", handlers.CommentReactionHandler)
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handlers.ServeWs(hub, w, r)
	})
	http.HandleFunc("/api/users", handlers.HandleGetUsers)
	http.HandleFunc("/api/messages", handlers.HandleGetMessages)
	http.HandleFunc("/api/validate-session", handlers.ValidateSessionHandler)

	// Serve index.html for all other routes
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if filepath.Ext(r.URL.Path) == "" {
			http.ServeFile(w, r, "./static/index.html")
		} else {
			http.NotFound(w, r)
		}
	})

	log.Println("Server started at http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}