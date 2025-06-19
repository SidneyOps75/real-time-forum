# Real-Time Forum

A modern, interactive forum application with real-time messaging capabilities.

##  Features

- **User Authentication**: Secure login and registration system
- **Forum Posts**: Create, view, and interact with community posts
- **Categories**: Organize posts by categories
- **Comments**: Discuss topics through threaded comments
- **Reactions**: Like or dislike posts and comments
- **Real-Time Chat**: Private messaging between users with WebSocket support
- **Online Status**: See which users are currently online
- **Responsive Design**: Works on desktop and mobile devices

##  Technology Stack

- **Backend**: Go (Golang)
- **Database**: SQLite
- **Frontend**: HTML, CSS, JavaScript
- **Real-Time Communication**: WebSockets
- **Authentication**: JWT tokens

##  Prerequisites

- Go 1.23 or higher
- Modern web browser

##  Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://learn.zone01kisumu.ke/git/bobaigwa/real-time-forum.git
   cd real-time-forum
   ```

2. **Run the application**:
   ```bash
   go run .
   ```
   
   The server will start at http://localhost:9002 and automatically initialize the database if it doesn't exist.

##  Database Management

The application includes scripts to manage the database:

```bash
# Check database status
./scripts/db.sh status

# Initialize database (if it doesn't exist)
./scripts/db.sh init

# Reset database (WARNING: deletes all data)
./scripts/db.sh reset

# Create a backup
./scripts/db.sh backup

# Clean all database files
./scripts/db.sh clean
```

See [DATABASE_SETUP.md](DATABASE_SETUP.md) for detailed database management instructions.

##  Project Structure

- `/db` - Database schema and connection management
- `/handlers` - HTTP request handlers
- `/models` - Data structures and types
- `/scripts` - Database management scripts
- `/static` - Frontend assets (HTML, CSS, JS)
- `/websocket` - WebSocket implementation for real-time features

##  Usage

1. Register a new account or login
2. Browse existing posts or create your own
3. Comment on posts and like/dislike content
4. Use the chat feature to message other users
5. View who's currently online

##  Security Features

- Password hashing with bcrypt
- Session-based authentication
- Input validation and sanitization
- CSRF protection

##  Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

##  License

[MIT LICENSE](LICENSE)
