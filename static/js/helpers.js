// Utility functions
export function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    
    // Always show both date and time
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    
    return date.toLocaleDateString([], options);
}

export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

export function scrollToBottom(element) {
    if (element) element.scrollTop = element.scrollHeight;
}

export function showChatInterface() {
    const chatContainer = document.getElementById('chat-system-container');
    if (chatContainer) {
        chatContainer.style.display = 'flex';
    }
}
