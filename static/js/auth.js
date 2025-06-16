export function isLoggedIn() {
    return localStorage.getItem('isAuthenticated') === 'true';
}

// Validate session with server
export async function validateSession() {
    try {
        const response = await fetch('/api/validate-session', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.valid) {
                localStorage.setItem('isAuthenticated', 'true');
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                }
                return true;
            }
        }
        
        // Session is invalid, clear local storage
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        return false;
    } catch (error) {
        console.error('Session validation error:', error);
        return false;
    }
}

export function getUserId() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || 0;
}

export async function handleLogin() {
    const identifier = document.getElementById('identifier').value;
    const password = document.getElementById('password').value;
    const submitBtn = document.querySelector('#login-form button[type="submit"]');

    if (!identifier || !password) {
        alert("Please enter both username/email and password.");
        return;
    }

    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password }),
            credentials: 'include'
        });
        
        const { ok, data } = await response.json().then(data => ({ ok: response.ok, data }));
        
        if (!ok) throw new Error(data.message || 'Login failed');

        localStorage.setItem('isAuthenticated', 'true');
        if (data.token) localStorage.setItem('auth_token', data.token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));

        return data.user;
    } catch (error) {
        console.error('Login error:', error);
        const errorElement = document.getElementById('password-error');
        if (errorElement) {
            errorElement.textContent = error.message;
        } else {
            alert(error.message);
        }
        throw error;
    } finally {
        submitBtn.textContent = 'Login';
        submitBtn.disabled = false;
    }
}

export function handleLogout() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
}

export async function handleRegister() {
    const submitBtn = document.querySelector('#register-form button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : 'Create Account';
    
    try {
        const form = document.getElementById('register-form');
        if (!form) {
            console.error('Register form not found!');
            throw new Error('Registration form not found');
        }

        // Update button state
        if (submitBtn) {
            submitBtn.textContent = 'Creating Account...';
            submitBtn.disabled = true;
        }

        const formData = new FormData(form);
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        
        const requiredFields = ['username', 'email', 'password', 'confirmpassword', 'firstname', 'lastname', 'age', 'gender'];
        let hasErrors = false;

        for (const field of requiredFields) {
            const value = formData.get(field);
            if (!value) {
                const errorElement = document.getElementById(`${field}-error`) || 
                                    document.getElementById(`${field === 'password' ? 'reg-password' : field}-error`);
                if (errorElement) {
                    errorElement.textContent = 'This field is required';
                    hasErrors = true;
                }
            }
        }

        const password = formData.get('password');
        const confirmPassword = formData.get('confirmpassword');
        if (password !== confirmPassword) {
            const errorElement = document.getElementById('confirmpassword-error');
            if (errorElement) {
                errorElement.textContent = 'Passwords do not match';
                hasErrors = true;
            }
        }

        if (hasErrors) {
            throw new Error('Please fix the form errors');
        }

        const response = await fetch('/register', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            if (data.errors) {
                for (const [field, message] of Object.entries(data.errors)) {
                    const errorElement = document.getElementById(`${field}-error`);
                    if (errorElement) errorElement.textContent = message;
                }
            }
            throw new Error(data.error || 'Registration failed');
        }

        console.log('Registration successful:', data);
        return data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    } finally {
        // Reset button state
        if (submitBtn) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
}