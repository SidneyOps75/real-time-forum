// WebSocket connection
let socket;
let currentChatUserId = null;

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    socket = new WebSocket(protocol + window.location.host + '/ws');
    
    socket.onopen = () => {
        console.log('WebSocket connected');
        loadOnlineUsers();
    };
    
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        switch(data.type) {
            case 'message':
                if (data.from === currentChatUserId) {
                    appendMessage(data.from, data.content, data.timestamp);
                }
                break;
            case 'user_status':
                updateUserStatus(data.userId, data.isOnline);
                break;
        }
    };
    
    socket.onclose = () => {
        console.log('WebSocket disconnected');
        setTimeout(connectWebSocket, 5000);
    };
}

// Initialize WebSocket when logged in
if (isLoggedIn()) {
    connectWebSocket();
}

// Message handling functions
function sendPrivateMessage(toUserId, content) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'message',
            to: toUserId,
            content: content
        }));
    }
}

function appendMessage(userId, content, timestamp) {
    const chatContainer = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${userId === currentUserId ? 'sent' : 'received'}`;
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="username">${getUsername(userId)}</span>
            <span class="timestamp">${formatTimestamp(timestamp)}</span>
        </div>
        <div class="message-content">${content}</div>
    `;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// User list functions
function loadOnlineUsers() {
    fetch('/api/users/online')
        .then(response => response.json())
        .then(users => {
            const userList = document.getElementById('user-list');
            userList.innerHTML = '';
            
            users.sort((a, b) => {
                if (a.lastMessage && b.lastMessage) {
                    return new Date(b.lastMessage) - new Date(a.lastMessage);
                }
                return a.username.localeCompare(b.username);
            });
            
            users.forEach(user => {
                const userElement = document.createElement('div');
                userElement.className = `user ${user.isOnline ? 'online' : 'offline'}`;
                userElement.dataset.userId = user.id;
                userElement.innerHTML = `
                    <span class="username">${user.username}</span>
                    <span class="status-indicator"></span>
                `;
                userElement.addEventListener('click', () => openChat(user.id));
                userList.appendChild(userElement);
            });
        });
}

function openChat(userId) {
    currentChatUserId = userId;
    document.getElementById('chat-header').textContent = `Chat with ${getUsername(userId)}`;
    document.getElementById('chat-messages').innerHTML = '';
    loadMessageHistory(userId);
    document.getElementById('chat-container').style.display = 'block';
}

function loadMessageHistory(userId, offset = 0) {
    fetch(`/api/messages/${userId}?offset=${offset}`)
        .then(response => response.json())
        .then(messages => {
            const chatContainer = document.getElementById('chat-messages');
            
            if (offset === 0) {
                chatContainer.innerHTML = '';
            }
            
            messages.forEach(msg => {
                appendMessage(msg.sender_id, msg.content, msg.created_at);
            });
            
            // Setup scroll listener for infinite scroll
            if (offset === 0) {
                chatContainer.addEventListener('scroll', throttle(() => {
                    if (chatContainer.scrollTop === 0) {
                        loadMessageHistory(userId, messages.length);
                    }
                }, 200));
            }
        });
}

// Utility functions
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
}

document.getElementById('send-button').addEventListener('click', () => {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    if (message && currentChatUserId) {
        sendPrivateMessage(currentChatUserId, message);
        appendMessage(currentUserId, message, new Date().toISOString());
        input.value = '';
    }
});

document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('send-button').click();
    }
});