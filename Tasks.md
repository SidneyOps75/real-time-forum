# ✅ Forum Project To-Do List

A checklist to help you track your progress through the development of your real-time forum project.

---

## 📁 Project Setup

- ✅ Initialize Go project
- [ ] Create SQLite database and schema
- [ ] Set up file structure (`/static`, `/templates`, `/handlers`, `/db`, etc.)
- [ ] Create main Go server with basic routing
- [ ] Add WebSocket support using Gorilla

---

## 🔐 Registration & Login

- [ ] Create registration form in HTML
- [ ] Implement registration handler (Go)
- [ ] Hash and store passwords using bcrypt
- [ ] Store user data (nickname, email, etc.) in SQLite
- [ ] Create login form
- [ ] Implement login handler (nickname/email + password)
- [ ] Create sessions and cookies for authentication
- [ ] Add logout button (visible on all pages)
- [ ] Validate inputs on both frontend and backend

---

## 📝 Posts & Comments

- [ ] Create post submission form (category, content)
- [ ] Save posts to database
- [ ] Display all posts in a scrollable feed
- [ ] Create comment submission form (shown when post is clicked)
- [ ] Save comments to database
- [ ] Display comments dynamically
- [ ] Handle client-side rendering in JavaScript for SPA behavior

---

## 💬 Private Messaging (Chat)

### User List

- [ ] Fetch list of all users from database
- [ ] Show online/offline status in real time
- [ ] Sort by last message or alphabetically

### Messaging Interface

- [ ] WebSocket connection for real-time communication
- [ ] Create private message UI (with chat bubbles)
- [ ] Save messages with timestamp and sender/receiver info
- [ ] Load last 10 messages initially
- [ ] Load older messages on scroll-up (debounced/throttled)
- [ ] Display message timestamps and usernames
- [ ] Show unread message indicator

---

## 🧩 SPA (Single Page Application) Navigation

- [ ] Display only one HTML file (index.html)
- [ ] Handle all page/content switching in JavaScript
- [ ] Dynamically load/register views (e.g., login, feed, chat)

---

## 🖼️ Styling (CSS)

- [ ] Create consistent UI styling
- [ ] Style forms, buttons, chat window, post feed
- [ ] Style real-time user status indicator
- [ ] Style mobile and desktop responsiveness

---

## 🧪 Testing & Debugging

- [ ] Test registration and login flow
- [ ] Test post creation and feed loading
- [ ] Test comment submission and display
- [ ] Test private messaging in real time
- [ ] Check real-time online/offline status updates
- [ ] Test session handling and logout

---

## 📌 Deployment (Optional)

- [ ] Serve HTML/CSS/JS via Go
- [ ] Set up proper routing and error handling
- [ ] Deploy using a platform (e.g., Render, Fly.io, Railway)

---

## 📓 Documentation

- [ ] Update README with features and setup instructions
- [ ] Document database schema
- [ ] Add usage tips and known issues

---

## 🏁 Final Review

- [ ] Clean up unused code
- [ ] Format Go code (`gofmt`)
- [ ] Minify CSS/JS (optional)
- [ ] Do a final usability test
