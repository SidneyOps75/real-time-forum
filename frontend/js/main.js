import { router } from './router.js';
import { renderAuthView } from './views/authView.js';
import { renderPostsView } from './views/postsView.js';
import { renderChatView } from './views/chatView.js';

document.addEventListener('DOMContentLoaded', () => {
    // Define routes
    router.addRoute('/', renderAuthView);
    router.addRoute('/posts', renderPostsView);
    router.addRoute('/chat', renderChatView);

    // Load the initial route
    router.loadRoute();
});