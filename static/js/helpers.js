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
    let lastFunc;
    let lastRan;

    return function() {
        const context = this;
        const args = arguments;

        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
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
