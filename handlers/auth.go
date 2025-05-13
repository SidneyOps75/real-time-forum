package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"real/db"
)



func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/logout" {
		// utils.DisplayError(w, http.StatusNotFound, " page not found")
		return
	}
	if r.Method != http.MethodPost {
		// utils.DisplayError(w, http.StatusMethodNotAllowed, "Method not allowed")
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
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	err := r.ParseMultipartForm(10 << 20) // Needed for FormData
	if err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	identifier := r.FormValue("identifier")
	password := r.FormValue("password")

	log.Printf("identifier: %s, password: %s", identifier, password)

	if identifier == "" || password == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"identifier": "Required",
			"password":   "Required",
		})
		return
	}

	// Simulate success
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
	})
}

// Example login logic — change this according to your DB structure
// 	var userID int
// // 		var storedHash string
// 	var storedPassword string
// 	err = db.DB.QueryRow("SELECT password FROM users WHERE username = ? OR email = ?", identifier, identifier).Scan(&storedPassword)
// 	if err != nil || storedPassword != password {
// 		writeJSONFieldErrors(w, map[string]string{
// 			"identifier": "Invalid login credentials",
// 		})
// 		return
// 	}

// 	// You would normally create a session here...
// 	sessionID := uuid.New().String()
// 	expiration := time.Now().Add(24 * time.Hour)

// 	// Delete any existing sessions
// 	_, err = db.DB.Exec(`DELETE FROM sessions WHERE user_id = ?`, userID)
// 	if err != nil {
// 		log.Printf("Error deleting session: %v", err)
// 		http.Error(w, "Internal server error", http.StatusInternalServerError)
// 		return
// 	}
// 	// Insert new session
// 	_, err = db.DB.Exec(
// 		`INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)`,
// 		sessionID, userID, expiration,
// 	)
// 	if err != nil {
// 		log.Printf("Error creating session: %v", err)
// 		http.Error(w, "Internal server error", http.StatusInternalServerError)
// 		return
// 	}
// 	// Set cookie
// 	http.SetCookie(w, &http.Cookie{
// 		Name:     "session_id",
// 		Value:    sessionID,
// 		Expires:  expiration,
// 		Path:     "/",
// 		HttpOnly: true,
// 		SameSite: http.SameSiteStrictMode,
// 		Secure:   true,
// 	})

// 	// Successful login
// 	json.NewEncoder(w).Encode(map[string]string{
// 		"status": "success",
// 	})
// }

// func writeJSONError(w http.ResponseWriter, status int, message string) {
// 	w.Header().Set("Content-Type", "application/json")
// 	w.WriteHeader(status)
// 	json.NewEncoder(w).Encode(map[string]string{
// 		"error": message,
// 	})
// }

// func writeJSONFieldErrors(w http.ResponseWriter, errors map[string]string) {
// 	w.Header().Set("Content-Type", "application/json")
// 	w.WriteHeader(http.StatusBadRequest)
// 	// json.NewEncoder(w).Encode(errors)
// }
