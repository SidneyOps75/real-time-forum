// handlers/websocket.go
package handlers

import (
	"log"
	"net/http"
	"real/auth"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Client struct {
	conn   *websocket.Conn
	userID int
	send   chan map[string]interface{}
}

var (
	clients       = make(map[int]*Client)
	clientsMutex  sync.Mutex
	broadcast     = make(chan map[string]interface{})
)

// HandleWebSocket upgrades HTTP connection to WebSocket and manages the connection
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	userID := auth.GetCurrentUserID(r)
	if userID == 0 {
		log.Println("WebSocket: Unauthorized connection attempt")
		conn.Close()
		return
	}

	client := &Client{
		conn:   conn,
		userID: userID,
		send:   make(chan map[string]interface{}, 256),
	}

	// Register client
	registerClient(client)
	
	// Update user status to online
	auth.UpdateUserStatus(userID, true)
	
	// Broadcast user status change to all clients
	broadcastUserStatus(userID, true)

	// Start goroutines for reading and writing
	go client.readPump()
	go client.writePump()
}

func (c *Client) readPump() {
	defer func() {
		unregisterClient(c.userID)
		auth.UpdateUserStatus(c.userID, false)
		broadcastUserStatus(c.userID, false)
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512 * 1024) // 512KB max message size
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		var msg struct {
			Type    string `json:"type"`
			To      int    `json:"to"`
			Content string `json:"content"`
		}
		err := c.conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Handle private message
		if msg.Type == "message" && msg.To > 0 && msg.Content != "" {
			SavePrivateMessage(c.userID, msg.To, msg.Content)
			sendToRecipient(c.userID, msg.To, msg.Content)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// Channel closed
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteJSON(message); err != nil {
				log.Println("Write error:", err)
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func registerClient(c *Client) {
	clientsMutex.Lock()
	clients[c.userID] = c
	clientsMutex.Unlock()
	log.Printf("Client registered: User ID %d", c.userID)
}

func unregisterClient(userID int) {
	clientsMutex.Lock()
	if _, ok := clients[userID]; ok {
		delete(clients, userID)
		log.Printf("Client unregistered: User ID %d", userID)
	}
	clientsMutex.Unlock()
}

func sendToRecipient(from, to int, content string) {
	clientsMutex.Lock()
	client, ok := clients[to]
	clientsMutex.Unlock()

	msg := map[string]interface{}{
		"type":      "message",
		"from":      from,
		"content":   content,
		"timestamp": time.Now().Format(time.RFC3339),
	}

	if ok {
		select {
		case client.send <- msg:
			// Message sent to client's channel
		default:
			// Client's buffer is full
			unregisterClient(to)
			auth.UpdateUserStatus(to, false)
		}
	}
}

func broadcastUserStatus(userID int, isOnline bool) {
	status := map[string]interface{}{
		"type":     "user_status",
		"userId":   userID,
		"isOnline": isOnline,
	}

	clientsMutex.Lock()
	for _, client := range clients {
		if client.userID != userID {
			select {
			case client.send <- status:
				// Message sent to client's channel
			default:
				// Client's buffer is full
				go func(id int) {
					unregisterClient(id)
					auth.UpdateUserStatus(id, false)
				}(client.userID)
			}
		}
	}
	clientsMutex.Unlock()
}