package models

import( "time"
   "database/sql"
)

type Category struct {
    CategoryID  int    `json:"category_id"`
    Name        string `json:"name"`
    Description string `json:"description"`
}

type Post struct {
    PostID    int       `json:"post_id"`
    UserID    int       `json:"user_id"`
    Title     string    `json:"title"`
    Content   string    `json:"content"`
    ImageURL  string    `json:"image_url"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
    ImgURL      sql.NullString `json:"imgurl,omitempty"`
}
type LikeRequest struct {
	UserID    int    `json:"user_id"`
	PostID    *int   `json:"post_id,omitempty"`
	CommentID *int   `json:"comment_id,omitempty"`
	LikeType  string `json:"like_type"`
}
type Response struct {
	Status  string      `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// Message structure
type PrivateMessage struct {
	ID             int       `json:"id"`
	SenderID       int       `json:"senderId"`
	ReceiverID     int       `json:"receiverId"`
	Content        string    `json:"content"`
	CreatedAt      time.Time `json:"timestamp"`
	Read           bool      `json:"read"`
	SenderUsername string    `json:"senderUsername,omitempty"` // Not a DB column, used for client-side display
}
type UserChatInfo struct { 
    UserID          int       `json:"userId"`
    Username        string    `json:"username"`
    IsOnline        bool      `json:"isOnline"`
    LastMessage     string    `json:"lastMessage"`
    LastMessageTime time.Time `json:"lastMessageTime"`
    UnreadCount     int       `json:"unreadCount"`
}
