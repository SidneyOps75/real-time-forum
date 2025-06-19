import { isLoggedIn } from './auth.js';
import { escapeHtml, formatDate } from './helpers.js';


const avatarColors = [
    '#e57373', '#f06292', '#ba68c8', '#9575cd', '#7986cb',
    '#64b5f6', '#4fc3f7', '#4dd0e1', '#4db6ac', '#81c784',
    '#aed581', '#ff8a65', '#d4e157', '#ffd54f', '#ffb74d'
];


 
function getAvatarColor(name) {
    if (!name) return '#868686';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % avatarColors.length);
    return avatarColors[index];
}


// --- CORE POST FUNCTIONS ---

export async function handleCreatePost() {
    // This function remains unchanged as its logic is correct.
    const isAuthenticated = isLoggedIn();
    const user = JSON.parse(localStorage.getItem('user') || {});
    
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
  
    if (!title || !content || categories.length === 0) {
        alert('Title, content, and at least one category are required.');
        return;
    }
  
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
            window.showPage('home'); // Assuming showPage is global
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


export async function loadPosts(filters = {}) {
    // This function remains unchanged.
    try {
        const queryParams = new URLSearchParams();
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.myPostsOnly) queryParams.append('my_posts_only', 'true');
        if (filters.likedPostsOnly) queryParams.append('liked_posts_only', 'true');
        
        const response = await fetch(`/api/posts?${queryParams.toString()}`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const posts = await response.json();
        displayPosts(posts);
    } catch (error) {
        console.error('Error loading posts:', error);
        const container = document.getElementById('posts-container');
        if (container) container.innerHTML = `<div class="error">Failed to load posts. <button onclick="loadPosts()">Retry</button></div>`;
    }
}


/**
 * REWRITTEN displayPosts function to generate the new, enhanced UI.
 */
export function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;

    if (!posts || posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem;">
                <i class="fas fa-comments" style="font-size: 3rem; color: #ccc;"></i>
                <h3 style="margin-top: 1rem;">No posts yet</h3>
                <p>Be the first to start a discussion!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = posts.map(post => {
        const authorName = `${post.first_name || 'Unknown'} ${post.last_name || 'User'}`;
        const initial = authorName.charAt(0).toUpperCase();
        const bgColor = getAvatarColor(authorName);

        // Create HTML for category tags
        const categories = post.categories ? post.categories.split(',') : [];
        const categoriesHtml = categories.map(cat => `<span class="post-category-tag">${escapeHtml(cat)}</span>`).join('');

        // Create HTML for the post image, if it exists
        const imageHtml = post.image_url ? `<img src="${post.image_url}" alt="Post image" class="post-image">` : '';

        return `
        <article class="post-card" data-post-id="${post.post_id}">
            <header class="post-header">
                <div class="post-author-details">
                    <div class="post-author-avatar" style="background-color: ${bgColor};">
                        ${initial}
                    </div>
                    <div class="post-author-info">
                        <span class="post-author-name">${escapeHtml(authorName)}</span>
                        <span class="post-timestamp">${formatDate(post.created_at)}</span>
                    </div>
                </div>
            </header>
            
            <div class="post-body">
                <h3 class="post-title">${escapeHtml(post.title)}</h3>
                ${categoriesHtml ? `<div class="post-categories">${categoriesHtml}</div>` : ''}
                <p class="post-text">${escapeHtml(post.content)}</p>
            </div>
            
            ${imageHtml}
            
            <footer class="post-footer">
                <div class="post-actions">
                    <button class="action-btn like-btn ${post.user_reaction === 'like' ? 'active' : ''}" 
                            onclick="handleReaction(${post.post_id}, 'like')">
                        <i class="far fa-thumbs-up"></i>
                        <span>Like</span>
                        <span class="like-count">(${post.likes || 0})</span>
                    </button>
                    <button class="action-btn dislike-btn ${post.user_reaction === 'dislike' ? 'active' : ''}" 
                            onclick="handleReaction(${post.post_id}, 'dislike')">
                        <i class="far fa-thumbs-down"></i>
                        <span>Dislike</span>
                         <span class="dislike-count">(${post.dislikes || 0})</span>
                    </button>
                    <button class="action-btn comment-btn" onclick="showComments(${post.post_id})">
                        <i class="far fa-comment"></i>
                        <span>Comment</span>
                        <span>(${post.comment_count || 0})</span>
                    </button>
                </div>
            </footer>

            <div class="comments-wrapper" id="comments-wrapper-for-post-${post.post_id}" style="display: none;">
                <div class="comment-list" id="comment-list-for-post-${post.post_id}"></div>
                <form class="comment-form" onsubmit="handleCreateComment(event, ${post.post_id})">
                    <input type="text" name="content" class="comment-input" placeholder="Add a comment..." required>
                    <button type="submit" class="comment-submit-btn primary-btn">Post</button>
                </form>
            </div>
        </article>
    `}).join('');
}


export async function loadCategories() {
    // This function remains unchanged.
    try {
        const response = await fetch('/api/categories', { credentials: 'include' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const categories = await response.json();
        
        const container = document.getElementById('categories-container');
        if (container) {
            container.innerHTML = categories.map(cat => `
                <div class="category-option">
                    <input type="checkbox" id="category-${cat.category_id}" name="category" value="${cat.category_id}">
                    <label for="category-${cat.category_id}">${cat.name}</label>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        const container = document.getElementById('categories-container');
        if (container) container.innerHTML = `<div class="error">Failed to load categories.</div>`;
    }
}