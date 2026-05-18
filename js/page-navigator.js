// js/page-navigator.js - Handles page navigation and auth-based routing

import { getCurrentUser, onAuthStateChange, getDashboardPath, ROLES, initAuth } from './auth.js';

class PageNavigator {
  constructor() {
    this.isInitialized = false;
    this.redirectInProgress = false;
  }

  /**
   * Initialize the navigator
   */
  async initialize() {
    if (this.isInitialized) return;
    
    // Wait for Auth to be fully ready before any routing decisions
    const user = await initAuth();
    this.isInitialized = true;

    // Setup listener for future state changes
    onAuthStateChange((newUser, isAuthenticated) => {
      this.handleAuthStateChange(newUser, isAuthenticated);
    });

    const currentPagePath = window.location.pathname;
    this.handleInitialRoute(user, currentPagePath);
  }

  /**
   * Handle auth state changes - redirect if necessary
   */
  async handleAuthStateChange(user, isAuthenticated) {
    if (this.redirectInProgress || !this.isInitialized) return;
    
    const currentPagePath = window.location.pathname;
    const isAuthPage = currentPagePath.includes('login') || currentPagePath.includes('register');
    const isDashboardPage = currentPagePath.includes('dashboard');

    if (isAuthenticated && user) {
      if (isAuthPage) {
        // Only redirect if NOT on a special staff registration flow (handled by URL params usually)
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.has('staffCode')) {
          this.redirectToDashboard(user);
        }
      }
    } else if (!isAuthenticated) {
      if (isDashboardPage) {
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
    const urlParams = new URLSearchParams(window.location.search);

    if (user && isAuthPage) {
      if (!urlParams.has('staffCode')) {
        this.redirectToDashboard(user);
      }
    } else if (!user && isDashboardPage) {
      this.redirectToLogin();
    }
  }

  async redirectToDashboard(user) {
    if (this.redirectInProgress) return;
    const target = getDashboardPath(user);
    const current = window.location.pathname;
    
    // Prevent self-redirect loop
    if (current.includes(target)) return;

    this.redirectInProgress = true;
    window.location.replace(target);
  }

  async redirectToLogin() {
    if (this.redirectInProgress) return;
    const current = window.location.pathname;
    if (current.includes('login.html')) return;

    this.redirectInProgress = true;
    window.location.replace('login.html');
  }
}

const pageNavigator = new PageNavigator();
export default pageNavigator;
