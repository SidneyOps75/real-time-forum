#!/bin/bash

# Database management script for Real-Time Forum

DB_FILE="forum.db"
SCHEMA_FILE="db/schema.sql"
INIT_SCRIPT="scripts/init_db.go"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to show help
show_help() {
    echo -e "${BLUE}Real-Time Forum Database Management${NC}"
    echo ""
    echo "Usage: ./scripts/db.sh [command]"
    echo ""
    echo "Commands:"
    echo "  init     - Initialize database (only if it doesn't exist)"
    echo "  reset    - Reset database (removes existing and creates new)"
    echo "  status   - Check database status"
    echo "  backup   - Create a backup of the current database"
    echo "  clean    - Remove database and backup files"
    echo "  help     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./scripts/db.sh init     # Initialize database for first time"
    echo "  ./scripts/db.sh reset    # Reset database (WARNING: deletes all data)"
    echo "  ./scripts/db.sh status   # Check if database exists"
    echo "  ./scripts/db.sh backup   # Create backup before making changes"
}

# Function to check database status
check_status() {
    if [ -f "$DB_FILE" ]; then
        size=$(du -h "$DB_FILE" | cut -f1)
        print_status "Database exists: $DB_FILE ($size)"
        
        # Check if we can connect to it
        if sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table';" > /dev/null 2>&1; then
            table_count=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
            print_info "Database is accessible with $table_count tables"
        else
            print_error "Database exists but may be corrupted"
        fi
    else
        print_warning "Database does not exist: $DB_FILE"
        print_info "Run './scripts/db.sh init' to create it"
    fi
}

# Function to initialize database
init_database() {
    if [ -f "$DB_FILE" ]; then
        print_warning "Database already exists: $DB_FILE"
        print_info "Use 'reset' command to recreate it"
        return 1
    fi
    
    print_info "Initializing database..."
    go run "$INIT_SCRIPT"
}

# Function to reset database
reset_database() {
    print_warning "This will DELETE ALL DATA in the database!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Resetting database..."
        go run "$INIT_SCRIPT" reset
    else
        print_info "Database reset cancelled"
    fi
}

# Function to backup database
backup_database() {
    if [ ! -f "$DB_FILE" ]; then
        print_error "No database to backup: $DB_FILE"
        return 1
    fi
    
    timestamp=$(date +"%Y%m%d_%H%M%S")
    backup_file="${DB_FILE}.backup_${timestamp}"
    
    cp "$DB_FILE" "$backup_file"
    print_status "Database backed up to: $backup_file"
}

# Function to clean all database files
clean_database() {
    print_warning "This will remove ALL database and backup files!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f *.db *.db.backup_*
        print_status "All database files removed"
    else
        print_info "Clean operation cancelled"
    fi
}

# Main script logic
case "${1:-help}" in
    "init")
        init_database
        ;;
    "reset")
        reset_database
        ;;
    "status")
        check_status
        ;;
    "backup")
        backup_database
        ;;
    "clean")
        clean_database
        ;;
    "help"|*)
        show_help
        ;;
esac
