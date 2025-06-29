
package websocket

import (
	"encoding/json"
	"log"
	"real/db"
	"real/models"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	Send   chan []byte
	UserID int
}

// Hub maintains the set of active clients and broadcasts messages.
type Hub struct {
	Clients    map[int]*Client
	Broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
	mu         sync.Mutex
}
type WebSocketMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}
type PrivateMessagePayload struct {
	RecipientID int    `json:"recipientId"`
	Content     string `json:"content"`
}
type NewMessageNotification struct {
	SenderID       int    `json:"senderId"`
	ReceiverID     int    `json:"receiverId"`
	SenderUsername string `json:"senderUsername"`
	Content        string `json:"content"`
	Timestamp      string `json:"timestamp"`
}

func NewHub() *Hub {
	return &Hub{
		Broadcast:  make(chan []byte),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Clients:    make(map[int]*Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.Clients[client.UserID] = client
			h.mu.Unlock()
			db.UpdateUserStatus(client.UserID, true)
			

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Clients[client.UserID]; ok {
				delete(h.Clients, client.UserID)
				close(client.Send)
				db.UpdateUserStatus(client.UserID, false)
				
			}
			h.mu.Unlock()

		case message := <-h.Broadcast:
			h.mu.Lock()
			for _, client := range h.Clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.Clients, client.UserID)
				}
			}
			h.mu.Unlock()
		}
	}
}





func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()
	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		var msg WebSocketMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("error unmarshalling message: %v", err)
			continue
		}

		if msg.Type == "private_message" {
			var pmp PrivateMessagePayload
			if err := json.Unmarshal(msg.Payload, &pmp); err != nil {
				log.Printf("error unmarshalling private message payload: %v", err)
				continue
			}

			
			senderUsername, err := db.GetUsernameByID(c.UserID)
			if err != nil {
				log.Printf("Error getting sender's username: %v", err)
				continue
			}

			// 2. Save message to DB
			dbMessage := models.PrivateMessage{SenderID: c.UserID, ReceiverID: pmp.RecipientID, Content: pmp.Content}
			savedMessage, err := db.SaveMessage(dbMessage)
			if err != nil {
				log.Printf("Error saving message to DB: %v", err)
				continue
			}

			// 3. Prepare notification for clients
			notification := NewMessageNotification{
				SenderID:       savedMessage.SenderID,
				ReceiverID:     savedMessage.ReceiverID,
				SenderUsername: senderUsername,
				Content:        savedMessage.Content,
				Timestamp:      savedMessage.CreatedAt.UTC().Format(time.RFC3339),
			}
			payloadBytes, _ := json.Marshal(notification)
			finalMsg := WebSocketMessage{Type: "new_message", Payload: payloadBytes}
			finalMsgBytes, _ := json.Marshal(finalMsg)

			// 4. Send to recipient if they are online
			c.Hub.mu.Lock()
			if recipientClient, ok := c.Hub.Clients[pmp.RecipientID]; ok {
				select {
				case recipientClient.Send <- finalMsgBytes:
					
				default:
					close(recipientClient.Send)
					delete(c.Hub.Clients, recipientClient.UserID)
					
				}
			
			c.Hub.mu.Unlock()

			// 5. Send confirmation back to the sender
			select {
			case c.Send <- finalMsgBytes:
				
			default:
				
			}
		}
	}
}
}

func (c *Client) WritePump() {
	defer c.Conn.Close()
	for message := range c.Send {
		if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Printf("error writing message: %v", err)
			return
		}
	}
}