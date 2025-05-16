package auth

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"real/db"
)

func GetCurrentUserID(r *http.Request) int {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		return 0 // Not logged in
	}

	var userID int
	err = db.DB.QueryRow(`
        SELECT user_id FROM sessions 
        WHERE session_id = ? AND expires_at > datetime('now')
    `, cookie.Value).Scan(&userID)
	if err != nil {
		return 0 // Session invalid/expired
	}
	return userID
}

func UpdateUserStatus(userID int, isOnline bool) {
	_, err := db.DB.Exec("UPDATE users SET is_online = ? WHERE id = ?", isOnline, userID)
	if err != nil {
		log.Printf("Failed to update user %d status: %v", userID, err)
	}
}

// getURLParam extracts a numeric parameter from the URL path.
func GetURLParam(r *http.Request, paramName string) int {
	// Example: For route "/api/messages/123", we extract "123"
	parts := strings.Split(r.URL.Path, "/")
	for i, part := range parts {
		if part == paramName && i+1 < len(parts) {
			id, err := strconv.Atoi(parts[i+1])
			if err == nil {
				return id
			}
		}
	}
	return 0 // Default if not found or invalid
}
