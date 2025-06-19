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

// Enhanced throttle function with better performance for scroll events
export function throttleScroll(func, limit = 200) {
    let timeoutId;
    let lastExecTime = 0;

    return function(...args) {
        const currentTime = Date.now();

        // If enough time has passed since last execution, execute immediately
        if (currentTime - lastExecTime >= limit) {
            func.apply(this, args);
            lastExecTime = currentTime;
        } else {
            // Clear any pending timeout and set a new one
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
                lastExecTime = Date.now();
            }, limit - (currentTime - lastExecTime));
        }
    };
}

// Debounce function for additional control


export function scrollToBottom(element) {
    if (element) element.scrollTop = element.scrollHeight;
}

export function showChatInterface() {
    const chatContainer = document.getElementById('chat-system-container');
    if (chatContainer) {
        chatContainer.style.display = 'flex';
    }
}
