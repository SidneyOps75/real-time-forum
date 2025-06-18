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
    const form = document.getElementById('login-form');
    if (!form) {
        console.error('Login form not found!');
        throw new Error('Login form not found');
    }

    const identifier = form.querySelector('#identifier').value;
    const password = form.querySelector('#password').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!identifier || !password) {
        const errorElement = document.getElementById('identifier-error') || 
                           document.getElementById('password-error');
        if (errorElement) {
            errorElement.textContent = "Please enter both username/email and password.";
        } else {
            alert("Please enter both username/email and password.");
        }
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
        const errorElement = document.getElementById('password-error') || 
                           document.getElementById('identifier-error');
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
    const form = document.getElementById('register-form');
    if (!form) {
        console.error('Register form not found!');
        throw new Error('Registration form not found');
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent || 'Create Account';
    
    try {
        // Update button state
        if (submitBtn) {
            submitBtn.textContent = 'Creating Account...';
            submitBtn.disabled = true;
        }

        // Clear previous errors
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

        // Validate required fields
        const requiredFields = ['username', 'email', 'password', 'confirmpassword', 'firstname', 'lastname', 'age', 'gender'];
        let hasErrors = false;

        for (const field of requiredFields) {
            const input = form.querySelector(`[name="${field}"]`);
            if (!input?.value) {
                const errorElement = form.querySelector(`#${field}-error`) || 
                                    form.querySelector(`#reg-${field}-error`);
                if (errorElement) {
                    errorElement.textContent = 'This field is required';
                    hasErrors = true;
                }
            }
        }

        // Validate password match
        const password = form.querySelector('[name="password"]')?.value;
        const confirmPassword = form.querySelector('[name="confirmpassword"]')?.value;
        if (password && confirmPassword && password !== confirmPassword) {
            const errorElement = form.querySelector('#confirmpassword-error');
            if (errorElement) {
                errorElement.textContent = 'Passwords do not match';
                hasErrors = true;
            }
        }

        if (hasErrors) {
            throw new Error('Please fix the form errors');
        }

        // Prepare form data
        const formData = new FormData(form);
        
        // For debugging - log what's being sent
        console.log('Registration data:', Object.fromEntries(formData.entries()));

        const response = await fetch('/register', {
            method: 'POST',
            body: formData
        });

        // Log raw response for debugging
        console.log('Registration response status:', response.status);
        const responseData = await response.json();
        console.log('Registration response data:', responseData);

        if (!response.ok) {
            // Handle server-side validation errors
            if (responseData.errors) {
                for (const [field, message] of Object.entries(responseData.errors)) {
                    const errorElement = form.querySelector(`#${field}-error`);
                    if (errorElement) {
                        errorElement.textContent = message;
                    } else {
                        console.warn(`No error element found for field: ${field}`);
                    }
                }
            }
            throw new Error(responseData.message || responseData.error || 'Registration failed');
        }

        console.log('Registration successful:', responseData);
        return responseData;
    } catch (error) {
        console.error('Registration error:', error);
        
        // Show a general error message if no specific field errors were shown
        const generalErrorElement = form.querySelector('.general-error-message');
        if (generalErrorElement) {
            generalErrorElement.textContent = error.message;
        } else {
            alert(error.message);
        }
        
        throw error;
    } finally {
        // Reset button state
        if (submitBtn) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
}