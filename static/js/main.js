import { isLoggedIn, getUserId, handleLogin, handleLogout, handleRegister, validateSession } from './auth.js';
import { assignChatDomElements, setupChatEventListeners, initializeChat } from './chat.js';
import { handleCreatePost, loadPosts, displayPosts, loadCategories } from './post.js';
import { handleReaction, updatePostReactionsUI } from './like.js';
import { showComments, handleCreateComment, handleCommentReaction } from './comment.js';
import { escapeHtml } from './helpers.js';
import { showChatInterface } from './helpers.js';
import { formatDate } from './helpers.js';
import { scrollToBottom } from './helpers.js';

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    console.log("DOM fully loaded and parsed. Initializing application.");
    assignChatDomElements();
    setupNavigation();
    setupForms();
    setupChatEventListeners(); 
    showPage('home'); 
    loadCategories();
    
    // Validate session on page load
    await initializeAuth();
    
    // Set up periodic session validation (every 5 minutes)
    setInterval(async () => {
        if (isLoggedIn()) {
            const isValid = await validateSession();
            if (!isValid) {
                console.log("Session expired, logging out user");
                handleLogout();
                showPage('home');
                updateAuthUI();
            }
        }
    }, 5 * 60 * 1000); // 5 minutes
});

// Initialize authentication state
async function initializeAuth() {
    if (isLoggedIn()) {
        // Validate the session with the server
        const isValid = await validateSession();
        if (isValid) {
            const userId = getUserId();
            if (userId) {
                console.log("User session validated. Initializing chat.");
                showChatInterface();
                initializeChat(userId);
            }
        } else {
            console.log("Session validation failed, clearing auth state");
            handleLogout();
        }
    }
    updateAuthUI();
}

// Core application functions
export function showPage(pageId) {
    console.log(`Showing page: ${pageId}`);
    
    // Hide all page sections
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active-section');
    });

    // Show the requested page
    const page = document.getElementById(`${pageId}-page`);
    if (page) {
        page.classList.add('active-section');
        console.log(`Page ${pageId} is now active`);
        
        // Load posts only for home page
        if (pageId === 'home') {
            loadPosts();
        }
    } else {
        console.error(`Page with ID "${pageId}-page" not found!`);
    }

    // Show/hide sidebar based on page
    const filtersSidebar = document.getElementById('filters-sidebar');
    const activitySidebar = document.getElementById('activity-sidebar');
    
    if (filtersSidebar) {
        filtersSidebar.style.display = pageId === 'home' ? 'block' : 'none';
    }
    if (activitySidebar) {
        activitySidebar.style.display = pageId === 'home' ? 'block' : 'none';
    }

    updateAuthUI();
}

export function updateAuthUI() {
    const isAuthenticated = isLoggedIn();

    // Update header navigation buttons
    const loggedOutElements = document.querySelectorAll('.logged-out');
    const loggedInElements = document.querySelectorAll('.logged-in');
    
    loggedOutElements.forEach(el => {
        el.style.display = isAuthenticated ? 'none' : 'flex';
    });
    
    loggedInElements.forEach(el => {
        el.style.display = isAuthenticated ? 'flex' : 'none';
    });

    // Update sidebar elements
    const createPostBtn = document.getElementById('create-post-btn');
    if (createPostBtn) {
        createPostBtn.style.display = isAuthenticated ? 'inline-flex' : 'none';
    }

    // Update chat system
    const chatContainer = document.getElementById('chat-system-container');
    if (chatContainer) {
        chatContainer.style.display = isAuthenticated ? 'flex' : 'none';
    }

    // Show/hide sidebar sections based on auth state
    const onlineUsersSection = document.querySelector('#activity-sidebar .logged-in');
    if (onlineUsersSection) {
        onlineUsersSection.style.display = isAuthenticated ? 'block' : 'none';
    }
    
    // Update user profile information
    if (isAuthenticated) {
        updateUserProfile();
    }
}

function updateUserProfile() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (user.username) {
        // Update navigation profile
        const userNameNav = document.getElementById('user-name-nav');
        const userAvatarInitial = document.getElementById('user-avatar-initial');
        
        if (userNameNav) {
            userNameNav.textContent = user.username;
        }
        
        if (userAvatarInitial) {
            userAvatarInitial.textContent = user.username.charAt(0).toUpperCase();
        }
        
        // Update dropdown profile
        const userFullName = document.getElementById('user-full-name');
        const userEmail = document.getElementById('user-email');
        const userAvatarLargeInitial = document.getElementById('user-avatar-large-initial');
        
        if (userFullName) {
            // If we have first/last name from registration, use it, otherwise use username
            const fullName = user.firstname && user.lastname 
                ? `${user.firstname} ${user.lastname}` 
                : user.username;
            userFullName.textContent = fullName;
        }
        
        if (userEmail) {
            userEmail.textContent = user.email || 'No email provided';
        }
        
        if (userAvatarLargeInitial) {
            userAvatarLargeInitial.textContent = user.username.charAt(0).toUpperCase();
        }
    }
}

export function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showPage(this.getAttribute('data-page'));
        });
    });

    document.getElementById('create-post-btn')?.addEventListener('click', () => showPage('create-post'));
    document.getElementById('home-login-btn')?.addEventListener('click', () => showPage('login'));
    document.getElementById('home-register-btn')?.addEventListener('click', () => showPage('register'));
    
    // Setup user profile dropdown
    setupUserProfileDropdown();
}

function setupUserProfileDropdown() {
    const profileBtn = document.getElementById('user-profile-btn');
    const dropdownMenu = document.getElementById('user-dropdown-menu');
    
    if (profileBtn && dropdownMenu) {
        // Toggle dropdown on profile button click
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpen = dropdownMenu.classList.contains('show');
            
            if (isOpen) {
                closeUserDropdown();
            } else {
                openUserDropdown();
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!profileBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
                closeUserDropdown();
            }
        });
        
        // Handle dropdown menu items
        document.getElementById('view-profile-btn')?.addEventListener('click', () => {
            console.log('View Profile clicked');
            closeUserDropdown();
            // TODO: Implement profile page
        });
        
        document.getElementById('settings-btn')?.addEventListener('click', () => {
            console.log('Settings clicked');
            closeUserDropdown();
            // TODO: Implement settings page
        });
    }
}

function openUserDropdown() {
    const profileBtn = document.getElementById('user-profile-btn');
    const dropdownMenu = document.getElementById('user-dropdown-menu');
    
    if (profileBtn && dropdownMenu) {
        profileBtn.classList.add('active');
        dropdownMenu.classList.add('show');
    }
}

function closeUserDropdown() {
    const profileBtn = document.getElementById('user-profile-btn');
    const dropdownMenu = document.getElementById('user-dropdown-menu');
    
    if (profileBtn && dropdownMenu) {
        profileBtn.classList.remove('active');
        dropdownMenu.classList.remove('show');
    }
}

export function setupForms() {
    // Use event delegation to handle forms that might be shown/hidden dynamically
    document.addEventListener('submit', async function(e) {
        if (e.target.id === 'login-form') {
            e.preventDefault();
            console.log('Login form submitted');
            try {
                await handleLogin();
                // After successful login, show home page and update UI
                showPage('home');
                updateAuthUI();
                // Initialize chat if user is logged in
                const userId = getUserId();
                if (userId) {
                    initializeChat(userId);
                }
            } catch (error) {
                console.error('Login failed:', error);
            }
        } else if (e.target.id === 'register-form') {
            e.preventDefault();
            console.log('Register form submitted');
            try {
                const result = await handleRegister();
                console.log('Registration successful:', result);
                
                // After successful registration, show login page
                showPage('login');
                
                // Show success message on login page
                setTimeout(() => {
                    const loginSection = document.getElementById('login-page');
                    if (loginSection) {
                        // Remove any existing success messages
                        const existingMsg = loginSection.querySelector('.success-message');
                        if (existingMsg) {
                            existingMsg.remove();
                        }
                        
                        // Create and add new success message
                        const successMsg = document.createElement('div');
                        successMsg.className = 'success-message';
                        successMsg.textContent = 'Registration successful! Please log in with your credentials.';
                        
                        // Insert at the top of the login section
                        const authCard = loginSection.querySelector('.auth-card');
                        if (authCard) {
                            authCard.insertBefore(successMsg, authCard.firstChild);
                        }
                        
                        // Remove message after 7 seconds
                        setTimeout(() => successMsg.remove(), 7000);
                    }
                }, 100); // Small delay to ensure page transition completes
                
            } catch (error) {
                console.error('Registration failed:', error);
                // Show error message on registration form
                const registerSection = document.getElementById('register-page');
                if (registerSection) {
                    const existingError = registerSection.querySelector('.error-message-general');
                    if (existingError) {
                        existingError.remove();
                    }
                    
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'error-message-general';
                    errorMsg.style.cssText = 'background-color: var(--error-color); color: white; padding: 0.75rem 1rem; border-radius: var(--border-radius); margin-bottom: 1rem; font-weight: 500;';
                    errorMsg.textContent = error.message || 'Registration failed. Please try again.';
                    
                    const authCard = registerSection.querySelector('.auth-card');
                    if (authCard) {
                        authCard.insertBefore(errorMsg, authCard.firstChild);
                    }
                    
                    setTimeout(() => errorMsg.remove(), 5000);
                }
            }
        } else if (e.target.id === 'create-post-form') {
            e.preventDefault();
            handleCreatePost();
        } else if (e.target.id === 'logout-form') {
            e.preventDefault();
            closeUserDropdown(); // Close dropdown before logout
            handleLogout();
            showPage('home');
            updateAuthUI();
            // Hide chat system when logged out
            const chatContainer = document.getElementById('chat-system-container');
            if (chatContainer) {
                chatContainer.style.display = 'none';
            }
        }
    });
}

// Make functions available globally for HTML onclick handlers
window.showPage = showPage;
window.handleReaction = handleReaction;
window.showComments = showComments;
window.handleCreateComment = handleCreateComment;
window.handleCommentReaction = handleCommentReaction;