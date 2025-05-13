package models

import "time"

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
}
