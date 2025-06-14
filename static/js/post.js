import { isLoggedIn } from './auth.js';
import { escapeHtml, formatDate } from './helpers.js';

export async function handleCreatePost() {
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
  
    if (!title || !content) {
        alert('Title and content are required');
        return;
    }
  
    if (categories.length === 0) {
        alert('Please select at least one category');
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

export async function loadPosts(filters = {}) {
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

export function displayPosts(posts) {
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
                <div class="post-author">
                    <div class="author-avatar">${post.first_name ? post.first_name[0].toUpperCase() : 'U'}</div>
                    <div class="author-info">
                        <h4>${post.first_name || 'Unknown'} ${post.last_name || 'User'}</h4>
                        <span class="post-time">${formatDate(post.created_at)}</span>
                    </div>
                </div>
            </div>
            
            <div class="post-content">
                <h3 class="post-title">${escapeHtml(post.title)}</h3>
                <p class="post-text">${escapeHtml(post.content)}</p>
            </div>
            
            <div class="post-footer">
                <div class="post-stats">
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

export async function loadCategories() {
    try {
        const response = await fetch('/api/categories', {
            credentials: 'include'
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