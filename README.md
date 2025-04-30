# 🧵 Real-Time Forum Project

Welcome to the **Next-Level Forum**! This project builds upon a previous forum system and introduces **real-time communication**, **private messaging**, and a **modern single-page interface** using **JavaScript** and **WebSockets**.

---

## 🚀 Project Overview

This is a **real-time, single-page web forum** built using:

- **Go (Golang)** for backend, session handling, and WebSockets  
- **SQLite** for persistent data storage  
- **JavaScript** for dynamic frontend behavior and real-time communication  
- **HTML & CSS** for structure and styling  

The project supports:

- 🔐 User registration and login  
- 📝 Post creation and commenting  
- 💬 Private messaging with real-time updates  
- 👀 Live user status (online/offline)  
- 🧩 WebSocket-based architecture for responsiveness  

---

## 📦 Technologies Used

- **Backend**: Golang, Gorilla WebSocket, SQLite, bcrypt  
- **Frontend**: Vanilla JavaScript, HTML, CSS  
- **Database**: SQLite3  
- **Auth**: Sessions + bcrypt password hashing  
- **WebSockets**: Real-time client-server communication  

---

## 🧠 Features

### 🔐 Registration and Login

Users can register and login using:

- Nickname  
- Age  
- Gender  
- First Name & Last Name  
- Email  
- Password  

Other features:

- Login via nickname **or** email + password  
- Session-based access  
- Logout accessible from any view  

---

### 📝 Posts & Comments

Users can:

- Create posts under specific categories  
- View posts in a scrollable feed  
- Expand posts to view/add comments  

---

### 💬 Private Messaging System

A real-time chat feature with:

- **Online/Offline Users List**  
  - Sorted by last message or alphabetically  
  - Always visible on screen  

- **Chat Window**  
  - Load 10 most recent messages on open  
  - Scroll to load 10 more (with debounce/throttle)  
  - Shows username and date for each message  

- **Real-Time Messaging**  
  - Messages are delivered instantly without reloading  

---

## 🔁 Real-Time Updates

Powered by **WebSockets**:

- Instant message delivery  
- Real-time online user tracking  
- Dynamic updates across the UI  

---

## ⚠️ Constraints

To preserve learning objectives:

- ✅ Allowed Go packages:
  - `gorilla/websocket`  
  - `sqlite3`  
  - `bcrypt`  
  - `gofrs/uuid` or `google/uuid`  
  - All standard Go packages  

---

## 🧪 Learning Outcomes

You’ll learn about:

- SPA development using **vanilla JavaScript**
- Web **authentication** and **session handling**
- Backend concurrency with **Go routines** and **channels**
- Real-time features using **WebSockets**
- **SQL** database design and query writing

---

## 🛠️ How to Run

1. Clone the repository
2. Run the Go server:
   ```bash
   go run main.go
