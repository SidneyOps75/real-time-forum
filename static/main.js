

// --- Chat Variables ---
let ws;
let currentUserId = null;
let currentChattingWith = { id: null, username: null };
let messageOffsets = new Map();
let isLoadingMessages = false;


let userList, messageList, messageForm, messageInput, chatWithName, noChatSelected, activeChatArea;

document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM fully loaded and parsed. Initializing application.");
    assignChatDomElements();
    setupNavigation();
    setupForms();
    setupChatEventListeners(); 
    showPage('home'); 
    loadCategories();
    showChatInterface();

    if (isLoggedIn()) {
        const userId = getUserId();
        if (userId) {
            console.log("User is logged in. Initializing chat.");
            initializeChat(userId);
        }
    }
});

function isLoggedIn() {
    return localStorage.getItem('isAuthenticated') === 'true';
}
function showChatInterface() {
    const chatContainer = document.getElementById('chat-system-container');
    if (chatContainer) {
        chatContainer.style.display = 'flex'; // or whatever display you want
    }
   
}


function getUserId() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || 0;
}

function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active-section');
    });

    const page = document.getElementById(`${pageId}-page`);
    if (page) {
        page.classList.add('active-section');
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

function updateAuthUI() {
    const isAuthenticated = isLoggedIn();

    // Safely update auth buttons
    const loginBtn = document.querySelector('#auth-buttons #login-btn');
    const registerBtn = document.querySelector('#auth-buttons #register-btn');
    const logoutForm = document.querySelector('#logout-form');
    
    if (loginBtn) loginBtn.style.display = isAuthenticated ? 'none' : 'inline-block';
    if (registerBtn) registerBtn.style.display = isAuthenticated ? 'none' : 'inline-block';
    if (logoutForm) logoutForm.style.display = isAuthenticated ? 'inline-block' : 'none';

    // Safely update content areas
    const authContainer = document.querySelector('.auth-center-container');
    const authContent = document.getElementById('authenticated-content');
    const chatSidebar = document.getElementById('chat-sidebar');
    
    if (authContainer) authContainer.style.display = isAuthenticated ? 'none' : 'flex';
    if (authContent) authContent.style.display = isAuthenticated ? 'block' : 'none';
    if (chatSidebar) chatSidebar.style.display = isAuthenticated ? 'block' : 'none';
}


function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showPage(this.getAttribute('data-page'));
        });
    });

    document.getElementById('create-post-btn')?.addEventListener('click', () => showPage('create-post'));
    document.getElementById('home-login-btn')?.addEventListener('click', () => showPage('login'));
    document.getElementById('home-register-btn')?.addEventListener('click', () => showPage('register'));
}

function setupForms() {
    document.getElementById('login-form')?.addEventListener('submit', e => { e.preventDefault(); handleLogin(); });
    document.getElementById('register-form')?.addEventListener('submit', e => { e.preventDefault(); handleRegister(); });
    document.getElementById('create-post-form')?.addEventListener('submit', e => { e.preventDefault(); handleCreatePost(); });
    document.getElementById('logout-form')?.addEventListener('submit', e => { e.preventDefault(); handleLogout(); });
}


function handleLogin() {
    const identifier = document.getElementById('identifier').value;
    const password = document.getElementById('password').value;
    const submitBtn = document.querySelector('#login-form button[type="submit"]');

    if (!identifier || !password) {
        alert("Please enter both username/email and password.");
        return;
    }

    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
        credentials: 'include'
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) {
            throw new Error(data.message || 'Login failed');
        }

        localStorage.setItem('isAuthenticated', 'true');
        if (data.token) localStorage.setItem('auth_token', data.token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));

        updateAuthUI();
        showPage('home'); 
        if (data.user && data.user.id) {
            initializeChat(data.user.id);
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        const errorElement = document.getElementById('password-error');
        if (errorElement) {
            errorElement.textContent = error.message;
        } else {
            alert(error.message);
        }
    })
    .finally(() => {
        submitBtn.textContent = 'Login';
        submitBtn.disabled = false;
    });
}

function handleLogout() {
    cleanupChat();
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    updateAuthUI();
    showPage('home');
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

        
    const formData = new FormData(form);

    
    console.log("Form Data Entries:");
    for (let [key, value] of formData.entries()) {
        console.log(key, value);
    }

    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
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
   
    alert('Registration failed. Please try again.');
}
}

 async function handleCreatePost() {
   
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
          credentials: 'include', 
          headers: {
             'Authorization': `Bearer ${localStorage.getItem('auth_token')}`, 
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
      console.log('Loaded categories:', categories); 
      
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
   
    console.log(`Toggling comments for post ID: ${postId}`);
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
            user_id: userId,     
            comment_id: commentIdStr,
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
                user_id: userId,         
                comment_id: commentIdStr, 
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
           
            body: JSON.stringify({
                user_id: userId,
                post_id: postId,
                like_type: reactionType 
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

function assignChatDomElements() {
    userList = document.getElementById('user-list');
    messageList = document.getElementById('message-list');
    messageForm = document.getElementById('message-form');
    messageInput = document.getElementById('message-input');
    chatWithName = document.getElementById('chat-with-name');
    noChatSelected = document.getElementById('no-chat-selected');
    activeChatArea = document.getElementById('active-chat-area');
}

function setupChatEventListeners() {
    if (messageForm) {
        messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const content = messageInput.value.trim();
            if (content && currentChattingWith.id && ws?.readyState === WebSocket.OPEN) {
                const message = {
                    type: "private_message",
                    payload: { recipientId: currentChattingWith.id, content: content }
                };
                ws.send(JSON.stringify(message));
                appendMessage("You", content, new Date().toISOString(), true);
                scrollToBottom(messageList);
                messageInput.value = '';
            }
        });
    }

    if (messageList) {
        // Use throttle on the scroll event to prevent performance issues
        messageList.addEventListener('scroll', throttle(handleMessageListScroll, 200));
    }

    if (userList) {
        userList.addEventListener('click', (e) => {
            const userItem = e.target.closest('.user-list-item');
            if (userItem) {
                const userId = parseInt(userItem.dataset.userId, 10);
                const username = userItem.dataset.userUsername;
                openChatWithUser(userId, username);
            }
        });
    }
}

function initializeChat(userId) {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    if (!userId) {
        console.error("Cannot initialize chat without a user ID.");
        return;
    }
    currentUserId = userId;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    connectWebSocket(wsUrl);
    fetchAndRenderUsers();
}

// ======================================================================
// ========================= CORE CHAT LOGIC ============================
// ======================================================================

function connectWebSocket(url) {
    ws = new WebSocket(url);
    ws.onopen = () => console.log("WebSocket connection established.");
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'new_message') {
            handleNewMessage(message.payload);
        }
    };
    ws.onclose = () => console.log("WebSocket connection closed.");
    ws.onerror = (error) => console.error("WebSocket error:", error);
}

function handleNewMessage(payload) {
    const isFromCurrentChatPartner = payload.senderId === currentChattingWith.id;

    if (isFromCurrentChatPartner) {
        appendMessage(payload.senderUsername, payload.content, payload.timestamp, false);
        scrollToBottom(messageList);
    } else {
        const userItem = userList?.querySelector(`.user-list-item[data-user-id='${payload.senderId}']`);
        if (userItem) {
            userItem.classList.add('has-new-message');
            const lastMsgPreview = userItem.querySelector('.last-message-preview');
            if (lastMsgPreview) lastMsgPreview.textContent = payload.content;
        }
    }
    fetchAndRenderUsers(); // Re-sort user list
}

async function fetchAndRenderUsers() {
    if (!userList) return;
    try {
        const response = await fetch('/api/users', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch users');
        const users = await response.json();
        
        users.sort((a, b) => {
            const timeA = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
            const timeB = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;
            if (timeA !== timeB) return timeB - timeA;
            return a.username.localeCompare(b.username);
        });

        renderUserList(users);

    } catch (error) {
        console.error("Error fetching users:", error);
    }
}

function renderUserList(users) {
    userList.innerHTML = '';
    users.forEach(user => {
        if (user.userId === currentUserId) return;
        
        const li = document.createElement('li');
        li.className = 'user-list-item';
        li.dataset.userId = user.userId;
        li.dataset.userUsername = user.username;
        if (currentChattingWith.id === user.userId) {
            li.classList.add('active');
        }

        const statusClass = user.isOnline ? 'online' : 'offline';
        const lastMessageText = user.lastMessageContent || 'No messages yet';

        li.innerHTML = `
            <div class="user-avatar-status ${statusClass}">
                <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
            </div>
            <div class="user-info">
                <span class="user-name">${user.username}</span>
                <p class="last-message-preview">${escapeHtml(lastMessageText)}</p>
            </div>
        `;
        userList.appendChild(li);
    });
}

async function openChatWithUser(userId, username) {
    if (currentChattingWith.id === userId) return;

    currentChattingWith = { id: userId, username: username };
    messageOffsets.set(userId, 0); // Reset or initialize message offset for this chat
    isLoadingMessages = false; // Reset loading state for the new chat

    chatWithName.textContent = `Chat with ${username}`;
    noChatSelected.style.display = 'none';
    activeChatArea.style.display = 'flex';
    messageList.innerHTML = '<div class="chat-loading">Loading messages...</div>';

    document.querySelectorAll('.user-list-item').forEach(item => {
        item.classList.toggle('active', parseInt(item.dataset.userId) === userId);
        if (parseInt(item.dataset.userId) === userId) {
            item.classList.remove('has-new-message');
        }
    });

    await fetchAndRenderMessages(userId, true);
}

async function fetchAndRenderMessages(userId, isInitialLoad = false) {
    const offset = messageOffsets.get(userId) || 0;
    
    try {
        const response = await fetch(`/api/messages?with=${userId}&offset=${offset}&limit=10`, { credentials: 'include' });
        if (!response.ok) throw new Error(`Failed to fetch messages (Status: ${response.status})`);
        const messages = await response.json();

        if (isInitialLoad) messageList.innerHTML = '';
        
        if (messages && messages.length > 0) {
            messages.reverse().forEach(msg => appendMessage(msg.senderUsername, msg.content, msg.timestamp, msg.senderId === currentUserId, true)); // Prepend
            messageOffsets.set(userId, offset + messages.length);
        } else if (isInitialLoad) {
            messageList.innerHTML = `<div class="chat-empty-state">This is the beginning of your conversation with ${currentChattingWith.username}.</div>`;
        }
        
        if (isInitialLoad) {
            scrollToBottom(messageList);
        }

    } catch (error) {
        console.error("Error fetching messages:", error);
        if(isInitialLoad) messageList.innerHTML = `<div class="chat-error">Could not load messages.</div>`;
    }
}


function handleMessageListScroll() {
    // Load more messages when user scrolls to the top
    if (messageList.scrollTop === 0 && !isLoadingMessages) {
        loadMoreMessages();
    }
}


async function loadMoreMessages() {
    // 1. Prevent multiple simultaneous loads
    if (isLoadingMessages) return;
    isLoadingMessages = true;
    
    showLoadingIndicator();

    const userId = currentChattingWith.id;
    if (!userId) {
        isLoadingMessages = false;
        return;
    }

    const offset = messageOffsets.get(userId) || 0;

   
    const scrollHeightBefore = messageList.scrollHeight;
    
    try {
        const response = await fetch(`/api/messages?with=${userId}&offset=${offset}&limit=10`, { credentials: 'include' });
        if (!response.ok) throw new Error(`Failed to load more messages (Status: ${response.status})`);
        
        const messages = await response.json();
        
        if (messages && messages.length > 0) {
            console.log(`Fetched ${messages.length} older messages.`);
            
            // 3. Prepend the new messages to the top of the list
            messages.reverse().forEach(msg => {
                appendMessage(msg.senderUsername, msg.content, msg.timestamp, msg.senderId === currentUserId, true);
            });

            messageOffsets.set(userId, offset + messages.length);

            const scrollHeightAfter = messageList.scrollHeight;
            messageList.scrollTop = scrollHeightAfter - scrollHeightBefore;

        } else {
            console.log("No more older messages to load.");
           
        }

    } catch (error) {
        console.error("Error loading more messages:", error);
    } finally {
        // 6. Hide loading indicator and allow the next load, regardless of success or failure
        hideLoadingIndicator();
        isLoadingMessages = false;
    }
}


// ======================================================================
// ========================= UI & DOM HELPERS ===========================
// ======================================================================

function appendMessage(sender, content, timestamp, isSentByMe, prepend = false) {
    const messageBubble = document.createElement('div');
    messageBubble.className = `message-bubble ${isSentByMe ? 'sent' : 'received'}`;
    messageBubble.innerHTML = `
        <div class="message-header">${isSentByMe ? 'You' : escapeHtml(sender)}</div>
        <div class="message-content">${escapeHtml(content)}</div>
        <div class="message-timestamp">${formatDate(timestamp)}</div>
    `;
    if (prepend) {
        messageList.insertBefore(messageBubble, messageList.firstChild);
    } else {
        messageList.appendChild(messageBubble);
    }
}

function showLoadingIndicator() {
    if (document.querySelector('.message-loading-indicator')) return; // Don't add more than one
    const loader = document.createElement('div');
    loader.className = 'message-loading-indicator';
    loader.textContent = 'Loading older messages...';
    messageList.prepend(loader);
}

function hideLoadingIndicator() {
    document.querySelector('.message-loading-indicator')?.remove();
}

function scrollToBottom(element) {
    if (element) element.scrollTop = element.scrollHeight;
}

// ======================================================================
// ========================= UTILITY FUNCTIONS ==========================
// ======================================================================

function throttle(func, limit) {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function escapeHtml(text) {
    if (text === null || typeof text === 'undefined') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}