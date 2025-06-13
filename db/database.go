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
// This is an advanced query to get last message and unread count.
func GetUsersForChat(currentUserID int) ([]models.UserChatInfo, error) {
	query := `
SELECT 
    u.user_id, 
    u.username, 
    COALESCE(us.is_online, 0) as is_online,
    COALESCE(last_msg.content, 'No messages yet') as last_message,
    COALESCE(datetime(last_msg.created_at), datetime(u.created_at)) as last_message_time,
    COALESCE(unread.count, 0) as unread_count
FROM users u
LEFT JOIN user_status us ON u.user_id = us.user_id
LEFT JOIN (
    SELECT content, created_at, 
        CASE
            WHEN sender_id = ? THEN receiver_id
            ELSE sender_id
        END as other_user_id
    FROM private_messages
    WHERE (sender_id = ? OR receiver_id = ?)
    ORDER BY created_at DESC
) AS last_msg ON u.user_id = last_msg.other_user_id
LEFT JOIN (
    SELECT sender_id, COUNT(*) as count
    FROM private_messages
    WHERE receiver_id = ? AND read = 0
    GROUP BY sender_id
) AS unread ON u.user_id = unread.sender_id
WHERE u.user_id != ?
GROUP BY u.user_id
ORDER BY last_message_time DESC;
`
	
    
    rows, err := DB.Query(query, currentUserID, currentUserID, currentUserID, currentUserID, currentUserID)
    if err != nil {
        return nil, fmt.Errorf("query failed: %w", err)
    }
    defer rows.Close()
	

    var users []models.UserChatInfo
    for rows.Next() {
        var user models.UserChatInfo
        var rawLastMessageTime string
if err := rows.Scan(&user.UserID, &user.Username, &user.IsOnline, &user.LastMessage, &rawLastMessageTime, &user.UnreadCount); err != nil {
    return nil, fmt.Errorf("scan failed: %w", err)
}
if rawLastMessageTime == "" {
    user.LastMessageTime = time.Time{} // Set to zero time
} else {
    parsedTime, err := time.Parse("2006-01-02 15:04:05", rawLastMessageTime)
    if err != nil {
        log.Printf("Error parsing last_message_time: %v", err)
        user.LastMessageTime = time.Time{} // Fallback to zero time
    } else {
        user.LastMessageTime = parsedTime
    }
}

// Parse the string into a time.Time value
parsedTime, err := time.Parse("2006-01-02 15:04:05", rawLastMessageTime)
if err != nil {
    return nil, fmt.Errorf("failed to parse last_message_time: %v", err)
}
user.LastMessageTime = parsedTime
        users = append(users, user)
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