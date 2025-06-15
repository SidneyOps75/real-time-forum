package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"real/db"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/logout" {
		
		return
	}
	if r.Method != http.MethodPost {
		
		return
	}

	cookie, err := r.Cookie("session_id")
	if err == nil && cookie.Value != "" {
		_, err = db.DB.Exec(`DELETE FROM sessions WHERE session_id = ?`, cookie.Value)
		if err != nil {
			log.Printf("Error deleting session: %v", err)
		}
	}

	http.SetCookie(w, &http.Cookie{Name: "session_id", Value: "", Expires: time.Now().Add(-time.Hour), Path: "/", HttpOnly: true})
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	// Set content type first
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:8081")
    w.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Method not allowed",
		})
		return
	}

	// Parse as JSON
	var loginData struct {
		Identifier string `json:"identifier"`
		Password   string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&loginData); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Invalid request body",
		})
		return
	}

	// Validate inputs
	if loginData.Identifier == "" || loginData.Password == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"errors": map[string]string{
				"identifier": "Required",
				"password":   "Required",
			},
		})
		return
	}

	
	var (
		userID       int
		username     string
		email        string
		passwordHash string
	)

	err := db.DB.QueryRow(`
        SELECT user_id, username, email, password 
        FROM users 
        WHERE username = ? OR email = ?`,
		loginData.Identifier, loginData.Identifier,
	).Scan(&userID, &username, &email, &passwordHash)
	if err != nil {
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"message": "Invalid credentials",
			})
		} else {
			log.Printf("Database error: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{
				"message": "Internal server error",
			})
		}
		return
	}

	// Compare password hashes
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(loginData.Password)); err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Invalid credentials",
		})
		return
	}
   	// Convert userID to string for session

	// Create new session
	sessionID := uuid.New().String()
	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	// Delete any existing sessions
	if _, err := db.DB.Exec(`DELETE FROM sessions WHERE user_id = ?`, userID); err != nil {
		log.Printf("Error deleting existing sessions: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Internal server error",
		})
		return
	}

	// Insert new session
	if _, err := db.DB.Exec(
		`INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)`,
		sessionID, userID, expiresAt,
	); err != nil {
		log.Printf("Error creating session: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Internal server error",
		})
		return
	}

	// Set cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Expires:  expiresAt,
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})

	// Successful login response
	response := map[string]interface{}{
		"success":       true,
		"authenticated": true,
		"token":         sessionID,
		"user": map[string]string{
			"id":       strconv.Itoa(userID),
			"username": username,
			"email":    email,
		},
	}
	json.NewEncoder(w).Encode(response)
}

func ValidateSessionHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:8081")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid": false,
			"message": "Method not allowed",
		})
		return
	}

	// Get session from cookie
	cookie, err := r.Cookie("session_id")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid": false,
			"message": "No session found",
		})
		return
	}

	// Validate session in database
	var userID int
	var username, email string
	var expiresAt time.Time
	
	err = db.DB.QueryRow(`
		SELECT s.user_id, s.expires_at, u.username, u.email
		FROM sessions s
		JOIN users u ON s.user_id = u.user_id
		WHERE s.session_id = ?
	`, cookie.Value).Scan(&userID, &expiresAt, &username, &email)
	
	if err != nil {
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"valid": false,
				"message": "Invalid session",
			})
		} else {
			log.Printf("Database error during session validation: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"valid": false,
				"message": "Internal server error",
			})
		}
		return
	}

	// Check if session is expired
	if expiresAt.Before(time.Now()) {
		// Delete expired session
		db.DB.Exec(`DELETE FROM sessions WHERE session_id = ?`, cookie.Value)
		
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid": false,
			"message": "Session expired",
		})
		return
	}

	// Session is valid
	response := map[string]interface{}{
		"valid": true,
		"user": map[string]string{
			"id":       strconv.Itoa(userID),
			"username": username,
			"email":    email,
		},
	}
	
	json.NewEncoder(w).Encode(response)
}

