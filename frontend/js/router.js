export class Router {
    constructor() {
        this.routes = new Map();
        window.addEventListener('popstate', () => this.loadRoute());
    }

    addRoute(path, renderFunction) {
        this.routes.set(path, renderFunction);
    }

    navigate(path) {
        history.pushState({}, '', path);
        this.loadRoute();
    }

    loadRoute() {
        const path = window.location.pathname;
        const renderFunction = this.routes.get(path);
        if (renderFunction) {
            renderFunction();
        } else {
            console.error(`No view found for path: ${path}`);
        }
    }
}

export const router = new Router();