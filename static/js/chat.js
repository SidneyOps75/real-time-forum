import { throttle } from './helpers.js';
import { formatDate, escapeHtml } from './helpers.js';

let ws;
let currentUserId = null;
let currentChattingWith = { id: null, username: null };
let messageOffsets = new Map();
let isLoadingMessages = false;

// DOM elements
let userList, messageList, messageForm, messageInput, chatWithName, noChatSelected, activeChatArea;

export function assignChatDomElements() {
    userList = document.getElementById('user-list');
    messageList = document.getElementById('message-list');
    messageForm = document.getElementById('message-form');
    messageInput = document.getElementById('message-input');
    chatWithName = document.getElementById('chat-with-name');
    noChatSelected = document.getElementById('no-chat-selected');
    activeChatArea = document.getElementById('active-chat-area');
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
}

export function initializeChat(userId) {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    if (!userId) {
        console.error("Cannot initialize chat without a user ID.");
        return;
    }
    currentUserId = userId;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    connectWebSocket(wsUrl);
    fetchAndRenderUsers();
}

function connectWebSocket(url) {
    ws = new WebSocket(url);
    ws.onopen = () => console.log("WebSocket connection established.");
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'new_message') {
            handleNewMessage(message.payload);
        }
    };
    ws.onclose = () => console.log("WebSocket connection closed.");
    ws.onerror = (error) => console.error("WebSocket error:", error);
}

function handleNewMessage(payload) {
    const isFromCurrentChatPartner = payload.senderId === currentChattingWith.id;

    if (isFromCurrentChatPartner) {
        appendMessage(payload.senderUsername, payload.content, payload.timestamp, false);
        scrollToBottom(messageList);
    } else {
        const userItem = userList?.querySelector(`.user-list-item[data-user-id='${payload.senderId}']`);
        if (userItem) {
            userItem.classList.add('has-new-message');
            const lastMsgPreview = userItem.querySelector('.last-message-preview');
            if (lastMsgPreview) lastMsgPreview.textContent = payload.content;
        }
    }
    fetchAndRenderUsers();
}

async function fetchAndRenderUsers() {
    if (!userList) return;
    try {
        const response = await fetch('/api/users', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch users');
        const users = await response.json();
        
        users.sort((a, b) => {
            const timeA = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
            const timeB = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;
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
        const lastMessageText = user.lastMessageContent || 'No messages yet';

        li.innerHTML = `
            <div class="user-avatar-status ${statusClass}">
                <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
            </div>
            <div class="user-info">
                <span class="user-name">${user.username}</span>
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
    if (messageList.scrollTop === 0 && !isLoadingMessages) {
        loadMoreMessages();
    }
}

async function loadMoreMessages() {
    if (isLoadingMessages) return;
    isLoadingMessages = true;
    
    showLoadingIndicator();

    const userId = currentChattingWith.id;
    if (!userId) {
        isLoadingMessages = false;
        return;
    }

    const offset = messageOffsets.get(userId) || 0;
    const scrollHeightBefore = messageList.scrollHeight;
    
    try {
        const response = await fetch(`/api/messages?with=${userId}&offset=${offset}&limit=10`, { credentials: 'include' });
        if (!response.ok) throw new Error(`Failed to load more messages (Status: ${response.status})`);
        
        const messages = await response.json();
        
        if (messages && messages.length > 0) {
            messages.reverse().forEach(msg => {
                appendMessage(msg.senderUsername, msg.content, msg.timestamp, msg.senderId === currentUserId, true);
            });

            messageOffsets.set(userId, offset + messages.length);
            const scrollHeightAfter = messageList.scrollHeight;
            messageList.scrollTop = scrollHeightAfter - scrollHeightBefore;
        }
    } catch (error) {
        console.error("Error loading more messages:", error);
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
    loader.textContent = 'Loading older messages...';
    messageList.prepend(loader);
}

function hideLoadingIndicator() {
    document.querySelector('.message-loading-indicator')?.remove();
}

function scrollToBottom(element) {
    if (element) element.scrollTop = element.scrollHeight;
}