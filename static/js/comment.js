import { isLoggedIn } from './auth.js';
import { escapeHtml } from './helpers.js';

export async function handleCreateComment(event, postId) {
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

export function addCommentToUI(comment) {
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

export async function handleCommentReaction(commentId, reactionType) {
    if (!isLoggedIn()) { 
        alert('Please login to react to comments');
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

export function showComments(postId) {
    const wrapper = document.getElementById(`comments-wrapper-for-post-${postId}`);
    if (!wrapper) {
        console.error(`Could not find the comment wrapper for post ID: ${postId}. Check your HTML IDs.`);
        return;
    }

    const isVisible = wrapper.style.display === 'block';
    if (isVisible) {
        wrapper.style.display = 'none';
    } else {
        wrapper.style.display = 'block';
    }
}