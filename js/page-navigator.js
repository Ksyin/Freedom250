// js/page-navigator.js - Handles page navigation and auth-based routing

import { getCurrentUser, onAuthStateChange, getDashboardPath, ROLES } from './auth.js';

class PageNavigator {
  constructor() {
    this.currentPage = null;
    this.isInitialized = false;
    this.redirectInProgress = false;
    
    // Listen for auth state changes
    onAuthStateChange((user, isAuthenticated) => {
      console.log('[Navigator] Auth state changed:', {
        isAuthenticated,
        user: user?.email,
        role: user?.role
      });
      this.handleAuthStateChange(user, isAuthenticated);
    });
  }

  /**
   * Initialize the navigator
   * Should be called after auth is initialized
   */
  async initialize() {
    if (this.isInitialized) return;
    
    const user = getCurrentUser();
    const currentPagePath = window.location.pathname;
    
    console.log('[Navigator] Initializing with user:', user?.email, 'Current page:', currentPagePath);
    
    // Handle initial routing
    this.handleInitialRoute(user, currentPagePath);
    this.isInitialized = true;
  }

  /**
   * Handle auth state changes - redirect if necessary
   */
  async handleAuthStateChange(user, isAuthenticated) {
    if (this.redirectInProgress) return;
    
    const currentPagePath = window.location.pathname;
    const isAuthPage = currentPagePath.includes('login') || currentPagePath.includes('register');
    const isDashboardPage = currentPagePath.includes('dashboard');

    console.log('[Navigator] Handling auth change:', {
      isAuthenticated,
      isAuthPage,
      isDashboardPage,
      userRole: user?.role
    });

    if (isAuthenticated && user) {
      // User is authenticated
      if (isAuthPage) {
        // User is on login/register page but is authenticated - redirect to dashboard
        console.log('[Navigator] User authenticated on auth page, redirecting to dashboard');
        this.redirectToDashboard(user);
      }
    } else {
      // User is not authenticated
      if (isDashboardPage || (!isAuthPage && !currentPagePath.includes('index'))) {
        // User is on a protected page but not authenticated - redirect to login
        console.log('[Navigator] User not authenticated on protected page, redirecting to login');
        this.redirectToLogin();
      }
    }
  }

  /**
   * Handle initial page load routing
   */
  handleInitialRoute(user, currentPagePath) {
    const isAuthPage = currentPagePath.includes('login') || currentPagePath.includes('register');
    const isDashboardPage = currentPagePath.includes('dashboard');
    const isPublicPage = currentPagePath.includes('index') || currentPagePath === '/';

    if (user && isAuthPage) {
      // User is logged in but on auth page
      console.log('[Navigator] Initial route: user on auth page, redirecting to dashboard');
      this.redirectToDashboard(user);
    } else if (!user && (isDashboardPage)) {
      // User not logged in but on dashboard
      console.log('[Navigator] Initial route: no user on protected page, redirecting to login');
      this.redirectToLogin();
    }
  }

  /**
   * Redirect to appropriate dashboard based on user role
   */
  async redirectToDashboard(user) {
    if (this.redirectInProgress) return;
    this.redirectInProgress = true;

    try {
      const dashboardPath = getDashboardPath(user);
      console.log('[Navigator] Redirecting to dashboard:', dashboardPath, 'for role:', user.role);
      
      // Use replace to avoid back button issues
      window.location.replace(dashboardPath);
    } catch (error) {
      console.error('[Navigator] Error redirecting to dashboard:', error);
      this.redirectInProgress = false;
    }
  }

  /**
   * Redirect to login page
   */
  async redirectToLogin() {
    if (this.redirectInProgress) return;
    this.redirectInProgress = true;

    try {
      console.log('[Navigator] Redirecting to login');
      window.location.replace('login.html');
    } catch (error) {
      console.error('[Navigator] Error redirecting to login:', error);
      this.redirectInProgress = false;
    }
  }

  /**
   * Navigate to a specific page
   */
  async navigateTo(path) {
    const user = getCurrentUser();
    
    // Check if path requires authentication
    const isProtectedPath = path.includes('dashboard') || path.includes('admin');
    
    if (isProtectedPath && !user) {
      console.log('[Navigator] Navigation to protected page without user, redirecting to login');
      this.redirectToLogin();
      return;
    }

    console.log('[Navigator] Navigating to:', path);
    window.location.href = path;
  }

  /**
   * Get the current page URL
   */
  getCurrentPage() {
    return window.location.pathname;
  }
}

// Create singleton instance
const pageNavigator = new PageNavigator();

export default pageNavigator;
export { PageNavigator };
