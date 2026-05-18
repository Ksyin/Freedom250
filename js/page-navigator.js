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
    const isDashboardPage = currentPagePath.includes('dashboard');

    if (!isAuthenticated && isDashboardPage) {
      this.redirectToLogin();
    }
    
    // Note: Automatic redirection from login/register to dashboard is REMOVED
    // to prevent "auto-login" traps and allow users to switch accounts.
    // Redirection after login should now be handled explicitly by the login page.
  }

  /**
   * Handle initial page load routing
   */
  handleInitialRoute(user, currentPagePath) {
    const isDashboardPage = currentPagePath.includes('dashboard');

    if (!user && isDashboardPage) {
      this.redirectToLogin();
    }
    
    // Note: Removed automatic redirect from login page to dashboard on load.
    // This allows users who are already logged in to see the login page if they choose,
    // which is helpful for logging out or switching accounts.
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
