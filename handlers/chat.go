package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"real/db"

	"github.com/gorilla/websocket"

	rt_hub "real/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

func ServeWs(hub *rt_hub.Hub, w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_id")
	if err != nil {

		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	sessionID := cookie.Value

	var userID int
	var expiresAt time.Time
	err = db.DB.QueryRow("SELECT user_id, expires_at FROM sessions WHERE session_id = ?", sessionID).Scan(&userID, &expiresAt)
	if err != nil || expiresAt.Before(time.Now()) {
		log.Printf("WebSocket connection failed: Invalid session (%v)", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	client := &rt_hub.Client{Hub: hub, Conn: conn, Send: make(chan []byte, 256), UserID: userID}
	client.Hub.Register <- client

	go client.WritePump()
	go client.ReadPump()
}

// HandleGetUsers returns a list of all users to chat with.
func HandleGetUsers(w http.ResponseWriter, r *http.Request) {
	currentUserID, err := db.GetCurrentUserIDFromSession(r)
	if err != nil {

		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	users, err := db.GetUsersForChat(currentUserID)
	if err != nil {

		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if len(users) == 0 {
		log.Printf("No users found for chat for user ID: %d", currentUserID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// HandleGetMessages returns historical messages between two users.
func HandleGetMessages(w http.ResponseWriter, r *http.Request) {
	currentUserID, err := db.GetCurrentUserIDFromSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	otherUserIDStr := r.URL.Query().Get("with")
	otherUserID, err := strconv.Atoi(otherUserIDStr)
	if err != nil {
		http.Error(w, "Invalid 'with' user ID parameter", http.StatusBadRequest)
		return
	}

	go db.MarkMessagesAsRead(otherUserID, currentUserID)

	offsetStr := r.URL.Query().Get("offset")
	offset, _ := strconv.Atoi(offsetStr)
	limit := 10

	messages, err := db.GetPrivateMessages(currentUserID, otherUserID, limit, offset)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)

		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

// HandleGetOnlineUsers returns a list of currently online users
func HandleGetOnlineUsers(w http.ResponseWriter, r *http.Request) {
	currentUserID, err := db.GetCurrentUserIDFromSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	onlineUsers, err := db.GetOnlineUsers(currentUserID)
	if err != nil {
		log.Printf("Error fetching online users: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(onlineUsers)
}
