package main

import (
	"log"
	"net/http"
	"real/db"
	"real/handlers"
	rt_hub"real/websocket"
	 

)



func main() {
	if err := db.Init("./forum.db"); err != nil {
		log.Fatalf("Database initialization failed: %v", err)
	}
	defer db.DB.Close()

	// Initialize the WebSocket Hub
	hub := rt_hub.NewHub()
	go hub.Run()

	// Serve static files
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))
	http.Handle("/images/", http.StripPrefix("/images/", http.FileServer(http.Dir("static/images/"))))

	// --- API and Page Routes ---

	// Existing Handlers
	http.HandleFunc("/api/categories", handlers.GetCategoriesHandler)
	http.HandleFunc("/api/posts", handlers.GetPostsHandler)
	http.HandleFunc("/post/create", handlers.CreatePostHandler)
	// You might want to apply your recoverMiddleware to all handlers
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

	// Serve the main index.html for the SPA
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/index.html")
	})

	// Start server
	log.Println("Server started at http://localhost:9099")
	log.Fatal(http.ListenAndServe(":9099", nil))

}
