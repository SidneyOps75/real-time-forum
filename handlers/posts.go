package handlers

import (
	"database/sql"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"real/auth"
	"real/db"

	"github.com/google/uuid"
)

func CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	log.Printf("Auth check - userID: %s, ok: %v", userID, ok)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse form with file upload
	if err := r.ParseMultipartForm(20 << 20); err != nil { 
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	// Get form values
	title := strings.TrimSpace(r.FormValue("title"))
	content := strings.TrimSpace(r.FormValue("content"))
	categories := r.Form["category"] // Gets all selected categories

	// Validate inputs
	if title == "" || content == "" {
		http.Error(w, "Title and content are required", http.StatusBadRequest)
		return
	}

	if len(categories) == 0 {
		http.Error(w, "At least one category is required", http.StatusBadRequest)
		return
	}

	// Process image upload if exists
	var imgURL string
	file, header, err := r.FormFile("img")
	if err == nil {
		defer file.Close()
		
		log.Printf("Processing image upload: %s", header.Filename)

		// Validate image
		if !strings.HasSuffix(strings.ToLower(header.Filename), ".jpg") &&
			!strings.HasSuffix(strings.ToLower(header.Filename), ".jpeg") &&
			!strings.HasSuffix(strings.ToLower(header.Filename), ".png") {
			http.Error(w, "Only JPG, JPEG, and PNG images are allowed", http.StatusBadRequest)
			return
		}

		// Create upload directory if not exists
		uploadDir := "static/images/posts"
		if err := os.MkdirAll(uploadDir, 0o755); err != nil {
			log.Printf("Error creating upload directory: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Create unique filename
		uniqueID := uuid.New().String()
		ext := filepath.Ext(header.Filename)
		newFilename := uniqueID + ext
		dstPath := filepath.Join(uploadDir, newFilename)

		log.Printf("Saving file to: %s", dstPath)

		// Save file
		dst, err := os.Create(dstPath)
		if err != nil {
			log.Printf("Error creating file: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			log.Printf("Error saving file: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		
		imgURL = "/static/images/posts/" + newFilename
		
		
		log.Printf("Image URL set to: %s", imgURL)
		
		// Verify file was created
		if _, err := os.Stat(dstPath); os.IsNotExist(err) {
			log.Printf("Warning: File was not created at %s", dstPath)
		} else {
			log.Printf("File successfully created at %s", dstPath)
		}
	} else if err != http.ErrMissingFile {
		log.Printf("Error processing file upload: %v", err)
	}

	// Start database transaction
	tx, err := db.DB.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Insert post
	var result sql.Result
	if imgURL != "" {
		log.Printf("Inserting post with image URL: %s", imgURL)
		result, err = tx.Exec(
			"INSERT INTO posts (user_id, title, content, imgurl) VALUES (?, ?, ?, ?)",
			userID, title, content, imgURL,
		)
	} else {
		log.Printf("Inserting post without image")
		result, err = tx.Exec(
			"INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)",
			userID, title, content,
		)
	}

	if err != nil {
		log.Printf("Error inserting post: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Get post ID
	postID, err := result.LastInsertId()
	if err != nil {
		log.Printf("Error getting post ID: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Insert categories
	for _, catID := range categories {
		_, err = tx.Exec(
			"INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)",
			postID, catID,
		)
		if err != nil {
			log.Printf("Error inserting category: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	log.Printf("Post created successfully with ID: %d, Image URL: %s", postID, imgURL)

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"message":  "Post created successfully",
		"post_id":  postID,
		"image_url": imgURL,
	})
}

func GetCategoriesHandler(w http.ResponseWriter, r *http.Request) {
    categories, err := db.GetAllCategories()
    if err != nil {
        log.Printf("Error fetching categories: %v", err)
        http.Error(w, "Failed to fetch categories", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(categories); err != nil {
        log.Printf("Error encoding categories: %v", err)
        http.Error(w, "Internal server error", http.StatusInternalServerError)
    }
}