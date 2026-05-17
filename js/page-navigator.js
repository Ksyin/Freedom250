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
    const hasPortalHash = window.location.hash.length > 1;

    console.log('[Navigator] Handling auth change:', {
      isAuthenticated,
      isAuthPage,
      isDashboardPage,
      userRole: user?.role,
      hasPortalHash
    });

    if (isAuthenticated && user) {
      if (isAuthPage) {
        // If they are a participant and trying to access a staff portal hash, 
        // stay on login page so they can switch accounts.
        // If they are NOT a participant (i.e. staff) OR there is no hash, redirect.
        const isParticipant = (user.role === ROLES.PARTICIPANT || !user.role);
        
        if (hasPortalHash && isParticipant) {
          console.log('[Navigator] Participant on portal-specific page, allowing account switch');
        } else {
          console.log('[Navigator] User authenticated, redirecting to dashboard');
          this.redirectToDashboard(user);
        }
      }
    } else {
      // User is not authenticated
      if (isDashboardPage || (!isAuthPage && !currentPagePath.includes('index') && currentPagePath !== '/')) {
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
    const hasPortalHash = window.location.hash.length > 1;

    if (user && isAuthPage) {
      const isParticipant = (user.role === ROLES.PARTICIPANT || !user.role);
      if (!(hasPortalHash && isParticipant)) {
        console.log('[Navigator] Initial route: redirecting to dashboard');
        this.redirectToDashboard(user);
      }
    } else if (!user && isDashboardPage) {
      console.log('[Navigator] Initial route: redirecting to login');
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
    const isProtectedPath = path.includes('dashboard') || path.includes('admin');
    
    if (isProtectedPath && !user) {
      this.redirectToLogin();
      return;
    }

    window.location.href = path;
  }

  getCurrentPage() {
    return window.location.pathname;
  }
}

const pageNavigator = new PageNavigator();
export default pageNavigator;
export { PageNavigator };
