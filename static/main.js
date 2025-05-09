// main.js
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the app with the home page
  showPage('home');
  
  // Set up navigation event listeners
  setupNavigation();
  
  // Set up form submissions
  setupForms();

  // Check authentication status
  updateAuthUI();
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
  } else {
      console.error(`Page with ID "${pageId}-page" not found!`);
  }
  
  // Special handling for home page to ensure filters are visible
  if (pageId === 'home') {
      document.getElementById('filters-sidebar').style.display = 'block';
  } else {
      document.getElementById('filters-sidebar').style.display = 'none';
  }
  
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

  // Home page auth buttons
  const homeLoginBtn = document.getElementById('home-login-btn');
  if (homeLoginBtn) {
      homeLoginBtn.addEventListener('click', function() {
          showPage('login');
      });
  }
  
  const homeRegisterBtn = document.getElementById('home-register-btn');
  if (homeRegisterBtn) {
      homeRegisterBtn.addEventListener('click', function() {
          showPage('register');
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
  } else {
      console.error("Login form not found!");
  }
  
  // Register form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
      registerForm.addEventListener('submit', function(e) {
          e.preventDefault();
          handleRegister();
      });
  } else {
      console.error("Register form not found!");
  }
  
  // Create Post form
  const createPostForm = document.getElementById('create-post-form');
  if (createPostForm) {
      createPostForm.addEventListener('submit', function(e) {
          e.preventDefault();
          handleCreatePost();
      });
  } else {
      console.error("Create post form not found!");
  }
}

// Update UI based on authentication status
function updateAuthUI() {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  // Update header display
  if (isAuthenticated) {
      document.querySelector('#auth-buttons #login-btn').style.display = 'none';
      document.querySelector('#auth-buttons #register-btn').style.display = 'none';
      document.querySelector('#logout-form').style.display = 'inline-block';
  } else {
      document.querySelector('#auth-buttons #login-btn').style.display = 'inline-block';
      document.querySelector('#auth-buttons #register-btn').style.display = 'inline-block';
      document.querySelector('#logout-form').style.display = 'none';
  }
  
  // Update home page display
  const homePage = document.getElementById('home-page');
  if (homePage) {
      if (isAuthenticated) {
          document.querySelector('.auth-center-container').style.display = 'none';
          document.getElementById('authenticated-content').style.display = 'block';
          document.getElementById('chat-sidebar').style.display = 'block';
      } else {
          document.querySelector('.auth-center-container').style.display = 'flex';
          document.getElementById('authenticated-content').style.display = 'none';
          document.getElementById('chat-sidebar').style.display = 'none';
      }
  }
}

// Form handlers (these would be connected to your backend)
function handleLogin() {
  const identifier = document.getElementById('identifier').value;
  const password = document.getElementById('password').value;
  
  if (!identifier || !password) {
      alert('Please fill in all fields');
      return;
  }
  
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
  const requiredFields = ['username', 'email', 'password', 'confirmpassword', 'firstname', 'lastname', 'age', 'gender'];
  
  // Simple validation
  for (const field of requiredFields) {
      if (!formData.get(field)) {
          alert(`Please fill in the ${field} field`);
          return;
      }
  }
  
  // Password match validation
  if (formData.get('password') !== formData.get('confirmpassword')) {
      alert('Passwords do not match');
      return;
  }
  
  // Here you would make an AJAX call to your backend
  console.log('Registration data:', Object.fromEntries(formData));
  
  // Simulate successful registration
  localStorage.setItem('isAuthenticated', 'true');
  updateAuthUI();
  showPage('home');
}

function handleCreatePost() {
  const formData = new FormData(document.getElementById('create-post-form'));
  
  // Simple validation
  if (!formData.get('title') || !formData.get('content')) {
      alert('Please fill in all required fields');
      return;
  }
  
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