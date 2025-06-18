import { throttle } from './helpers.js';
import { formatDate, escapeHtml } from './helpers.js';

let ws;
let currentUserId = null;
let currentChattingWith = { id: null, username: null };
let messageOffsets = new Map();
let isLoadingMessages = false;
let lastScrollTop = 0; // Track last scroll position to prevent duplicate calls
let isChatVisible = false; // Track chat visibility state
let unreadMessageCount = 0; // Track unread messages

// DOM elements
let userList, messageList, messageForm, messageInput, chatWithName, noChatSelected, activeChatArea;
let messageToggleBtn, unreadBadge, chatContainer;

export function assignChatDomElements() {
    userList = document.getElementById('user-list');
    messageList = document.getElementById('message-list');
    messageForm = document.getElementById('message-form');
    messageInput = document.getElementById('message-input');
    chatWithName = document.getElementById('chat-with-name');
    noChatSelected = document.getElementById('no-chat-selected');
    activeChatArea = document.getElementById('active-chat-area');
    messageToggleBtn = document.getElementById('message-toggle-btn');
    unreadBadge = document.getElementById('unread-count-badge');
    chatContainer = document.getElementById('chat-system-container');
}

export function setupChatEventListeners() {
    if (messageForm) {
        messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const content = messageInput.value.trim();
            if (content && currentChattingWith.id && ws?.readyState === WebSocket.OPEN) {
                const message = {
                    type: "private_message",
                    payload: { recipientId: currentChattingWith.id, content: content }
                };
                ws.send(JSON.stringify(message));
                appendMessage("You", content, new Date().toISOString(), true);
                scrollToBottom(messageList);
                messageInput.value = '';
            }
        });
    }


if (messageList) {
    messageList.addEventListener('scroll', throttle(handleMessageListScroll, 200));
}

    if (userList) {
        userList.addEventListener('click', (e) => {
            const userItem = e.target.closest('.user-list-item');
            if (userItem) {
                const userId = parseInt(userItem.dataset.userId, 10);
                const username = userItem.dataset.userUsername;
                openChatWithUser(userId, username);
            }
        });
    }

    // Message toggle button event listener
    if (messageToggleBtn) {
        messageToggleBtn.addEventListener('click', toggleChatVisibility);
    }

    // Close chat when clicking the close button
    const closeChatBtn = document.getElementById('close-chat-btn');
    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', hideChatInterface);
    }
}

export function initializeChat(userId) {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    if (!userId) {
        console.error("Cannot initialize chat without a user ID.");
        return;
    }
    currentUserId = userId;
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    connectWebSocket(wsUrl);
    fetchAndRenderUsers();
    fetchAndRenderOnlineUsers();

    // Set up periodic refresh for online users (every 30 seconds)
    setInterval(() => {
        fetchAndRenderOnlineUsers();
    }, 30000);
}

function connectWebSocket(url) {
    ws = new WebSocket(url);

    ws.onopen = () => {
        console.log("WebSocket connection established.");
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            if (message.type === 'new_message') {
                handleNewMessage(message.payload);
            } else if (message.type === 'user_status_update') {
                handleUserStatusUpdate(message.payload);
            }
        } catch (error) {
            console.error("Error parsing WebSocket message:", error);
        }
    };

    ws.onclose = (event) => {
        console.log("WebSocket connection closed.", event.code, event.reason);
        if (event.code === 1006 || event.code === 1011) {
            console.log("WebSocket closed due to authentication issues");
            // Trigger session validation
            window.location.reload();
        }
    };

    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        // Check if it's an authentication error
        if (ws.readyState === WebSocket.CLOSED) {
            console.log("WebSocket failed to connect, possibly due to authentication");
        }
    };
}

function handleNewMessage(payload) {
    console.log("Received new message:", payload);
    const isFromCurrentChatPartner = payload.senderId === currentChattingWith.id;
    const isFromSelf = payload.senderId === currentUserId;

    if (isFromCurrentChatPartner && !isFromSelf) {
        // Message from the person we're currently chatting with
        appendMessage(payload.senderUsername, payload.content, payload.timestamp, false);
        scrollToBottom(messageList);

        // If chat is not visible, increment unread count
        if (!isChatVisible) {
            incrementUnreadCount();
        }
    } else if (!isFromSelf) {
        // Message from someone else - show notification
        const userItem = userList?.querySelector(`.user-list-item[data-user-id='${payload.senderId}']`);
        if (userItem) {
            userItem.classList.add('has-new-message');
            const lastMsgPreview = userItem.querySelector('.last-message-preview');
            if (lastMsgPreview) lastMsgPreview.textContent = payload.content;
            
            // Update or add unread count badge
            let unreadBadge = userItem.querySelector('.unread-count');
            if (unreadBadge) {
                const currentCount = parseInt(unreadBadge.textContent) || 0;
                unreadBadge.textContent = currentCount + 1;
            } else {
                // Add unread count badge if it doesn't exist
                const userNameContainer = userItem.querySelector('.user-name-container');
                if (userNameContainer) {
                    const badge = document.createElement('span');
                    badge.className = 'unread-count';
                    badge.textContent = '1';
                    userNameContainer.appendChild(badge);
                } else {
                    // Fallback: create the container structure if it doesn't exist
                    const userInfo = userItem.querySelector('.user-info');
                    const userName = userInfo.querySelector('.user-name');
                    if (userName && userInfo) {
                        const container = document.createElement('div');
                        container.className = 'user-name-container';
                        const badge = document.createElement('span');
                        badge.className = 'unread-count';
                        badge.textContent = '1';
                        
                        userName.parentNode.insertBefore(container, userName);
                        container.appendChild(userName);
                        container.appendChild(badge);
                    }
                }
            }
        }
        
        // Show browser notification if supported
        if (Notification.permission === 'granted') {
            new Notification(`New message from ${payload.senderUsername}`, {
                body: payload.content,
                icon: '/static/images/chat-icon.png'
            });
        }
    }
    
    // Always refresh the user list to update timestamps and unread counts
    fetchAndRenderUsers();
}

function handleUserStatusUpdate(payload) {
    // Update user list status
    fetchAndRenderUsers();

    // Update online users list
    fetchAndRenderOnlineUsers();

    console.log(`User ${payload.username} is now ${payload.isOnline ? 'online' : 'offline'}`);
}

async function fetchAndRenderUsers() {
    if (!userList) return;
    try {
        const response = await fetch('/api/users', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch users');
        const users = await response.json();

        users.sort((a, b) => {
            const timeA = a.lastMessageTimestamp || a.lastMessageTime ? 
                new Date(a.lastMessageTimestamp || a.lastMessageTime).getTime() : 0;
            const timeB = b.lastMessageTimestamp || b.lastMessageTime ? 
                new Date(b.lastMessageTimestamp || b.lastMessageTime).getTime() : 0;
            if (timeA !== timeB) return timeB - timeA;
            return a.username.localeCompare(b.username);
        });

        renderUserList(users);
    } catch (error) {
        console.error("Error fetching users:", error);
    }
}

function renderUserList(users) {
    userList.innerHTML = '';
    users.forEach(user => {
        if (user.userId === currentUserId) return;

        const li = document.createElement('li');
        li.className = 'user-list-item';
        li.dataset.userId = user.userId;
        li.dataset.userUsername = user.username;
        if (currentChattingWith.id === user.userId) {
            li.classList.add('active');
        }

        const statusClass = user.isOnline ? 'online' : 'offline';
        const statusText = user.isOnline ? '🟢 Online' : '⚫ Offline';
        const lastMessageText = user.lastMessageContent || user.lastMessage || 'No messages yet';
        const unreadCount = user.unreadCount || 0;

        // Add unread message indicator if there are unread messages
        if (unreadCount > 0) {
            li.classList.add('has-new-message');
        }

        li.innerHTML = `
            <div class="user-avatar-status ${statusClass}">
                <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
            </div>
            <div class="user-info">
                <div class="user-name-container">
                    <span class="user-name">${user.username}</span>
                <span class="user-status-indicator">${statusText}</span>
                    ${unreadCount > 0 ? `<span class="unread-count">${unreadCount}</span>` : ''}
                </div>
                <p class="last-message-preview">${escapeHtml(lastMessageText)}</p>
            </div>
        `;
        userList.appendChild(li);
    });
}

export async function openChatWithUser(userId, username) {
    if (currentChattingWith.id === userId) return;

    currentChattingWith = { id: userId, username: username };
    messageOffsets.set(userId, 0);
    isLoadingMessages = false;

    chatWithName.textContent = `Chat with ${username}`;
    noChatSelected.style.display = 'none';
    activeChatArea.style.display = 'flex';
    messageList.innerHTML = '<div class="chat-loading">Loading messages...</div>';

    document.querySelectorAll('.user-list-item').forEach(item => {
        item.classList.toggle('active', parseInt(item.dataset.userId) === userId);
        if (parseInt(item.dataset.userId) === userId) {
            item.classList.remove('has-new-message');
            // Remove unread count badge when opening chat
            const unreadBadge = item.querySelector('.unread-count');
            if (unreadBadge) {
                unreadBadge.remove();
            }
        }
    });

    await fetchAndRenderMessages(userId, true);
}

async function fetchAndRenderMessages(userId, isInitialLoad = false) {
    const offset = messageOffsets.get(userId) || 0;

    try {
        const response = await fetch(`/api/messages?with=${userId}&offset=${offset}&limit=10`, { credentials: 'include' });
        if (!response.ok) throw new Error(`Failed to fetch messages (Status: ${response.status})`);
        const messages = await response.json();

        if (isInitialLoad) messageList.innerHTML = '';

        if (messages && messages.length > 0) {
            messages.reverse().forEach(msg => appendMessage(msg.senderUsername, msg.content, msg.timestamp, msg.senderId === currentUserId, true));
            messageOffsets.set(userId, offset + messages.length);
        } else if (isInitialLoad) {
            messageList.innerHTML = `<div class="chat-empty-state">This is the beginning of your conversation with ${currentChattingWith.username}.</div>`;
        }

        if (isInitialLoad) scrollToBottom(messageList);
    } catch (error) {
        console.error("Error fetching messages:", error);
        if(isInitialLoad) messageList.innerHTML = `<div class="chat-error">Could not load messages.</div>`;
    }
}

function handleMessageListScroll() {
    const currentScrollTop = messageList.scrollTop;

    // Only trigger if we're at the very top (within 5px tolerance) and not already loading
    // Also check if scroll position has changed to prevent duplicate calls
    if (currentScrollTop <= 5 && !isLoadingMessages && currentScrollTop !== lastScrollTop) {
        lastScrollTop = currentScrollTop;
        loadMoreMessages();
    } else {
        lastScrollTop = currentScrollTop;
    }
}

async function loadMoreMessages() {
    if (isLoadingMessages) return;
    isLoadingMessages = true;

    showLoadingIndicator();

    const userId = currentChattingWith.id;
    if (!userId) {
        isLoadingMessages = false;
        hideLoadingIndicator();
        return;
    }

    const offset = messageOffsets.get(userId) || 0;
    const scrollHeightBefore = messageList.scrollHeight;

    try {
        // Ensure we request exactly 10 messages
        const response = await fetch(`/api/messages?with=${userId}&offset=${offset}&limit=10`, { credentials: 'include' });
        if (!response.ok) throw new Error(`Failed to load more messages (Status: ${response.status})`);

        const messages = await response.json();

        if (messages && messages.length > 0) {
            console.log(`Loading ${messages.length} more messages (batch of 10)`);

            // Reverse messages to show oldest first when prepending
            messages.reverse().forEach(msg => {
                appendMessage(msg.senderUsername, msg.content, msg.timestamp, msg.senderId === currentUserId, true);
            });

            // Update offset for next batch
            messageOffsets.set(userId, offset + messages.length);

            // Maintain scroll position after adding messages
            const scrollHeightAfter = messageList.scrollHeight;
            messageList.scrollTop = scrollHeightAfter - scrollHeightBefore;

            // If we got less than 10 messages, we've reached the beginning
            if (messages.length < 10) {
                console.log("Reached the beginning of conversation");
                showBeginningIndicator();
            }
        } else {
            console.log("No more messages to load");
            showBeginningIndicator();
        }
    } catch (error) {
        console.error("Error loading more messages:", error);
        showErrorIndicator();
    } finally {
        hideLoadingIndicator();
        isLoadingMessages = false;
    }
}

function appendMessage(sender, content, timestamp, isSentByMe, prepend = false) {
    const messageBubble = document.createElement('div');
    messageBubble.className = `message-bubble ${isSentByMe ? 'sent' : 'received'}`;
    messageBubble.innerHTML = `
        <div class="message-header">${isSentByMe ? 'You' : escapeHtml(sender)}</div>
        <div class="message-content">${escapeHtml(content)}</div>
        <div class="message-timestamp">${formatDate(timestamp)}</div>
    `;
    if (prepend) {
        messageList.insertBefore(messageBubble, messageList.firstChild);
    } else {
        messageList.appendChild(messageBubble);
    }
}

function showLoadingIndicator() {
    if (document.querySelector('.message-loading-indicator')) return;
    const loader = document.createElement('div');
    loader.className = 'message-loading-indicator';
    loader.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading 10 more messages...';
    messageList.prepend(loader);
}

function hideLoadingIndicator() {
    document.querySelector('.message-loading-indicator')?.remove();
}

function showBeginningIndicator() {
    if (document.querySelector('.conversation-beginning-indicator')) return;
    const indicator = document.createElement('div');
    indicator.className = 'conversation-beginning-indicator';
    indicator.innerHTML = '<i class="fas fa-flag"></i> Beginning of conversation';
    messageList.prepend(indicator);

    // Remove after 3 seconds
    setTimeout(() => {
        indicator?.remove();
    }, 3000);
}

function showErrorIndicator() {
    if (document.querySelector('.message-error-indicator')) return;
    const indicator = document.createElement('div');
    indicator.className = 'message-error-indicator';
    indicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed to load messages';
    messageList.prepend(indicator);

    // Remove after 5 seconds
    setTimeout(() => {
        indicator?.remove();
    }, 5000);
}

function scrollToBottom(element) {
    if (element) element.scrollTop = element.scrollHeight;
}

// Chat visibility functions
export function toggleChatVisibility() {
    if (isChatVisible) {
        hideChatInterface();
    } else {
        showChatInterface();
    }
}

export function showChatInterface() {
    if (!chatContainer) return;

    chatContainer.style.display = 'flex';
    // Small delay to ensure display is set before animation
    setTimeout(() => {
        chatContainer.classList.add('visible');
    }, 10);

    isChatVisible = true;

    // Update toggle button state
    if (messageToggleBtn) {
        messageToggleBtn.classList.add('active');
    }

    // Clear unread count when chat is opened
    clearUnreadCount();
}

export function hideChatInterface() {
    if (!chatContainer) return;

    chatContainer.classList.remove('visible');

    // Hide after animation completes
    setTimeout(() => {
        chatContainer.style.display = 'none';
    }, 300);

    isChatVisible = false;

    // Update toggle button state
    if (messageToggleBtn) {
        messageToggleBtn.classList.remove('active');
    }
}

// Unread message functions
function updateUnreadCount(count) {
    unreadMessageCount = count;

    if (unreadBadge) {
        if (count > 0) {
            unreadBadge.textContent = count > 99 ? '99+' : count.toString();
            unreadBadge.style.display = 'flex';
        } else {
            unreadBadge.style.display = 'none';
        }
    }
}

function clearUnreadCount() {
    updateUnreadCount(0);
}

function incrementUnreadCount() {
    updateUnreadCount(unreadMessageCount + 1);
}

// Online users functionality
export async function fetchAndRenderOnlineUsers() {
    const onlineUsersContainer = document.getElementById('online-users');
    if (!onlineUsersContainer) return;

    try {
        const response = await fetch('/api/online-users', { credentials: 'include' });
        if (!response.ok) {
            if (response.status === 401) {
                console.log('Not authenticated, skipping online users fetch');
                return;
            }
            throw new Error('Failed to fetch online users');
        }

        const onlineUsers = await response.json();
        renderOnlineUsersList(onlineUsers, onlineUsersContainer);
    } catch (error) {
        console.error("Error fetching online users:", error);
        onlineUsersContainer.innerHTML = '<p class="error-message">Failed to load online users</p>';
    }
}

function renderOnlineUsersList(users, container) {
    if (!users || users.length === 0) {
        container.innerHTML = '<p class="no-users-message">No users online</p>';
        return;
    }

    const usersList = users.map(user => {
        const timeAgo = getTimeAgo(new Date(user.lastSeen));
        return `
            <div class="online-user-item" data-user-id="${user.userId}" data-username="${user.username}">
                <div class="user-avatar-status online">
                    <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
                </div>
                <div class="user-info">
                    <span class="user-name">${escapeHtml(user.username)}</span>
                    <span class="user-status online-status">🟢 Online ${timeAgo}</span>
                </div>
                <button class="chat-btn" title="Start chat">
                    <i class="fas fa-comment"></i>
                </button>
            </div>
        `;
    }).join('');

    container.innerHTML = usersList;

    // Add click event listeners for starting chats
    container.querySelectorAll('.online-user-item').forEach(item => {
        const chatBtn = item.querySelector('.chat-btn');
        const userId = parseInt(item.dataset.userId);
        const username = item.dataset.username;

        chatBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openChatWithUser(userId, username);
            showChatInterface(); // Use the proper function
        });

        // Also allow clicking the whole item to start chat
        item.addEventListener('click', () => {
            openChatWithUser(userId, username);
            showChatInterface(); // Use the proper function
        });
    });
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
}