import { isLoggedIn } from './auth.js';

export async function handleReaction(postId, reactionType) {
    if (!isLoggedIn()) {
        alert('Please login to react to posts');
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || {});
    const userId = user.id;
    const token = localStorage.getItem('auth_token');
    
    if (!userId || !token) {
        alert('User information not found. Please log in again.');
        return;
    }

    try {
        const payload = {
            user_id: Number(userId),
            post_id: Number(postId),
            like_type: reactionType.toLowerCase()
        };
        
        console.log("Sending reaction payload:", payload);
    
        const response = await fetch("/like", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
    
        const responseData = await response.json();
        console.log("Backend response:", responseData);
    
        if (!response.ok) {
            throw new Error(responseData.error || 'Failed to process reaction');
        }
        
        // Update the UI immediately after successful response
        updatePostReactionsUI(postId, responseData);
        
        return responseData;
    } catch (error) {
        console.error(`Error handling ${reactionType}:`, error);
        alert(error.message || 'Failed to process reaction');
        throw error;
    }
}

export function updatePostReactionsUI(postId, data) {
    const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    if (!postCard) {
        console.warn(`Could not find post card with ID: ${postId}`);
        return;
    }

    const likeBtn = postCard.querySelector('.like-btn');
    const dislikeBtn = postCard.querySelector('.dislike-btn');
    const likeCountSpan = postCard.querySelector('.like-count');
    const dislikeCountSpan = postCard.querySelector('.dislike-count');

    if (!likeBtn || !dislikeBtn || !likeCountSpan || !dislikeCountSpan) {
        console.error('Could not find all reaction UI elements in post card:', postId);
        return;
    }

    // Update counts
    likeCountSpan.textContent = data.likes || 0;
    dislikeCountSpan.textContent = data.dislikes || 0;

    // Update active states
    likeBtn.classList.toggle('active', data.userReaction === 'like');
    dislikeBtn.classList.toggle('active', data.userReaction === 'dislike');
}