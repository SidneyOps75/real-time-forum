package main

import (
	"database/sql"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

const (
	dbPath     = "forum.db"
	schemaPath = "db/schema.sql"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "reset" {
		resetDatabase()
	} else {
		initializeDatabase()
	}
}

// initializeDatabase creates the database if it doesn't exist
func initializeDatabase() {
	// Check if database already exists
	if _, err := os.Stat(dbPath); err == nil {
		fmt.Printf("✅ Database '%s' already exists. Use 'go run scripts/init_db.go reset' to reset it.\n", dbPath)
		return
	}

	fmt.Printf("🔧 Initializing new database '%s'...\n", dbPath)
	
	// Create database
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatalf("❌ Error creating database: %v", err)
	}
	defer db.Close()

	// Read and execute schema
	if err := executeSchema(db); err != nil {
		log.Fatalf("❌ Error executing schema: %v", err)
	}

	fmt.Printf("✅ Database '%s' initialized successfully!\n", dbPath)
	fmt.Println("🚀 You can now run 'go run .' to start the server.")
}

// resetDatabase removes the existing database and creates a new one
func resetDatabase() {
	fmt.Printf("⚠️  Resetting database '%s'...\n", dbPath)
	
	// Remove existing database
	if _, err := os.Stat(dbPath); err == nil {
		if err := os.Remove(dbPath); err != nil {
			log.Fatalf("❌ Error removing existing database: %v", err)
		}
		fmt.Printf("🗑️  Removed existing database '%s'\n", dbPath)
	}

	// Create new database
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatalf("❌ Error creating new database: %v", err)
	}
	defer db.Close()

	// Read and execute schema
	if err := executeSchema(db); err != nil {
		log.Fatalf("❌ Error executing schema: %v", err)
	}

	fmt.Printf("✅ Database '%s' reset successfully!\n", dbPath)
	fmt.Println("🚀 You can now run 'go run .' to start the server.")
}

// executeSchema reads the schema file and executes it
func executeSchema(db *sql.DB) error {
	// Get absolute path to schema file
	schemaAbsPath, err := filepath.Abs(schemaPath)
	if err != nil {
		return fmt.Errorf("error getting absolute path to schema: %v", err)
	}

	// Check if schema file exists
	if _, err := os.Stat(schemaAbsPath); os.IsNotExist(err) {
		return fmt.Errorf("schema file not found at: %s", schemaAbsPath)
	}

	// Read schema file
	schemaBytes, err := ioutil.ReadFile(schemaAbsPath)
	if err != nil {
		return fmt.Errorf("error reading schema file: %v", err)
	}

	schema := string(schemaBytes)
	fmt.Printf("📄 Executing schema from '%s'...\n", schemaPath)

	// Execute schema
	if _, err := db.Exec(schema); err != nil {
		return fmt.Errorf("error executing schema: %v", err)
	}

	fmt.Println("✅ Schema executed successfully!")
	return nil
}
