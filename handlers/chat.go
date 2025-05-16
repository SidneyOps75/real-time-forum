package handlers

import (
	"log"
	"net/http"
	"time"

	"real/db"
	"real/auth"
)

type Message struct {
	ID         int    `json:"id"`
	SenderID   int    `json:"senderId"`
	ReceiverID int    `json:"receiverId"`
	Content    string `json:"content"`
	CreatedAt  string `json:"createdAt"`
}

func SavePrivateMessage(sender, receiver int, content string) {
	db.DB.Exec("INSERT INTO messages(sender_id, receiver_id, content) VALUES(?,?,?)", sender, receiver, content)
}

func GetMessageHistory(w http.ResponseWriter, r *http.Request) {
	userID :=auth.GetCurrentUserID(r)
	if userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	otherID := auth.GetURLParam(r, "messages")
	if otherID == 0 {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	rows, err := db.DB.Query("SELECT id, sender_id, receiver_id, content, created_at FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY created_at LIMIT 10 OFFSET ?",
		userID, otherID, otherID, userID, 0)
	if err != nil {
		log.Println(err)
		http.Error(w, "Failed to fetch messages", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var m Message
		var createdAt time.Time
		if err := rows.Scan(&m.ID, &m.SenderID, &m.ReceiverID, &m.Content, &createdAt); err != nil {
			continue
		}
		m.CreatedAt = createdAt.Format(time.RFC3339)
		messages = append(messages, m)
	}

	writeJSON(w, http.StatusOK, messages)
}
