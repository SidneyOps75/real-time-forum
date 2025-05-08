// main.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the app with the home page
    showPage('home');
    
    // Set up navigation event listeners
    setupNavigation();
    
    // Set up form submissions
    setupForms();
});

// Show the specified page and hide others
function showPage(pageId) {
    // Hide all page sections
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active-section');
    });
    
    // Show the requested page
    const page = document.getElementById(`${pageId}-page`);
    if (page) {
        page.classList.add('active-section');
    }
    
    // Update UI based on authentication status
    updateAuthUI();
}

// Set up navigation links
function setupNavigation() {
    // Handle navigation link clicks
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            showPage(page);
        });
    });
    
    // Create Post button
    const createPostBtn = document.getElementById('create-post-btn');
    if (createPostBtn) {
        createPostBtn.addEventListener('click', function() {
            showPage('create-post');
        });
    }
    
    // Logout form
    const logoutForm = document.getElementById('logout-form');
    if (logoutForm) {
        logoutForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogout();
        });
    }
}

// Set up form submissions
function setupForms() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }
    
    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleRegister();
        });
    }
    
    // Create Post form
    const createPostForm = document.getElementById('create-post-form');
    if (createPostForm) {
        createPostForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleCreatePost();
        });
    }
}

// Update UI based on authentication status
function updateAuthUI() {
    // This would be set after successful login
    const isAuthenticated = false; // Replace with actual auth check
    
    if (isAuthenticated) {
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('register-btn').style.display = 'none';
        document.getElementById('logout-form').style.display = 'block';
        document.getElementById('chat-sidebar').style.display = 'block';
    } else {
        document.getElementById('login-btn').style.display = 'block';
        document.getElementById('register-btn').style.display = 'block';
        document.getElementById('logout-form').style.display = 'none';
        document.getElementById('chat-sidebar').style.display = 'none';
    }
}

// Form handlers (these would be connected to your backend)
function handleLogin() {
    const identifier = document.getElementById('identifier').value;
    const password = document.getElementById('password').value;
    
    // Here you would make an AJAX call to your backend
    console.log('Login attempt with:', identifier, password);
    
    // Simulate successful login
    // In a real app, this would be in the success callback of your AJAX request
    localStorage.setItem('isAuthenticated', 'true');
    updateAuthUI();
    showPage('home');
}

function handleRegister() {
    const formData = new FormData(document.getElementById('register-form'));
    
    // Here you would make an AJAX call to your backend
    console.log('Registration data:', Object.fromEntries(formData));
    
    // Simulate successful registration
    localStorage.setItem('isAuthenticated', 'true');
    updateAuthUI();
    showPage('home');
}

function handleCreatePost() {
    const formData = new FormData(document.getElementById('create-post-form'));
    
    // Here you would make an AJAX call to your backend
    console.log('New post data:', Object.fromEntries(formData));
    
    // Return to home page after creation
    showPage('home');
}

function handleLogout() {
    // Here you would make an AJAX call to your backend
    console.log('User logged out');
    
    localStorage.removeItem('isAuthenticated');
    updateAuthUI();
    showPage('home');
}