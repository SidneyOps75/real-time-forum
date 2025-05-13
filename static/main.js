// main.js

document.addEventListener('DOMContentLoaded', function () {
  showPage('home');
  setupNavigation();
  setupForms(); // Call once initially
  updateAuthUI();
});

// Show specified page and hide others
function showPage(pageId) {
  document.querySelectorAll('.page-section').forEach(section => {
      section.classList.remove('active-section');
  });

  const page = document.getElementById(`${pageId}-page`);
  if (page) {
      page.classList.add('active-section');

      // Setup forms only if not initialized
      if (!page.dataset.initialized && ['register', 'login', 'create-post'].includes(pageId)) {
          setupForms();
          page.dataset.initialized = 'true';
      }
  } else {
      console.error(`Page with ID "${pageId}-page" not found!`);
  }

  const filtersSidebar = document.getElementById('filters-sidebar');
  if (filtersSidebar) {
      filtersSidebar.style.display = pageId === 'home' ? 'block' : 'none';
  }

  updateAuthUI();
}

// Set up navigation links
function setupNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', function(e) {
          e.preventDefault();
          const page = this.getAttribute('data-page');
          showPage(page);
      });
  });

  const createPostBtn = document.getElementById('create-post-btn');
  if (createPostBtn) {
      createPostBtn.addEventListener('click', function() {
          showPage('create-post');
      });
  }

  const logoutForm = document.getElementById('logout-form');
  if (logoutForm) {
      logoutForm.addEventListener('submit', function(e) {
          e.preventDefault();
          handleLogout();
      });
  }

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
  const loginForm = document.getElementById('login-form');
  if (loginForm && !loginForm.dataset.listenerAdded) {
      loginForm.addEventListener('submit', function(e) {
          e.preventDefault();
          handleLogin();
      });
      loginForm.dataset.listenerAdded = 'true';
  }

  const registerForm = document.getElementById('register-form');
  if (registerForm && !registerForm.dataset.listenerAdded) {
      registerForm.addEventListener('submit', function(e) {
          e.preventDefault();
          handleRegister();
      });
      registerForm.dataset.listenerAdded = 'true';
  }

  const createPostForm = document.getElementById('create-post-form');
  if (createPostForm && !createPostForm.dataset.listenerAdded) {
      createPostForm.addEventListener('submit', function(e) {
          e.preventDefault();
          handleCreatePost();
      });
      createPostForm.dataset.listenerAdded = 'true';
  }
}

// Update UI based on authentication status
function updateAuthUI() {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  const loginBtn = document.querySelector('#auth-buttons #login-btn');
  const registerBtn = document.querySelector('#auth-buttons #register-btn');
  const logoutForm = document.querySelector('#logout-form');

  if (loginBtn && registerBtn && logoutForm) {
      loginBtn.style.display = isAuthenticated ? 'none' : 'inline-block';
      registerBtn.style.display = isAuthenticated ? 'none' : 'inline-block';
      logoutForm.style.display = isAuthenticated ? 'inline-block' : 'none';
  }

  const authContainer = document.querySelector('.auth-center-container');
  const authenticatedContent = document.getElementById('authenticated-content');
  const chatSidebar = document.getElementById('chat-sidebar');

  if (authContainer && authenticatedContent && chatSidebar) {
      authContainer.style.display = isAuthenticated ? 'none' : 'flex';
      authenticatedContent.style.display = isAuthenticated ? 'block' : 'none';
      chatSidebar.style.display = isAuthenticated ? 'block' : 'none';
  }
}

// Handle login
function handleLogin() {
  const identifier = document.getElementById('identifier').value;
  const password = document.getElementById('password').value;

  document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
  let hasErrors = false;

  if (!identifier) {
      const errorElement = document.getElementById('identifier-error');
      if (errorElement) {
          errorElement.textContent = 'Please enter your username or email';
          hasErrors = true;
      }
  }

  if (!password) {
      const errorElement = document.getElementById('password-error');
      if (errorElement) {
          errorElement.textContent = 'Please enter your password';
          hasErrors = true;
      }
  }

  if (hasErrors) return;

  const formData = new FormData();
  formData.append('identifier', identifier);
  formData.append('password', password);

  fetch('/login', {
      method: 'POST',
      body: formData
  })
  .then(response => {
      if (!response.ok) {
          return response.json().then(errors => {
              for (const [field, message] of Object.entries(errors)) {
                  const errorElement = document.getElementById(`${field}-error`) ||
                                       document.getElementById(`${field === 'password' ? 'password' : field}-error`);
                  if (errorElement) errorElement.textContent = message;
              }
              throw new Error('Login failed');
          });
      }
      return response.json();
  })
  .then(data => {
      if (data.status === 'success') {
          localStorage.setItem('isAuthenticated', 'true');
          updateAuthUI();
          showPage('home');
      }
  })
  .catch(error => {
      console.error('Login error:', error);
  });
}

// Handle registration
function handleRegister() {
  const form = document.getElementById('register-form');
  if (!form) {
      console.error('Register form not found!');
      return;
  }

  const formData = new FormData(form);

  document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
  let hasErrors = false;

  const requiredFields = [
      'username', 'email', 'password', 'confirmpassword',
      'firstname', 'lastname', 'age', 'gender'
  ];

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

  if (hasErrors) return;

  fetch('/register', {
    method: 'POST',
    body: formData
  })
  .then(response => {
    console.log('Response status:', response.status);
    if (!response.headers.get('content-type')?.includes('application/json')) {
      // If not JSON, read as text and log it
      return response.text().then(text => {
        console.error('Non-JSON response received:', text);
        alert('Server returned an unexpected response. Check the console.');
        throw new Error('Non-JSON response from server');
      });
    }
  
    if (!response.ok) {
      return response.json().then(errors => {
        for (const [field, message] of Object.entries(errors)) {
          const errorElement = document.getElementById(`${field}-error`) ||
                               document.getElementById(`${field === 'password' ? 'reg-password' : field}-error`);
          if (errorElement) errorElement.textContent = message;
        }
        throw new Error('Registration failed');
      });
    }
  
    return response.json();
  })
  .then(data => {
    if (data.status === 'success') {
      localStorage.setItem('isAuthenticated', 'true');
      updateAuthUI();
      showPage('home');
      alert('Registration successful!');
    }
  })
  .catch(error => {
    console.error('Registration error:', error);
  });
}

// Handle creating a post
function handleCreatePost() {
  const formData = new FormData(document.getElementById('create-post-form'));

  if (!formData.get('title') || !formData.get('content')) {
      alert('Please fill in all required fields');
      return;
  }

  console.log('New post data:', Object.fromEntries(formData));
  showPage('home');
}

// Handle logout
function handleLogout() {
  console.log('User logged out');
  localStorage.removeItem('isAuthenticated');
  updateAuthUI();
  showPage('home');
}