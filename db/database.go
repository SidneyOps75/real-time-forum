package db

import (
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"real/models"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func Init(dbPath string) error {
	var err error
	DB, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %v", err)
	}

	if err = createTables(); err != nil {
		return fmt.Errorf("failed to create tables: %v", err)
	}

	if err = createCategories(); err != nil {
		return fmt.Errorf("failed to create categories: %v", err)
	}

	// Start session cleanup scheduler
	go ScheduleSessionCleanup(1*time.Hour, CleanupExpiredSessions)

	return nil
}

func createTables() error {
	sqlFile, err := os.Open("db/schema.sql")
	if err != nil {
		return fmt.Errorf("failed to open schema file: %v", err)
	}
	defer sqlFile.Close()

	sqlBytes, err := io.ReadAll(sqlFile)
	if err != nil {
		return fmt.Errorf("failed to read schema file: %v", err)
	}

	if _, err := DB.Exec(string(sqlBytes)); err != nil {
		return fmt.Errorf("failed to execute schema: %v", err)
	}

	return nil
}

func createCategories() error {
	categories := []struct {
		Name, Description string
	}{
		{"Technology", "Posts related to the latest technology and trends"},
		{"Health", "Discussions about health, fitness, and well-being"},
		{"Education", "Topics about learning and education"},
		{"Entertainment", "Movies, music, games, and all things fun"},
		{"Lifestyle", "Fashion, home decor, and daily living tips"},
		{"Travel", "Exploring the world, sharing travel experiences"},
	}

	for _, c := range categories {
		_, err := DB.Exec(`INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)`, c.Name, c.Description)
		if err != nil {
			return fmt.Errorf("error inserting category '%s': '%v'", c.Name, err)
		}
	}
	return nil
}

func CleanupExpiredSessions() error {
	query := `DELETE FROM sessions WHERE expires_at < ?`
	_, err := DB.Exec(query, time.Now())
	return err
}

func ScheduleSessionCleanup(interval time.Duration, cleanupFunc func() error) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		if err := cleanupFunc(); err != nil {
			log.Printf("error: session cleanup failed: %v", err)
		}
	}
}

func GetUser(userID int) ([]string, error) {
	var username, bio, profilePicture string
	qry := `SELECT username, COALESCE(bio, ""), COALESCE(profile_picture, "")
            FROM users WHERE user_id = ?`
	err := DB.QueryRow(qry, userID).Scan(&username, &bio, &profilePicture)
	if err != nil {
		return nil, err
	}
	return []string{username, bio, profilePicture}, nil
}

func GetAllCategories() ([]models.Category, error) {
	rows, err := DB.Query("SELECT category_id, name FROM categories")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var c models.Category
		if err := rows.Scan(&c.CategoryID, &c.Name); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}

	return categories, nil
}

// GetCurrentUserIDFromSession checks for a valid session cookie and returns the user ID.
func GetCurrentUserIDFromSession(r *http.Request) (int, error) {
    cookie, err := r.Cookie("session_id")
    if err != nil {
        log.Printf("Error retrieving session_token cookie: %v", err)
        return 0, err
    }

	sessionID := cookie.Value

	var userID int
	var expiresAt time.Time
	err = DB.QueryRow("SELECT user_id, expires_at FROM sessions WHERE session_id = ?", sessionID).Scan(&userID, &expiresAt)
	if err != nil {
		log.Printf("Error querying session: %v", err)
		return 0, err
	}

    if expiresAt.Before(time.Now()) {
        log.Printf("Session expired: %v", expiresAt)
        return 0, fmt.Errorf("session expired")
    }

    return userID, nil
	if expiresAt.Before(time.Now()) {
		log.Printf("Session expired: %v", expiresAt)
		return 0, fmt.Errorf("session expired")
	}

	return userID, nil
}

// UpdateUserStatus updates the is_online status in the database.
func UpdateUserStatus(userID int, isOnline bool) {
	_, err := DB.Exec(`
        INSERT INTO user_status (user_id, is_online, last_seen) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET is_online = EXCLUDED.is_online, last_seen = EXCLUDED.last_seen;
    `, userID, isOnline)
	if err != nil {
		log.Printf("Error updating status for user %d: %v", userID, err)
	}
}

// GetOnlineUsers returns a list of currently online users excluding the current user
func GetOnlineUsers(currentUserID int) ([]models.OnlineUser, error) {
	query := `
		SELECT u.user_id, u.username, us.last_seen
		FROM users u
		INNER JOIN user_status us ON u.user_id = us.user_id
		WHERE us.is_online = 1 AND u.user_id != ?
		ORDER BY u.username ASC
	`

	rows, err := DB.Query(query, currentUserID)
	if err != nil {
		return nil, fmt.Errorf("query failed: %w", err)
	}
	defer rows.Close()

	var onlineUsers []models.OnlineUser
	for rows.Next() {
		var user models.OnlineUser
		var lastSeenStr string

		if err := rows.Scan(&user.UserID, &user.Username, &lastSeenStr); err != nil {
			return nil, fmt.Errorf("scan failed: %w", err)
		}

		// Parse last seen time
		if lastSeen, err := time.Parse("2006-01-02 15:04:05", lastSeenStr); err == nil {
			user.LastSeen = lastSeen
		} else {
			// Try RFC3339 format as fallback
			if lastSeen, err := time.Parse(time.RFC3339, lastSeenStr); err == nil {
				user.LastSeen = lastSeen
			} else {
				log.Printf("Error parsing last_seen time: %v", err)
				user.LastSeen = time.Now() // Default to current time
			}
		}

		onlineUsers = append(onlineUsers, user)
	}

	return onlineUsers, nil
}

// GetUsernameByID retrieves a single username from a user ID.
func GetUsernameByID(userID int) (string, error) {
	var username string
	err := DB.QueryRow("SELECT username FROM users WHERE user_id = ?", userID).Scan(&username)
	return username, err
}

// SaveMessage inserts a message into the private_messages table.
func SaveMessage(msg models.PrivateMessage) (models.PrivateMessage, error) {
	res, err := DB.Exec(
		"INSERT INTO private_messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
		msg.SenderID, msg.ReceiverID, msg.Content,
	)
	if err != nil {
		return msg, err
	}
	id, _ := res.LastInsertId()
	// Retrieve the full message to get the server-generated timestamp
	err = DB.QueryRow(`SELECT created_at FROM private_messages WHERE id = ?`, id).Scan(&msg.CreatedAt)
	msg.ID = int(id)
	return msg, err
}

// GetUsersForChat gets all users and their chat info, excluding the current user.

func GetUsersForChat(currentUserID int) ([]models.UserChatInfo, error) {
	// First, get all users with their basic info
	users := []models.UserChatInfo{}
	
	// Get all users except current user
	userRows, err := DB.Query(`
		SELECT u.user_id, u.username, COALESCE(us.is_online, 0) as is_online
		FROM users u
		LEFT JOIN user_status us ON u.user_id = us.user_id
		WHERE u.user_id != ?
		ORDER BY u.username
	`, currentUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get users: %w", err)
	}
	defer userRows.Close()

	for userRows.Next() {
		var user models.UserChatInfo
		if err := userRows.Scan(&user.UserID, &user.Username, &user.IsOnline); err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		
		// Get the latest message between current user and this user
		var lastMessage string
		var lastMessageTime time.Time
		err = DB.QueryRow(`
			SELECT content, created_at
			FROM private_messages
			WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
			ORDER BY created_at DESC
			LIMIT 1
		`, currentUserID, user.UserID, user.UserID, currentUserID).Scan(&lastMessage, &lastMessageTime)
		
		if err != nil && err != sql.ErrNoRows {
			return nil, fmt.Errorf("failed to get last message: %w", err)
		}
		
		if err == sql.ErrNoRows {
			user.LastMessage = "No messages yet"
			user.LastMessageTime = time.Time{}
		} else {
			user.LastMessage = lastMessage
			user.LastMessageTime = lastMessageTime
		}
		
		// Get unread count
		var unreadCount int
		err = DB.QueryRow(`
			SELECT COUNT(*)
			FROM private_messages
			WHERE sender_id = ? AND receiver_id = ? AND read = 0
		`, user.UserID, currentUserID).Scan(&unreadCount)
		
		if err != nil {
			return nil, fmt.Errorf("failed to get unread count: %w", err)
		}
		
		user.UnreadCount = unreadCount
		users = append(users, user)
	}
	
	// Sort by last message time (most recent first)
	for i := 0; i < len(users)-1; i++ {
		for j := i + 1; j < len(users); j++ {
			if users[i].LastMessageTime.Before(users[j].LastMessageTime) {
				users[i], users[j] = users[j], users[i]
			}
		}
	}
	
	return users, nil
}

// GetPrivateMessages retrieves a paginated list of messages between two users.
func GetPrivateMessages(userID1, userID2, limit, offset int) ([]models.PrivateMessage, error) {
	rows, err := DB.Query(`
        SELECT pm.id, pm.sender_id, pm.receiver_id, pm.content, pm.created_at, pm.read, u.username
        FROM private_messages pm
        JOIN users u ON pm.sender_id = u.user_id
        WHERE (pm.sender_id = ? AND pm.receiver_id = ?) OR (pm.sender_id = ? AND pm.receiver_id = ?)
        ORDER BY pm.created_at DESC
        LIMIT ? OFFSET ?
    `, userID1, userID2, userID2, userID1, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []models.PrivateMessage
	for rows.Next() {
		var msg models.PrivateMessage
		if err := rows.Scan(&msg.ID, &msg.SenderID, &msg.ReceiverID, &msg.Content, &msg.CreatedAt, &msg.Read, &msg.SenderUsername); err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}
	// Reverse the slice so oldest messages are first in the chat window
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}
	return messages, nil
}

// MarkMessagesAsRead updates the 'read' status for messages between two users.
func MarkMessagesAsRead(senderID, receiverID int) error {
	query := `UPDATE private_messages SET read = TRUE WHERE sender_id = ? AND receiver_id = ? AND read = FALSE`
	_, err := DB.Exec(query, senderID, receiverID)
	return err
}
