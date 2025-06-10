

document.addEventListener('DOMContentLoaded', function () {
    showPage('home');
    setupNavigation();
    setupForms(); 
    updateAuthUI();
  //   if (isLoggedIn()) {
  //     initializeChat();
  // }
  });
  function isLoggedIn() {
      return localStorage.getItem('isAuthenticated') === 'true';
  }
  
  // Add getUserId function
  function getUserId() {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id || 0;
  }
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
        if (pageId === 'home') {
          loadPosts();
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
  
      // Clear previous errors
      document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
      
      // Client-side validation
      if (!identifier) {
          document.getElementById('identifier-error').textContent = 'Please enter your username or email';
          return;
      }
  
      if (!password) {
          document.getElementById('password-error').textContent = 'Please enter your password';
          return;
      }
  
      // Show loading state
      const submitBtn = document.querySelector('#login-form button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = 'Logging in...';
      submitBtn.disabled = true;
  
      fetch('/login', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              identifier: identifier,
              password: password
          }),
          credentials: 'include' 
      })
      .then(async response => {
          // Reset button state
          submitBtn.textContent = originalBtnText;
          submitBtn.disabled = false;
  
          const data = await response.json();
          
          if (!response.ok) {
              // Handle validation errors
              if (data.errors) {
                  for (const [field, message] of Object.entries(data.errors)) {
                      const errorElement = document.getElementById(`${field}-error`);
                      if (errorElement) errorElement.textContent = message;
                  }
              }
              throw new Error(data.message || 'Login failed');
          }
  
          return data;
      })
      .then(data => {
          if (data.success && data.authenticated) {
              // Store authentication status and user data
              localStorage.setItem('isAuthenticated', 'true');
              
              // Store the token if provided in response
              if (data.token) {
                  localStorage.setItem('auth_token', data.token);
              }
              
              if (data.user) {
                  localStorage.setItem('user', JSON.stringify(data.user));
              }
              
              updateAuthUI();
              showPage('home');
              
              // Initialize chat after successful login
              initializeChat();
              loadPosts();
          } else {
              throw new Error('Authentication failed');
          }
      })
      .catch(error => {
          console.error('Login error:', error);
          document.getElementById('password-error').textContent = error.message || 'Login failed. Please try again.';
      });
  }
  // Handle registration
  async function handleRegister() {
      console.log('handleRegister called');
  console.trace(); 
      try {
          const form = document.getElementById('register-form');
          if (!form) {
              console.error('Register form not found!');
              return;
          }
  
          //
          const formData = new FormData(form);
  
          
          console.log("Form Data Entries:");
          for (let [key, value] of formData.entries()) {
              console.log(key, value);
          }
  
          // Clear previous errors
          document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
          
          // Validate required fields
          const requiredFields = [
              'username', 'email', 'password', 'confirmpassword',
              'firstname', 'lastname', 'age', 'gender'
          ];
  
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
  
          // Validate password match
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
  
          // Submit to server
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
  
          if (data.success) {
              alert(data.message || 'Registration successful!');
              showPage('login');
          }
      } catch (error) {
          console.error('Registration error:', error);
          // Show generic error to user
          alert('Registration failed. Please try again.');
      }
  }
  // Handle creating a post
  async function loadCategories() {
      try {
          const response = await fetch('/api/categories', {
              credentials: 'include' // Include cookies
          });
          
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
              throw new Error("Response is not JSON");
          }
          
          const categories = await response.json();
          console.log('Loaded categories:', categories); // Debug log
          
          const container = document.getElementById('categories-container');
          if (container) {
              container.innerHTML = categories.map(cat => `
                  <div class="category-option">
                      <input type="checkbox" 
                             id="category-${cat.category_id}" 
                             name="category" 
                             value="${cat.category_id}">
                      <label for="category-${cat.category_id}">
                          ${cat.name}${cat.description ? ` - ${cat.description}` : ''}
                      </label>
                  </div>
              `).join('');
          }
      } catch (error) {
          console.error('Error loading categories:', error);
          const container = document.getElementById('categories-container');
          if (container) {
              container.innerHTML = `
                  <div class="error">
                      Failed to load categories. 
                      <button onclick="loadCategories()">Retry</button>
                  </div>
              `;
          }
      }
  }
  // Enhanced handleCreatePost function
  async function handleCreatePost() {
      // Check authentication more thoroughly
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      const user = JSON.parse(localStorage.getItem('user')  || {});
      
      if (!isAuthenticated || !user.id) {
          alert('Please login to create posts');
          showPage('login');
          return;
      }
      
      const form = document.getElementById('create-post-form');
      if (!form) return;
      
      const formData = new FormData(form);
      const title = formData.get('title');
      const content = formData.get('content');
      const categories = formData.getAll('category');
      
      // Validate inputs
      if (!title || !content) {
          alert('Title and content are required');
          return;
      }
      
      if (categories.length === 0) {
          alert('Please select at least one category');
          return;
      }
      
      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Posting...';
      
      try {
          const response = await fetch('/post/create', {
              method: 'POST',
              body: formData,
              credentials: 'include', // This sends cookies with the request
              headers: {
                 'Authorization': `Bearer ${localStorage.getItem('auth_token')}`, // If using JWT
              }
          });
      
          if (!response.ok) {
              const errorText = await response.text();
              throw new Error(errorText || 'Failed to create post');
          }
      
          const data = await response.json();
          if (data.success) {
              form.reset();
              alert('Post created successfully!');
              showPage('home');
              // Reload posts to show the new one
              loadPosts();
          } else {
              throw new Error(data.message || 'Post creation failed');
          }
      } catch (error) {
          console.error('Post creation error:', error);
          alert(error.message || 'Failed to create post. Please try again.');
      } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
      }
  }
  
  async function loadPosts(filters = {}) {
      try {
          const queryParams = new URLSearchParams();
          if (filters.category) queryParams.append('category', filters.category);
          if (filters.myPostsOnly) queryParams.append('my_posts_only', 'true');
          if (filters.likedPostsOnly) queryParams.append('liked_posts_only', 'true');
          
          const response = await fetch(`/api/posts?${queryParams.toString()}`, {
              credentials: 'include',
              headers: {
                  'Accept': 'application/json'
              }
          });
  
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
  
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
              throw new Error("Response is not JSON");
          }
  
          const posts = await response.json();
          displayPosts(posts);
          
      } catch (error) {
          console.error('Error loading posts:', error);
          const container = document.getElementById('posts-container');
          if (container) {
              container.innerHTML = `
                  <div class="error">
                      Failed to load posts. 
                      <button onclick="loadPosts()">Retry</button>
                  </div>
              `;
          }
      }
  }
  
  // REPLACEMENT for your displayPosts function
  function displayPosts(posts) {
      const container = document.getElementById('posts-container');
      if (!container) return;
  
      if (!posts || posts.length === 0) {
          container.innerHTML = `
              <div class="empty-state">
                  <i class="fas fa-comments"></i>
                  <h3>No posts yet</h3>
                  <p>Be the first to start a discussion!</p>
                  <button onclick="showPage('create-post')" class="primary-btn">Create Post</button>
              </div>
          `;
          return;
      }
  
      container.innerHTML = posts.map(post => `
          <article class="post-card" data-post-id="${post.post_id}">
              <div class="post-header">
                  <!-- ... your existing post header ... -->
                  <div class="post-author">
                      <div class="author-avatar">${post.first_name ? post.first_name[0].toUpperCase() : 'U'}</div>
                      <div class="author-info">
                          <h4>${post.first_name || 'Unknown'} ${post.last_name || 'User'}</h4>
                          <span class="post-time">${formatDate(post.created_at)}</span>
                      </div>
                  </div>
              </div>
              
              <div class="post-content">
                  <!-- ... your existing post content ... -->
                  <h3 class="post-title">${escapeHtml(post.title)}</h3>
                  <p class="post-text">${escapeHtml(post.content)}</p>
              </div>
              
              <div class="post-footer">
                  <div class="post-stats">
                      <!-- ... your existing like/dislike buttons ... -->
                      <button class="action-btn like-btn ${post.user_reaction === 'like' ? 'active' : ''}" 
                              onclick="handleReaction(${post.post_id}, 'like')">
                          <i class="fas fa-thumbs-up"></i>
                          <span class="like-count">${post.likes || 0}</span>
                      </button>
                      <button class="action-btn dislike-btn ${post.user_reaction === 'dislike' ? 'active' : ''}" 
                              onclick="handleReaction(${post.post_id}, 'dislike')">
                          <i class="fas fa-thumbs-down"></i>
                          <span class="dislike-count">${post.dislikes || 0}</span>
                      </button>
                      
                      <!-- This button is correct -->
                      <button class="action-btn comment-btn" onclick="showComments(${post.post_id})">
                          <i class="fas fa-comment"></i>
                          <span>${post.comment_count || 0}</span>
                      </button>
                  </div>
              </div>
              <div class="comment-section-wrapper" id="comments-wrapper-for-post-${post.post_id}" style="display: none;">
                  <div class="comment-list" id="comment-list-for-post-${post.post_id}">
                      <!-- Comments will appear here when loaded -->
                  </div>
                  <form class="comment-form" onsubmit="handleCreateComment(event, ${post.post_id})">
                      <input type="text" name="content" class="comment-input" placeholder="Add a comment..." required>
                      <button type="submit" class="comment-submit-btn">Post</button>
                  </form>
              </div>
          </article>
      `).join('');
  }
  
  
  
  async function handleReaction(postId, reactionType) {
      if (!isLoggedIn()) { 
          alert('Please login to react to posts');
          return;
      }
  
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      // Ensure userId is a number
      const userId = parseInt(user.id, 10);
      
      if (!userId || isNaN(userId)) {
          alert('User information not found. Please log in again.');
          return;
      }
  
      // Ensure postId is a number
      const numericPostId = parseInt(postId, 10);
      if (isNaN(numericPostId)) {
          console.error("Invalid post ID:", postId);
          return;
      }
  
      try {
          const response = await fetch("/like", {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                  user_id: userId,
                  post_id: numericPostId,
                  like_type: reactionType
              })
          });
  
          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to process reaction');
          }
  
          const data = await response.json();
          updatePostReactionsUI(numericPostId, data);
          
      } catch (error) {
          console.error(`Error handling ${reactionType}:`, error);
          alert(error.message || 'An error occurred. Please try again.');
      }
  }
  function updatePostReactionsUI(postId, data) {
      // Find the specific post card using the data attribute
      const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
      if (!postCard) {
          console.warn(`Could not find post card with ID: ${postId}`);
          return;
      }
  
      // Find all the necessary elements within that specific post
      const likeBtn = postCard.querySelector('.like-btn');
      const dislikeBtn = postCard.querySelector('.dislike-btn');
      const likeCountSpan = postCard.querySelector('.like-count');
      const dislikeCountSpan = postCard.querySelector('.dislike-count');
  
      // Check if all elements were found
      if (!likeBtn || !dislikeBtn || !likeCountSpan || !dislikeCountSpan) {
          console.error('Could not find all reaction UI elements in post card:', postId);
          return;
      }
  
      
      likeCountSpan.textContent = data.likes || 0;
      dislikeCountSpan.textContent = data.dislikes || 0;
  
      
      likeBtn.classList.remove('active');
      dislikeBtn.classList.remove('active');
  
      
      if (data.userReaction === 'like') {
          
          likeBtn.classList.add('active');
      } else if (data.userReaction === 'dislike') {
  
          dislikeBtn.classList.add('active');
      }
      
  }
  // This function toggles the comment section visibility
  function showComments(postId) {
      // Log that the function was called and which post it's for.
      console.log(`Toggling comments for post ID: ${postId}`);
  
      // Find the specific wrapper for this post.
      const wrapper = document.getElementById(`comments-wrapper-for-post-${postId}`);
      
      // Check if we even found the wrapper.
      if (!wrapper) {
          console.error(`Could not find the comment wrapper for post ID: ${postId}. Check your HTML IDs.`);
          return;
      }
  
      // Check its current display state.
      const isVisible = wrapper.style.display === 'block';
      console.log(`Wrapper is currently visible? ${isVisible}`);
  
      // Toggle the display style.
      if (isVisible) {
          wrapper.style.display = 'none';
          console.log('Hiding comments.');
      } else {
          wrapper.style.display = 'block';
          console.log('Showing comments.');
          
          
      }
  }
  
  // Handles submitting the new comment form
  async function handleCreateComment(event, postId) {
      event.preventDefault();
      
      const form = event.target;
      const input = form.querySelector('input[name="content"]');
      const content = input.value.trim();
  
      if (!content) {
          alert('Please enter a comment');
          return;
      }
  
      try {
          const response = await fetch('/comment/create', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
              },
              credentials: 'include',
              body: new URLSearchParams({
                  'post_id': postId,
                  'content': content
              })
          });
  
          if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to post comment');
          }
  
          const newComment = await response.json();
          addCommentToUI(newComment);
          input.value = '';
  
      } catch (error) {
          console.error('Error posting comment:', error);
          alert(error.message || 'Failed to post comment');
      }
  }
  // Renders a single new comment and prepends it to the list
  function addCommentToUI(comment) {
      const list = document.getElementById(`comment-list-for-post-${comment.post_id}`);
      if (!list) return;
  
      const commentEl = document.createElement('div');
      commentEl.className = 'comment';
      commentEl.setAttribute('data-comment-id', comment.comment_id);
      commentEl.innerHTML = `
          <p class="comment-author">${comment.author || 'You'}</p>
          <p class="comment-content">${escapeHtml(comment.content)}</p>
          <div class="comment-actions">
              <button class="action-btn like-btn" onclick="handleCommentReaction(${comment.comment_id}, 'like')">
                  <i class="fas fa-thumbs-up"></i> <span class="like-count">${comment.likes || 0}</span>
              </button>
              <button class="action-btn dislike-btn" onclick="handleCommentReaction(${comment.comment_id}, 'dislike')">
                  <i class="fas fa-thumbs-down"></i> <span class="dislike-count">${comment.dislikes || 0}</span>
              </button>
          </div>
      `;
      list.prepend(commentEl);
  }
  // A new reaction handler specifically for comments
  async function handleCommentReaction(commentId, reactionType) {
      if (!isLoggedIn()) { 
          alert('Please login to react to comments');
          return;
      }
  
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      // Convert to string (instead of parseInt)
      const userId = String(user.id);
      if (!userId || userId === 'undefined' || userId === 'null') { 
          alert('User information not found. Please log in again.');
          return;
      }
  
      // Convert commentId to string
      const commentIdStr = String(commentId);
      if (!commentIdStr || commentIdStr === 'undefined') {
          console.error("Invalid comment ID:", commentId);
          return;
      }
  
      try {
          console.log("Sending comment reaction:", {
              user_id: userId,      // Send as string
              comment_id: commentIdStr, // Send as string
              like_type: reactionType
          });
  
          const response = await fetch("/comment/like", {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
              },
              credentials: 'include',
              body: JSON.stringify({
                  user_id: userId,         // String instead of number
                  comment_id: commentIdStr, // String instead of number
                  like_type: reactionType
              })
          });
  
          if (!response.ok) {
              const error = await response.text();
              throw new Error(error || 'Failed to process reaction');
          }
          
          const data = await response.json();
          console.log("Received response:", data);
          updateCommentReactionsUI(parseInt(commentIdStr), data);
  
      } catch (error) {
          console.error(`Error handling comment ${reactionType}:`, error);
          alert(error.message || 'Failed to process reaction');
      }
  }
  // A new UI updater for comments
  function updateCommentReactionsUI(commentId, data) {
      const commentEl = document.querySelector(`.comment[data-comment-id="${commentId}"]`);
      if (!commentEl) return;
  
      const likeCountSpan = commentEl.querySelector('.like-count');
      const dislikeCountSpan = commentEl.querySelector('.dislike-count');
      const likeBtn = commentEl.querySelector('.like-btn');
      const dislikeBtn = commentEl.querySelector('.dislike-btn');
  
      likeCountSpan.textContent = data.likes || 0;
      dislikeCountSpan.textContent = data.dislikes || 0;
  
      likeBtn.classList.remove('active');
      dislikeBtn.classList.remove('active');
  
      if (data.userReaction === 'like') {
          likeBtn.classList.add('active');
      } else if (data.userReaction === 'dislike') {
          dislikeBtn.classList.add('active');
      }
  }
  
  function isOwnPost(postUserId) {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      return currentUser.id && currentUser.id === postUserId;
  }
  
  
  // Helper function to format dates
  function formatDate(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
      
      return date.toLocaleDateString();
  }
  
  // Helper function to escape HTML
  function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
  }
  
  // A more generic function to handle both likes and dislikes
  async function handleReaction(postId, reactionType) {
      if (!isLoggedIn()) { 
          alert('Please login to react to posts');
          return;
      }
  
      const user = JSON.parse(localStorage.getItem('user') || {});
      const userId = user.id;
      
      if (!userId) {
          alert('User information not found. Please log in again.');
          return;
      }
  
      try {
          const response = await fetch("/like", {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              credentials: 'include',
              // The body now correctly sends the reaction type from the button click
              body: JSON.stringify({
                  user_id: userId,
                  post_id: postId,
                  like_type: reactionType // 'like' or 'dislike'
              })
          });
  
          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to process reaction');
          }
  
          const data = await response.json();
          updatePostReactionsUI(postId, data);
          
      } catch (error) {
          console.error(`Error handling ${reactionType}:`, error);
          alert(error.message || 'An error occurred. Please try again.');
      }
  }
  
  // A dedicated function to update the UI, keeping the code clean
  function updatePostReactionsUI(postId, data) {
      // Find the specific post card using the data attribute
      const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
      if (!postCard) {
          console.warn(`Could not find post card with ID: ${postId}`);
          return;
      }
  
      // Find the buttons and count spans within that specific post
      const likeBtn = postCard.querySelector('.like-btn');
      const dislikeBtn = postCard.querySelector('.dislike-btn');
      const likeCountSpan = postCard.querySelector('.like-count');
      const dislikeCountSpan = postCard.querySelector('.dislike-count');
  
      if (!likeBtn || !dislikeBtn || !likeCountSpan || !dislikeCountSpan) {
          console.error('UI elements for reactions not found in post card:', postId);
          return;
      }
  
      // Update counts
      likeCountSpan.textContent = data.likes || 0;
      dislikeCountSpan.textContent = data.dislikes || 0
      likeBtn.classList.remove('active');
      dislikeBtn.classList.remove('active');
  
      if (data.userReaction === 'like') {
          likeBtn.classList.add('active');
      } else if (data.userReaction === 'dislike') {
          dislikeBtn.classList.add('active');
      }
  }
  
  // Update your DOMContentLoaded event listener
  document.addEventListener('DOMContentLoaded', function() {
      showPage('home');
      setupNavigation();
      setupForms();
      updateAuthUI();
      loadCategories(); 
      loadPosts();
      
      
      // Add this to your existing setupForms function
      const createPostForm = document.getElementById('create-post-form');
      if (createPostForm && !createPostForm.dataset.listenerAdded) {
          createPostForm.addEventListener('submit', function(e) {
              e.preventDefault();
              handleCreatePost();
          });
          createPostForm.dataset.listenerAdded = 'true';
      }
  });
  // Handle logout
  function handleLogout() {
      cleanupChat(); 
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('auth_token');
      localStorage.removeUser('user');
      updateAuthUI();
      showPage('home');
  }
  
  