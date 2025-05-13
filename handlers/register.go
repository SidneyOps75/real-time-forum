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
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method allowed", http.StatusMethodNotAllowed)
		return
	}

	err := r.ParseMultipartForm(10 << 20) // Supports FormData
	if err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		log.Println("Form parse error:", err)
		return
	}

	username := r.FormValue("username")
    email := r.FormValue("email")
    password := r.FormValue("password")
    confirmpassword := r.FormValue("confirmpassword") // renamed from confirmPassword
    firstname := r.FormValue("firstname")
    lastname := r.FormValue("lastname")
    ageStr := r.FormValue("age")
    gender := r.FormValue("gender")
 // changed from "confirmPassword"

// Optional: Log received values for debugging
log.Printf("Received registration data: %+v", map[string]string{
	"username":      username,
	"email":         email,
	"password len":  strconv.Itoa(len(password)),
	"confirmpassword len": strconv.Itoa(len(confirmpassword)),
	"firstname":     firstname,
	"lastname":      lastname,
	"age":           ageStr,
	"gender":        gender,
})


	errors := validateRegistrationInput(username, ageStr, gender, firstname, lastname, email, password, confirmpassword)
	if len(errors) > 0 {
		writeJSON(w, http.StatusBadRequest, errors)
		return
	}

	age, _ := strconv.Atoi(ageStr)

	// Check if nickname or email already exists
	log.Println("Checking existing user...")
    var existingUserCount int
   err = db.DB.QueryRow(`SELECT COUNT(*) FROM users WHERE username = ? OR email = ?`, username, email).Scan(&existingUserCount)
   if err != nil {
    log.Printf("Database error checking user existence: %v", err)
    http.Error(w, "Internal server error", http.StatusInternalServerError)
    return
}
	

	// if existingUserCount > 0 {
	// 	// Check specifically which one exists
	// 	var temp int
	// 	db.DB.QueryRow(`SELECT COUNT(*) FROM users WHERE email = ?`, email).Scan(&temp)
	// 	if temp > 0 {
	// 		errors["email"] = "Email already in use"
	// 	}
	// 	db.DB.QueryRow(`SELECT COUNT(*) FROM users WHERE username = ?`, username).Scan(&temp)
	// 	if temp > 0 {
	// 		errors["nickname"] = "Username already taken"
	// 	}
	// 	writeJSON(w, http.StatusBadRequest, errors)
	// 	return
	// }

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Password hashing error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Insert user
	result, err := db.DB.Exec(
		`INSERT INTO users (
			username, email, password, first_name, last_name, age, gender, created_at
		 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		username, email, hashedPassword, firstname, lastname, age, gender, time.Now(),
	)
	if err != nil {
		log.Printf("User insert error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	userID, err := result.LastInsertId()
	if err != nil {
		log.Printf("LastInsertId error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Create session
	sessionID := uuid.New().String()
	expiresAt := time.Now().Add(24 * time.Hour)

	_, err = db.DB.Exec(`INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)`,
		sessionID, userID, expiresAt)
	if err != nil {
		log.Printf("Session creation error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Set cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})

	// Success
	writeJSON(w, http.StatusOK, map[string]string{"status": "success"})
}

// Reusable helper to write JSON responses
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    if err := json.NewEncoder(w).Encode(data); err != nil {
        log.Printf("JSON encode error: %v", err)
        http.Error(w, "Failed to encode response", http.StatusInternalServerError)
    }
}

// Your existing validation function
func validateRegistrationInput(username, ageStr, gender, firstname, lastname, email, password, confirmpassword string) map[string]string {
	errors := make(map[string]string)

	if username == "" {
		errors["username"] = "Username cannot be empty"
	} else if len(username) < 3 {
		errors["username"] = "Username must be at least 3 characters"
	}

	if ageStr == "" {
		errors["age"] = "Age cannot be empty"
	} else {
		age, err := strconv.Atoi(ageStr)
		if err != nil {
			errors["age"] = "Age must be a number"
		} else if age < 13 {
			errors["age"] = "You must be at least 13"
		} else if age > 120 {
			errors["age"] = "Invalid age"
		}
	}

	if gender == "" {
		errors["gender"] = "Gender is required"
	}
	if firstname == "" {
		errors["firstname"] = "First name is required"
	}
	if lastname == "" {
		errors["lastname"] = "Last name is required"
	}

	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	if email == "" {
		errors["email"] = "Email is required"
	} else if !emailRegex.MatchString(email) {
		errors["email"] = "Invalid email format"
	}

	if password == "" {
		errors["password"] = "Password is required"
	} else if len(password) < 6 {
		errors["password"] = "Password must be at least 6 characters"
	}
	if confirmpassword == "" {
		errors["confirmPassword"] = "Please confirm your password"
	} else if confirmpassword != password {
		errors["confirmPassword"] = "Passwords do not match"
	}

	return errors
}
