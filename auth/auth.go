//auth/auth.go
package auth

import (
	"net/http"
	"strconv"
	"strings"
	"real/db"

	"github.com/gorilla/context"
)

// GetCurrentUserID extracts the user ID from the request context
func GetCurrentUserID(r *http.Request) int {
	userID, ok := context.Get(r, "userID").(int)
	if !ok {
		return 0
	}
	return userID
}

// AuthMiddleware verifies the user is authenticated
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract token from cookie or Authorization header
		var token string
		
		// Try cookie first
		cookie, err := r.Cookie("auth_token")
		if err == nil {
			token = cookie.Value
		} else {
			// Try Authorization header
			authHeader := r.Header.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				token = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}
		
		if token == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		
		// Validate token and get user ID
		userID, err := validateToken(token)
		if err != nil || userID == 0 {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		
		// Set user ID in request context
		context.Set(r, "userID", userID)
		
		next(w, r)
	}
}

// validateToken verifies the authentication token and returns the user ID
// This is a simplified example - in a real app, you'd verify JWT or session tokens
func validateToken(token string) (int, error) {
	// Query the database to validate the token
	var userID int
	err := db.DB.QueryRow("SELECT user_id FROM sessions WHERE token = ?", token).Scan(&userID)
	return userID, err
}

// UpdateUserStatus updates the user's online status in the database
func UpdateUserStatus(userID int, isOnline bool) {
	_, err := db.DB.Exec("UPDATE users SET is_online = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?", 
		isOnline, userID)
	if err != nil {
		// Just log the error but don't fail
		// log.Printf("Failed to update user status: %v", err)
	}
}

// GetURLParam extracts a parameter from the URL path
func GetURLParam(r *http.Request, key string) int {
	parts := strings.Split(r.URL.Path, "/")
	for i, part := range parts {
		if part == key && i+1 < len(parts) {
			id, _ := strconv.Atoi(parts[i+1])
			return id
		}
	}
	return 0
}