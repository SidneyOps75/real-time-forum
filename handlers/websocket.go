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
}

var clients = make(map[int]*Client)
var clientsMutex sync.Mutex

func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println("Upgrade error:", err)
        return
    }

    userID := auth.GetCurrentUserID(r)
    if userID == 0 {
        conn.Close()
        return
    }

    client := &Client{conn: conn, userID: userID}
    registerClient(client)
    auth.UpdateUserStatus(userID, true)

    go func() {
        for {
            var msg struct {
                Type    string `json:"type"`
                To      int    `json:"to"`
                Content string `json:"content"`
            }
            if err := conn.ReadJSON(&msg); err != nil {
                break
            }
            if msg.Type == "message" && msg.To > 0 {
                SavePrivateMessage(userID, msg.To, msg.Content)
                sendToRecipient(userID, msg.To, msg.Content)
            }
        }
    }()

    <-make(chan struct{})
}

func registerClient(c *Client) {
    clientsMutex.Lock()
    clients[c.userID] = c
    clientsMutex.Unlock()
}

func unregisterClient(id int) {
    clientsMutex.Lock()
    delete(clients, id)
    clientsMutex.Unlock()
}

func sendToRecipient(from, to int, content string) {
    clientsMutex.Lock()
    client, ok := clients[to]
    clientsMutex.Unlock()

    if ok {
        msg := map[string]interface{}{
            "type":      "message",
            "from":      from,
            "content":   content,
            "timestamp": time.Now().Format(time.RFC3339),
        }
        if err := client.conn.WriteJSON(msg); err != nil {
            log.Println("Send error:", err)
        }
    }
}