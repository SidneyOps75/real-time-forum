package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"time"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"real/db"
)

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/register" {
		http.Error(w, "Page not found", http.StatusNotFound)
		return
	}

	switch r.Method {
	case http.MethodGet:
		// Redirect to the SPA
		http.Redirect(w, r, "/", http.StatusSeeOther)

	case http.MethodPost:
		if err := r.ParseForm(); err != nil {
			http.Error(w, "Bad request", http.StatusBadRequest)
			return
		}

		// Extract form values
		nickname := r.FormValue("nickname")
		ageStr := r.FormValue("age")
		gender := r.FormValue("gender")
		firstName := r.FormValue("firstName")
		lastName := r.FormValue("lastName")
		email := r.FormValue("email")
		password := r.FormValue("password")
		confirmPassword := r.FormValue("confirmPassword")

		// Validate inputs
		errors := validateRegistrationInput(nickname, ageStr, gender, firstName, lastName, email, password, confirmPassword)
		
		if len(errors) > 0 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(errors)
			return
		}

		// Convert age to int
		age, _ := strconv.Atoi(ageStr)

		// Check if nickname or email already exists
		var count int
		err := db.DB.QueryRow(`SELECT COUNT(*) FROM users WHERE username = ? OR email = ?`, nickname, email).Scan(&count)
		if err != nil {
			log.Printf("Database error checking existing user: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		if count > 0 {
			// Check which one exists
			var emailExists, usernameExists bool
			db.DB.QueryRow(`SELECT COUNT(*) FROM users WHERE email = ?`, email).Scan(&count)
			if count > 0 {
				emailExists = true
				errors["email"] = "Email already in use"
			}

			db.DB.QueryRow(`SELECT COUNT(*) FROM users WHERE username = ?`, nickname).Scan(&count)
			if count > 0 {
				usernameExists = true
				errors["nickname"] = "Username already taken"
			}

			if emailExists || usernameExists {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(errors)
				return
			}
		}

		// Hash password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("Error hashing password: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Insert new user
		var userID int64
		result, err := db.DB.Exec(
			`INSERT INTO users (username, age, gender, first_name, last_name, email, password, created_at) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			nickname, age, gender, firstName, lastName, email, string(hashedPassword), time.Now(),
		)
		if err != nil {
			log.Printf("Database error creating user: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		userID, err = result.LastInsertId()
		if err != nil {
			log.Printf("Error getting last insert ID: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Create session
		sessionID := uuid.New().String()
		expiration := time.Now().Add(24 * time.Hour)

		_, err = db.DB.Exec(
			`INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)`,
			sessionID, userID, expiration,
		)
		if err != nil {
			log.Printf("Error creating session: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Set cookie
		http.SetCookie(w, &http.Cookie{
			Name:     "session_id",
			Value:    sessionID,
			Expires:  expiration,
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteStrictMode,
		})

		// Return success response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func validateRegistrationInput(nickname, ageStr, gender, firstName, lastName, email, password, confirmPassword string) map[string]string {
	errors := make(map[string]string)

	// Validate nickname
	if nickname == "" {
		errors["nickname"] = "Username cannot be empty"
	} else if len(nickname) < 3 {
		errors["nickname"] = "Username must be at least 3 characters"
	}

	// Validate age
	if ageStr == "" {
		errors["age"] = "Age cannot be empty"
	} else {
		age, err := strconv.Atoi(ageStr)
		if err != nil {
			errors["age"] = "Age must be a number"
		} else if age < 13 {
			errors["age"] = "You must be at least 13 years old"
		} else if age > 120 {
			errors["age"] = "Please enter a valid age"
		}
	}

	// Validate gender
	if gender == "" {
		errors["gender"] = "Gender cannot be empty"
	}

	// Validate first name
	if firstName == "" {
		errors["firstName"] = "First name cannot be empty"
	}

	// Validate last name
	if lastName == "" {
		errors["lastName"] = "Last name cannot be empty"
	}

	// Validate email
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	if email == "" {
		errors["email"] = "Email cannot be empty"
	} else if !emailRegex.MatchString(email) {
		errors["email"] = "Please enter a valid email address"
	}

	// Validate password
	if password == "" {
		errors["password"] = "Password cannot be empty"
	} else if len(password) < 6 {
		errors["password"] = "Password must be at least 6 characters"
	}

	// Validate password confirmation
	if confirmPassword == "" {
		errors["confirmPassword"] = "Please confirm your password"
	} else if password != confirmPassword {
		errors["confirmPassword"] = "Passwords do not match"
	}

	return errors
}