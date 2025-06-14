import { isLoggedIn, getUserId, handleLogin, handleLogout, handleRegister } from './auth.js';
import { assignChatDomElements, setupChatEventListeners, initializeChat } from './chat.js';
import { handleCreatePost, loadPosts, displayPosts, loadCategories } from './post.js';
import { handleReaction, updatePostReactionsUI } from './like.js';
import { showComments, handleCreateComment, handleCommentReaction } from './comment.js';
import { escapeHtml } from './helpers.js';
import { showChatInterface } from './helpers.js';
import { formatDate } from './helpers.js';
import { scrollToBottom } from './helpers.js';

// Initialize the application when DOM is loaded
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

// Core application functions
export function showPage(pageId) {
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

export function updateAuthUI() {
    const isAuthenticated = isLoggedIn();

    const loginBtn = document.querySelector('#auth-buttons #login-btn');
    const registerBtn = document.querySelector('#auth-buttons #register-btn');
    const logoutForm = document.querySelector('#logout-form');
    
    if (loginBtn) loginBtn.style.display = isAuthenticated ? 'none' : 'inline-block';
    if (registerBtn) registerBtn.style.display = isAuthenticated ? 'none' : 'inline-block';
    if (logoutForm) logoutForm.style.display = isAuthenticated ? 'inline-block' : 'none';

    const authContainer = document.querySelector('.auth-center-container');
    const authContent = document.getElementById('authenticated-content');
    const chatSidebar = document.getElementById('chat-sidebar');
    
    if (authContainer) authContainer.style.display = isAuthenticated ? 'none' : 'flex';
    if (authContent) authContent.style.display = isAuthenticated ? 'block' : 'none';
    if (chatSidebar) chatSidebar.style.display = isAuthenticated ? 'block' : 'none';
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
}

export function setupForms() {
    document.getElementById('login-form')?.addEventListener('submit', e => { e.preventDefault(); handleLogin(); });
    document.getElementById('register-form')?.addEventListener('submit', e => { e.preventDefault(); handleRegister(); });
    document.getElementById('create-post-form')?.addEventListener('submit', e => { e.preventDefault(); handleCreatePost(); });
    document.getElementById('logout-form')?.addEventListener('submit', e => { e.preventDefault(); handleLogout(); });
}

// Make functions available globally for HTML onclick handlers
window.showPage = showPage;
window.handleReaction = handleReaction;
window.showComments = showComments;
window.handleCreateComment = handleCreateComment;
window.handleCommentReaction = handleCommentReaction;