// Router System for multi-page app
import { getCurrentUser, onAuthStateChange } from './auth.js';

const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PARTICIPANT: '/participant',
  VOLUNTEER: '/volunteer',
  BOOTH_ADMIN: '/booth-admin',
  EVENT_ORGANIZER: '/organizer',
  UNIVERSITY_ADMIN: '/university-admin',
  SUPER_ADMIN: '/admin',
  EVENT: '/events/:eventId',
  NOT_FOUND: '/404'
};

class Router {
  constructor() {
    this.routes = new Map();
    this.currentPage = null;
    this.currentRoute = null;
    this.currentUser = null;
    
    // Set up auth listener
    onAuthStateChange((user) => {
      this.currentUser = user;
      if (this.currentPage && this.currentPage.onAuthChange) {
        this.currentPage.onAuthChange(user);
      }
    });
  }

  // Register a route
  register(path, pageClass) {
    this.routes.set(path, pageClass);
  }

  // Navigate to a route
  async navigate(path) {
    // Handle hash navigation
    if (path.startsWith('#')) {
      // Smooth scroll to section
      const sectionId = path.substring(1);
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // Check authentication
    const route = this.findRoute(path);
    const user = this.currentUser;

    // Protected routes
    const protectedRoutes = [
      ROUTES.DASHBOARD,
      ROUTES.PARTICIPANT,
      ROUTES.VOLUNTEER,
      ROUTES.BOOTH_ADMIN,
      ROUTES.EVENT_ORGANIZER,
      ROUTES.UNIVERSITY_ADMIN,
      ROUTES.SUPER_ADMIN
    ];

    if (protectedRoutes.includes(route)) {
      if (!user) {
        window.location.hash = '#/login';
        return;
      }
    }

    // Admin-only routes
    const adminRoutes = [ROUTES.SUPER_ADMIN, ROUTES.UNIVERSITY_ADMIN];
    if (adminRoutes.includes(route)) {
      if (!user || !['super_admin', 'university_admin'].includes(user.role)) {
        window.location.hash = '#/participant';
        return;
      }
    }

    // Update current route
    this.currentRoute = route;
    
    // Load and render page
    await this.loadPage(path);
    
    // Update URL
    window.location.hash = path;
  }

  // Find matching route
  findRoute(path) {
    // Exact match
    if (this.routes.has(path)) {
      return path;
    }
    
    // Dynamic route match
    for (const [route, _] of this.routes) {
      if (route.includes(':')) {
        const pattern = route.replace(/:[^/]+/g, '[^/]+');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(path)) {
          return route;
        }
      }
    }
    
    return ROUTES.NOT_FOUND;
  }

  // Load page component
  async loadPage(path) {
    const route = this.findRoute(path);
    const PageClass = this.routes.get(route);

    if (!PageClass) {
      this.render404();
      return;
    }

    // Create page instance
    const page = new PageClass(path);
    
    // Hide loading if shown
    const loading = document.getElementById('loadingOverlay');
    if (loading && !loading.classList.contains('hidden')) {
      loading.classList.add('hidden');
      setTimeout(() => loading.remove(), 500);
    }

    // Destroy previous page
    if (this.currentPage && this.currentPage.destroy) {
      this.currentPage.destroy();
    }

    // Render new page
    const container = document.getElementById('app-container');
    if (container) {
      container.innerHTML = '';
      await page.render(container);
    }

    this.currentPage = page;
    
    // Scroll to top
    window.scrollTo(0, 0);
  }

  // 404 page
  render404() {
    const container = document.getElementById('app-container');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 100px 20px; font-family: Inter, sans-serif;">
          <h1 style="font-size: 48px; color: #1a1a1a;">404</h1>
          <p style="font-size: 18px; color: #666; margin-bottom: 30px;">Page not found</p>
          <button onclick="window.location.hash='#/'" style="padding: 10px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
            Go Home
          </button>
        </div>
      `;
    }
  }

  // Initialize router
  init() {
    // Handle hash changes
    window.addEventListener('hashchange', () => {
      const path = window.location.hash.substring(1) || '/';
      this.navigate(path);
    });

    // Initial route
    const initialPath = window.location.hash.substring(1) || '/';
    this.navigate(initialPath);
  }
}

// Export router instance
export const router = new Router();
export { ROUTES };
