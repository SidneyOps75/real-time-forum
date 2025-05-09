package auth

import (
	"net/http"

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
