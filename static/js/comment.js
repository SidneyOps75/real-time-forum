import { isLoggedIn } from './auth.js';
import { escapeHtml } from './helpers.js';


const avatarColors = [
    '#e57373', '#f06292', '#ba68c8', '#9575cd', '#7986cb',
    '#64b5f6', '#4fc3f7', '#4dd0e1', '#4db6ac', '#81c784',
    '#aed581', '#ff8a65', '#d4e157', '#ffd54f', '#ffb74d'
];

/**
 * Creates a consistent color for a user's avatar based on their username.
 * @param {string} username 
 * @returns {string} 
 */
function getAvatarColor(username) {
    if (!username) return '#868686'; // Default grey
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % avatarColors.length);
    return avatarColors[index];
}



 
export async function showComments(postId) {
    const wrapper = document.getElementById(`comments-wrapper-for-post-${postId}`);
    const list = document.getElementById(`comment-list-for-post-${postId}`);

    if (!wrapper || !list) {
        console.error(`Could not find comment elements for post ID: ${postId}.`);
        return;
    }

    const isVisible = wrapper.style.display === 'block';

    // If we are about to show the comments and they haven't been loaded yet
    if (!isVisible && list.dataset.loaded !== 'true') {
        try {
            list.innerHTML = '<p class="text-center" style="padding: 1rem;">Loading comments...</p>';
            const response = await fetch(`/comments?post_id=${postId}`, { credentials: 'include' });
            if (!response.ok) {
                throw new Error('Failed to load comments.');
            }
            const comments = await response.json();

            list.innerHTML = ''; 
            if (comments && comments.length > 0) {
                comments.forEach(comment => addCommentToUI(comment));
            } else {
                list.innerHTML = '<p class="text-center" style="padding: 1rem;">No comments yet. Be the first to comment!</p>';
            }
            list.dataset.loaded = 'true'; 

        } catch (error) {
            console.error('Error fetching comments:', error);
            list.innerHTML = '<p class="text-center" style="padding: 1rem; color: var(--error-color);">Could not load comments. Please try again.</p>';
        }
    }

    // Finally, toggle visibility
    wrapper.style.display = isVisible ? 'none' : 'block';
}



export function addCommentToUI(comment) {
    const list = document.getElementById(`comment-list-for-post-${comment.post_id}`);
    if (!list) return;

   
    const noCommentsMessage = list.querySelector('p.text-center');
    if (noCommentsMessage) {
        noCommentsMessage.remove();
    }

    const commentEl = document.createElement('div');
    commentEl.className = 'comment-card'; // Use the new card class
    commentEl.setAttribute('data-comment-id', comment.comment_id);

    const authorName = escapeHtml(comment.author);
    const initial = authorName.charAt(0).toUpperCase();
    const bgColor = getAvatarColor(authorName);
    const likeActiveClass = comment.user_reaction === 'like' ? 'active' : '';
    const dislikeActiveClass = comment.user_reaction === 'dislike' ? 'active' : '';

   
    commentEl.innerHTML = `
        <div class="comment-avatar" style="background-color: ${bgColor};">
            ${initial}
        </div>
        <div class="comment-body">
            <p class="comment-author">${authorName}</p>
            <p class="comment-content">${escapeHtml(comment.content)}</p>
            <div class="comment-actions">
                <button class="action-btn like-btn ${likeActiveClass}" onclick="handleCommentReaction(${comment.comment_id}, 'like')">
                    <i class="far fa-thumbs-up"></i> <span class="like-count">${comment.likes || 0}</span>
                </button>
                <button class="action-btn dislike-btn ${dislikeActiveClass}" onclick="handleCommentReaction(${comment.comment_id}, 'dislike')">
                    <i class="far fa-thumbs-down"></i> <span class="dislike-count">${comment.dislikes || 0}</span>
                </button>
            </div>
        </div>
    `;
  
    list.appendChild(commentEl);
}


export async function handleCreateComment(event, postId) {
    event.preventDefault();
    if (!isLoggedIn()) {
        alert('Please log in to comment');
        return;
    }
    
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


export async function handleCommentReaction(commentId, reactionType) {
    if (!isLoggedIn()) { 
        alert('Please log in to like a comment');
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = String(user.id);
    if (!userId || userId === 'undefined' || userId === 'null') { 
        alert('User information not found. Please log in again.');
        return;
    }

    const commentIdStr = String(commentId);
    if (!commentIdStr || commentIdStr === 'undefined') {
        console.error("Invalid comment ID:", commentId);
        return;
    }

    try {
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
        updateCommentReactionsUI(parseInt(commentIdStr), data);
    } catch (error) {
        console.error(`Error handling comment ${reactionType}:`, error);
        alert(error.message || 'Failed to process reaction');
    }
}


export function updateCommentReactionsUI(commentId, data) {
    // We target .comment-card now since it's the new parent element
    const commentEl = document.querySelector(`.comment-card[data-comment-id="${commentId}"]`);
    if (!commentEl) return;

    const likeCountSpan = commentEl.querySelector('.like-count');
    const dislikeCountSpan = commentEl.querySelector('.dislike-count');
    const likeBtn = commentEl.querySelector('.like-btn');
    const dislikeBtn = commentEl.querySelector('.dislike-btn');

    if (likeCountSpan) likeCountSpan.textContent = data.likes || 0;
    if (dislikeCountSpan) dislikeCountSpan.textContent = data.dislikes || 0;

    if (likeBtn) likeBtn.classList.remove('active');
    if (dislikeBtn) dislikeBtn.classList.remove('active');

    if (data.userReaction === 'like' && likeBtn) {
        likeBtn.classList.add('active');
    } else if (data.userReaction === 'dislike' && dislikeBtn) {
        dislikeBtn.classList.add('active');
    }
}