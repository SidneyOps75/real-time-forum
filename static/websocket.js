// WebSocket connection
let socket;
let currentChatUserId = null;
let currentUserId = getUserId(); // You need a function to get the current user ID from localStorage or cookies
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    socket = new WebSocket(protocol + window.location.host + '/ws');
    
    socket.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts = 0;
        // Once connected, load online users
        loadOnlineUsers();
    };
    
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);
        
        switch(data.type) {
            case 'message':
                if (data.from === currentChatUserId) {
                    appendMessage(data.from, data.content, data.timestamp);
                } else {
                    // Notify user about new message if not in current chat
                    notifyNewMessage(data.from, data.content);
                }
                break;
                
            case 'user_status':
                updateUserStatus(data.userId, data.isOnline);
                break;
        }
    };
    
    socket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        
        // Only try to reconnect if we haven't reached the maximum number of attempts
        // and if the close wasn't initiated by the server with a specific close code
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && event.code !== 1000) {
            console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
            
            // Exponential backoff for reconnection attempts
            const delay = Math.min(1000 * (2 ** reconnectAttempts), 30000);
            reconnectAttempts++;
            
            setTimeout(connectWebSocket, delay);
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.log('Maximum reconnection attempts reached. Please refresh the page.');
            showReconnectMessage();
        }
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// Initialize WebSocket when logged in
function initializeChat() {
    if (isLoggedIn()) {
        connectWebSocket();
        setupChatUI();
    }
}

// Check if user is logged in by verifying auth token existence
function isLoggedIn() {
    // Check for token in localStorage or cookies
    const token = localStorage.getItem('auth_token') || getCookie('auth_token');
    return !!token;
}

// Get user ID from storage
function getUserId() {
    // Retrieve user ID from localStorage or cookies
    return parseInt(localStorage.getItem('user_id') || '0');
}

// Helper function to get cookie
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Message handling functions
function sendPrivateMessage(toUserId, content) {
    if (!content.trim()) return;
    
    if (socket && socket.readyState === WebSocket.OPEN) {
        const message = {
            type: 'message',
            to: parseInt(toUserId),
            content: content.trim()
        };
        
        socket.send(JSON.stringify(message));
        
        // Optimistically display the message in the UI
        appendMessage(currentUserId, content, new Date().toISOString());
        return true;
    } else {
        console.error('WebSocket not connected');
        showErrorMessage('Connection lost. Trying to reconnect...');
        
        // Try to reconnect if socket is closed
        if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
            connectWebSocket();
        }
        return false;
    }
}

function appendMessage(userId, content, timestamp) {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;
    
    const isCurrentUser = parseInt(userId) === currentUserId;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="username">${getUsername(userId) || 'User ' + userId}</span>
            <span class="timestamp">${formatTimestamp(timestamp)}</span>
        </div>
        <div class="message-content">${escapeHTML(content)}</div>
    `;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// User list functions
function loadOnlineUsers() {
    fetch('/api/users/online', {
        headers: {
            'Authorization': 'Bearer ' + (localStorage.getItem('auth_token') || getCookie('auth_token'))
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch online users');
        }
        return response.json();
    })
    .then(users => {
        const userList = document.getElementById('user-list');
        if (!userList) return;
        
        userList.innerHTML = '';
        
        // Sort users: online first, then by last message time, then alphabetically
        users.sort((a, b) => {
            // Online users come first
            if (a.isOnline !== b.isOnline) {
                return a.isOnline ? -1 : 1;
            }
            
            // Then sort by last message time
            if (a.lastMessage && b.lastMessage) {
                return new Date(b.lastMessage) - new Date(a.lastMessage);
            } else if (a.lastMessage) {
                return -1;
            } else if (b.lastMessage) {
                return 1;
            }
            
            // Finally sort alphabetically
            return a.username.localeCompare(b.username);
        });
        
        // Add users to the list
        users.forEach(user => {
            const userElement = document.createElement('li');
            userElement.className = `user-item ${user.isOnline ? 'online' : 'offline'}`;
            userElement.dataset.userId = user.id;
            userElement.innerHTML = `
                <div class="user-avatar">
                    <div class="status-indicator"></div>
                </div>
                <div class="user-info">
                    <span class="username">${escapeHTML(user.username)}</span>
                    <span class="last-activity">${user.lastMessage ? formatLastSeen(user.lastMessage) : 'No messages yet'}</span>
                </div>
            `;
            userElement.addEventListener('click', () => openChat(user.id, user.username));
            userList.appendChild(userElement);
        });
    })
    .catch(error => {
        console.error('Error loading online users:', error);
        showErrorMessage('Failed to load users. Please try again later.');
    });
}

function updateUserStatus(userId, isOnline) {
    const userElement = document.querySelector(`.user-item[data-user-id="${userId}"]`);
    if (userElement) {
        if (isOnline) {
            userElement.classList.remove('offline');
            userElement.classList.add('online');
        } else {
            userElement.classList.remove('online');
            userElement.classList.add('offline');
        }
        
        // Also update the chat header if we're chatting with this user
        if (currentChatUserId === userId) {
            const statusIndicator = document.querySelector('#chat-header .user-status');
            if (statusIndicator) {
                statusIndicator.textContent = isOnline ? 'Online' : 'Offline';
                statusIndicator.className = `user-status ${isOnline ? 'online' : 'offline'}`;
            }
        }
    }
}

function openChat(userId, username) {
    currentChatUserId = parseInt(userId);
    
    // Update UI to show the selected chat
    const headerEl = document.getElementById('chat-header');
    if (headerEl) {
        const userStatusEl = document.querySelector(`.user-item[data-user-id="${userId}"] .user-item`);
        const isOnline = userStatusEl ? userStatusEl.classList.contains('online') : false;
        
        headerEl.innerHTML = `
            <div class="user-info">
                <div class="user-avatar"></div>
                <div>
                    <h4>${escapeHTML(username || 'User ' + userId)}</h4>
                    <p class="user-status ${isOnline ? 'online' : 'offline'}">${isOnline ? 'Online' : 'Offline'}</p>
                </div>
            </div>
        `;
    }
    
    // Clear and load the message history
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
        chatContainer.innerHTML = '<div class="loading-messages">Loading messages...</div>';
        loadMessageHistory(userId);
    }
    
    // Show the chat container
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) {
        chatWindow.classList.add('active');
    }
    
    // Focus the input field
    const inputField = document.getElementById('message-input');
    if (inputField) {
        inputField.focus();
    }
    
    // In mobile view, show the conversation and hide the user list
    if (window.innerWidth < 768) {
        const userListContainer = document.getElementById('user-list-container');
        if (userListContainer) {
            userListContainer.style.display = 'none';
        }
        
        const chatConversation = document.getElementById('chat-window');
        if (chatConversation) {
            chatConversation.style.display = 'flex';
        }
    }
}

function loadMessageHistory(userId, offset = 0) {
    fetch(`/api/messages/${userId}?offset=${offset}`, {
        headers: {
            'Authorization': 'Bearer ' + (localStorage.getItem('auth_token') || getCookie('auth_token'))
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch messages');
        }
        return response.json();
    })
    .then(messages => {
        const chatContainer = document.getElementById('chat-messages');
        if (!chatContainer) return;
        
        // Clear the container if this is the initial load
        if (offset === 0) {
            chatContainer.innerHTML = '';
            
            // If no messages, show empty state
            if (messages.length === 0) {
                chatContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-comment-dots"></i>
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                `;
                return;
            }
        } else {
            // Remove loading indicator if present
            const loadingEl = chatContainer.querySelector('.loading-earlier');
            if (loadingEl) {
                chatContainer.removeChild(loadingEl);
            }
        }
        
        // Keep track of scroll position for prepending messages
        const scrollHeight = chatContainer.scrollHeight;
        const scrollTop = chatContainer.scrollTop;
        
        // Prepend older messages in reverse order
        if (offset > 0) {
            const fragment = document.createDocumentFragment();
            
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                const messageEl = createMessageElement(msg.SenderID, msg.Content, msg.CreatedAt);
                fragment.appendChild(messageEl);
            }
            
            if (messages.length > 0) {
                chatContainer.prepend(fragment);
                // Maintain scroll position
                chatContainer.scrollTop = chatContainer.scrollHeight - scrollHeight + scrollTop;
            }
        } else {
            // Append messages in normal order for initial load
            messages.forEach(msg => {
                appendMessage(msg.SenderID, msg.Content, msg.CreatedAt);
            });
            
            // Scroll to bottom
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        // Add load more button if there might be more messages
        if (messages.length >= 10) {
            const loadMoreEl = document.createElement('div');
            loadMoreEl.className = 'load-more-messages';
            loadMoreEl.innerHTML = '<button>Load earlier messages</button>';
            loadMoreEl.addEventListener('click', function() {
                this.innerHTML = '<div class="loading-earlier">Loading...</div>';
                loadMessageHistory(userId, offset + messages.length);
            });
            chatContainer.prepend(loadMoreEl);
        }
    })
    .catch(error => {
        console.error('Error loading messages:', error);
        const chatContainer = document.getElementById('chat-messages');
        if (chatContainer) {
            if (offset === 0) {
                chatContainer.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load messages. Please try again.</p>
                    </div>
                `;
            } else {
                const loadingEl = chatContainer.querySelector('.loading-earlier');
                if (loadingEl) {
                    loadingEl.innerHTML = 'Failed to load. <a href="#">Try again</a>';
                    loadingEl.querySelector('a').addEventListener('click', (e) => {
                        e.preventDefault();
                        loadMessageHistory(userId, offset);
                    });
                }
            }
        }
    });
}

// Continue from previous implementation
function createMessageElement(userId, content, timestamp) {
    const isCurrentUser = parseInt(userId) === currentUserId;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="username">${getUsername(userId) || 'User ' + userId}</span>
            <span class="timestamp">${formatTimestamp(timestamp)}</span>
        </div>
        <div class="message-content">${escapeHTML(content)}</div>
    `;
    return messageElement;
}

// Set up chat UI functionality
function setupChatUI() {
    // Send button functionality
    const sendButton = document.getElementById('send-button');
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    // Input field enter key functionality
    const inputField = document.getElementById('message-input');
    if (inputField) {
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Back button for mobile view
    const backButton = document.createElement('button');
    backButton.className = 'back-to-users';
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i>';
    backButton.addEventListener('click', () => {
        const userListContainer = document.getElementById('user-list-container');
        const chatWindow = document.getElementById('chat-window');
        
        if (userListContainer && chatWindow && window.innerWidth < 768) {
            userListContainer.style.display = 'block';
            chatWindow.style.display = 'none';
        }
    });
    
    // Add back button to chat header on mobile
    const chatHeader = document.getElementById('chat-header');
    if (chatHeader && window.innerWidth < 768) {
        chatHeader.prepend(backButton);
    }
    
    // Close chat sidebar button
    const closeButton = document.querySelector('.chat-close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            const chatSidebar = document.getElementById('private-chat-container');
            if (chatSidebar) {
                chatSidebar.classList.remove('active');
            }
        });
    }
    
    // Search functionality
    const searchInput = document.querySelector('.chat-search input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase();
            const userItems = document.querySelectorAll('#user-list .user-item');
            
            userItems.forEach(item => {
                const username = item.querySelector('.username').textContent.toLowerCase();
                if (username.includes(query)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
    
    // Responsive design handler
    window.addEventListener('resize', handleResize);
    handleResize();
}

function handleResize() {
    const userListContainer = document.getElementById('user-list-container');
    const chatWindow = document.getElementById('chat-window');
    const chatHeader = document.getElementById('chat-header');
    
    if (window.innerWidth >= 768) {
        // Desktop view
        if (userListContainer) userListContainer.style.display = 'block';
        if (chatWindow) chatWindow.style.display = 'flex';
        
        // Remove back button if it exists
        const backButton = chatHeader?.querySelector('.back-to-users');
        if (backButton) backButton.remove();
    } else {
        // Mobile view
        if (currentChatUserId) {
            // If in a chat, show only the chat
            if (userListContainer) userListContainer.style.display = 'none';
            if (chatWindow) chatWindow.style.display = 'flex';
        } else {
            // Otherwise show only the user list
            if (userListContainer) userListContainer.style.display = 'block';
            if (chatWindow) chatWindow.style.display = 'none';
        }
        
        // Add back button if it doesn't exist
        if (chatHeader && !chatHeader.querySelector('.back-to-users')) {
            const backButton = document.createElement('button');
            backButton.className = 'back-to-users';
            backButton.innerHTML = '<i class="fas fa-arrow-left"></i>';
            backButton.addEventListener('click', () => {
                if (userListContainer) userListContainer.style.display = 'block';
                if (chatWindow) chatWindow.style.display = 'none';
                currentChatUserId = null;
            });
            chatHeader.prepend(backButton);
        }
    }
}

// Helper function to send a message
function sendMessage() {
    const inputField = document.getElementById('message-input');
    if (!inputField || !currentChatUserId) return;
    
    const message = inputField.value.trim();
    if (message && sendPrivateMessage(currentChatUserId, message)) {
        inputField.value = '';
    }
}

// Show error message in chat
function showErrorMessage(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'system-message error';
    errorEl.textContent = message;
    
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
        chatContainer.appendChild(errorEl);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (errorEl.parentNode === chatContainer) {
                chatContainer.removeChild(errorEl);
            }
        }, 5000);
    }
}

// Show reconnect message when max reconnect attempts reached
function showReconnectMessage() {
    const msgEl = document.createElement('div');
    msgEl.className = 'system-message warning';
    msgEl.innerHTML = 'Connection lost. <a href="#" class="reconnect-link">Click here to reconnect</a>';
    
    msgEl.querySelector('.reconnect-link').addEventListener('click', (e) => {
        e.preventDefault();
        reconnectAttempts = 0;
        connectWebSocket();
        if (msgEl.parentNode) {
            msgEl.parentNode.removeChild(msgEl);
        }
    });
    
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
        chatContainer.appendChild(msgEl);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// Notify user about new message
function notifyNewMessage(fromUserId, content) {
    // Highlight the user in the list
    const userElement = document.querySelector(`.user-item[data-user-id="${fromUserId}"]`);
    if (userElement) {
        userElement.classList.add('new-message');
        
        // Add notification count or update it
        let notificationBadge = userElement.querySelector('.notification-badge');
        if (!notificationBadge) {
            notificationBadge = document.createElement('span');
            notificationBadge.className = 'notification-badge';
            userElement.querySelector('.user-avatar').appendChild(notificationBadge);
        }
        
        const count = parseInt(notificationBadge.textContent || '0');
        notificationBadge.textContent = count + 1;
        
        // Update last message preview
        const lastActivity = userElement.querySelector('.last-activity');
        if (lastActivity) {
            lastActivity.textContent = truncateString(content, 20);
        }
    }
    
    // Browser notification if supported and permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
        const username = getUsername(fromUserId) || 'User ' + fromUserId;
        const notification = new Notification('New message from ' + username, {
            body: truncateString(content, 50),
            icon: '/static/img/icon.png' // Replace with your app icon
        });
        
        notification.onclick = function() {
            window.focus();
            openChat(fromUserId, username);
            this.close();
        };
    }
    
    // Sound notification
    playNotificationSound();
}

// Utility functions
function getUsername(userId) {
    // This would ideally come from a cache or the users list
    const userElement = document.querySelector(`.user-item[data-user-id="${userId}"]`);
    return userElement ? userElement.querySelector('.username').textContent : null;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    
    // If today, show only time
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
               ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Otherwise show full date
    return date.toLocaleDateString() + ' ' + 
           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatLastSeen(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
        return 'Just now';
    } else if (diffMin < 60) {
        return `${diffMin}m ago`;
    } else if (diffHour < 24) {
        return `${diffHour}h ago`;
    } else if (diffDay < 7) {
        return `${diffDay}d ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function truncateString(str, maxLength) {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

function playNotificationSound() {
    const audio = new Audio('/static/sounds/notification.mp3');
    audio.play().catch(err => {
        // Autoplay may be blocked, that's OK
        console.log('Could not play notification sound:', err);
    });
}

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeChat();
    requestNotificationPermission();
});