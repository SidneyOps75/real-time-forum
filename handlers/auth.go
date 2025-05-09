package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"
	
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"real/db"
)

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/login" {
		http.Error(w, "Page not found", http.StatusNotFound)
		return
	}
	
	switch r.Method {
	case http.MethodGet:
		// Instead of parsing a template, redirect to the SPA
		http.Redirect(w, r, "/", http.StatusSeeOther)
		
	case http.MethodPost:
		if err := r.ParseForm(); err != nil {
			http.Error(w, "Bad request", http.StatusBadRequest)
			return
		}
		
		identifier := r.FormValue("identifier")
		password := r.FormValue("password")
		errors := make(map[string]string)
		
		// Validate inputs
		if identifier == "" {
			errors["identifier"] = "Field cannot be empty"
		}
		if password == "" {
			errors["password"] = "Field cannot be empty"
		}
		
		if len(errors) > 0 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			// Use a JSON encoder to return the errors
			json.NewEncoder(w).Encode(errors)
			return
		}
		
		// Check credentials
		var userID int
		var storedHash string
		err := db.DB.QueryRow(
			`SELECT user_id, password FROM users WHERE email = ? OR username = ?`,
			identifier, identifier,
		).Scan(&userID, &storedHash)
		
		if err != nil {
			if err == sql.ErrNoRows {
				errors["password"] = "Invalid username or password"
			} else {
				log.Printf("Database error: %v", err)
				http.Error(w, "Internal server error", http.StatusInternalServerError)
				return
			}
		}
		
		if len(errors) == 0 {
			if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password)); err != nil {
				errors["password"] = "Invalid username or password"
			}
		}
		
		if len(errors) > 0 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			// Use a JSON encoder to return the errors
			json.NewEncoder(w).Encode(errors)
			return
		}
		
		// Create session
		sessionID := uuid.New().String()
		expiration := time.Now().Add(24 * time.Hour)
		
		// Delete any existing sessions
		_, err = db.DB.Exec(`DELETE FROM sessions WHERE user_id = ?`, userID)
		if err != nil {
			log.Printf("Error deleting session: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		
		// Insert new session
		_, err = db.DB.Exec(
			`INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)`,
			sessionID, userID, expiration,
		)
		if err != nil {
			log.Printf("Error creating session: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		
		// Set cookie
		http.SetCookie(w, &http.Cookie{
			Name:     "session_id",
			Value:    sessionID,
			Expires:  expiration,
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteStrictMode,
		})
		
		// Return success response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
		
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}