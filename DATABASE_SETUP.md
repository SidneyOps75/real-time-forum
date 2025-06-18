# Database Setup Guide

This guide explains how to manage the database for the Real-Time Forum application.

## 🚀 Quick Start

### First Time Setup (After Cloning)

1. **Clone the repository**:
   ```bash
   git clone <your-gitea-repo-url>
   cd real-time-forum
   ```

2. **The database will be automatically initialized** when you run the server:
   ```bash
   go run .
   ```
   
   If the database doesn't exist, the application will automatically create it from the schema file.

### Manual Database Management

You can also manage the database manually using the provided scripts:

#### Using the Shell Script (Recommended)

```bash
# Check database status
./scripts/db.sh status

# Initialize database (only if it doesn't exist)
./scripts/db.sh init

# Reset database (WARNING: deletes all data)
./scripts/db.sh reset

# Create a backup
./scripts/db.sh backup

# Clean all database files
./scripts/db.sh clean

# Show help
./scripts/db.sh help
```

#### Using Go Script Directly

```bash
# Initialize database
go run scripts/init_db.go

# Reset database
go run scripts/init_db.go reset
```

## 📁 Database Files

### Files Tracked in Git
- `db/schema.sql` - Database schema (tracked)
- `scripts/init_db.go` - Database initialization script (tracked)
- `scripts/db.sh` - Database management script (tracked)

### Files NOT Tracked in Git (Excluded by .gitignore)
- `forum.db` - Main database file
- `*.db.backup_*` - Database backup files
- Any other `.db`, `.sqlite`, `.sqlite3` files

## 🔄 Database Reset

### When to Reset the Database

You might want to reset the database when:
- Testing new features
- Clearing all user data
- Fixing database corruption
- Starting fresh development

### How to Reset

**⚠️ WARNING: This will delete ALL data!**

```bash
# Interactive reset (asks for confirmation)
./scripts/db.sh reset

# Or using Go script directly
go run scripts/init_db.go reset
```

## 🔒 Data Protection

### .gitignore Configuration

The `.gitignore` file is configured to exclude:
- All database files (`*.db`, `*.sqlite`, `*.sqlite3`)
- Database backups (`*.db.backup*`)
- User uploaded content
- Log files
- Temporary files

### Backup Before Changes

Always create a backup before making significant changes:

```bash
# Create timestamped backup
./scripts/db.sh backup
```

## 🛠️ Development Workflow

### Recommended Workflow

1. **Start Development**:
   ```bash
   git clone <repo>
   cd real-time-forum
   go run .  # Database auto-initializes
   ```

2. **During Development**:
   ```bash
   # Create backup before testing
   ./scripts/db.sh backup
   
   # Test your changes
   go run .
   
   # Reset if needed
   ./scripts/db.sh reset
   ```

3. **Before Committing**:
   ```bash
   # Check what files are being committed
   git status
   
   # Make sure no .db files are included
   git add .
   git commit -m "Your changes"
   ```

## 📊 Database Schema

The database schema is defined in `db/schema.sql` and includes:

- **users** - User accounts
- **sessions** - User sessions
- **posts** - Forum posts
- **comments** - Post comments
- **likes** - Post and comment likes
- **categories** - Post categories
- **private_messages** - Chat messages
- **user_status** - Online/offline status

## 🔧 Troubleshooting

### Database Not Found Error
If you get a "database not found" error:
```bash
./scripts/db.sh init
```

### Database Corruption
If the database appears corrupted:
```bash
./scripts/db.sh reset
```

### Permission Issues
Make sure the script is executable:
```bash
chmod +x scripts/db.sh
```

### Schema Changes
If you modify `db/schema.sql`, reset the database:
```bash
./scripts/db.sh reset
```

## 🚨 Important Notes

1. **Never commit database files** - They are excluded by .gitignore
2. **Always backup before major changes** - Use `./scripts/db.sh backup`
3. **Database auto-initializes** - No manual setup needed after cloning
4. **Reset removes ALL data** - Be careful with the reset command
5. **Schema changes require reset** - Modify schema.sql then reset database

## 📝 Example Commands

```bash
# Check if database exists
./scripts/db.sh status

# Create a backup before testing
./scripts/db.sh backup

# Reset database for fresh start
./scripts/db.sh reset

# Start the server (auto-initializes if needed)
go run .

# Clean everything and start over
./scripts/db.sh clean
./scripts/db.sh init
```

This setup ensures that:
- ✅ Database files are never committed to Git
- ✅ Fresh clones automatically initialize the database
- ✅ Developers can easily reset/backup the database
- ✅ No manual database setup is required
