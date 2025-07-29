// token-manager.js - Extended Session Token Management
class TokenManager {
  constructor() {
    this.refreshTimer = null;
    this.sessionDuration = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
    this.refreshInterval = 45 * 60 * 1000; // Refresh every 45 minutes
    this.sessionStartTime = null;
  }

  // Initialize token management
  init() {
    console.log('🔐 Initializing extended token management (5 hour sessions)');
    
    // Check if we have an existing valid session
    const sessionStart = localStorage.getItem('sessionStartTime');
    const currentTime = Date.now();
    
    if (sessionStart) {
      const sessionAge = currentTime - parseInt(sessionStart);
      if (sessionAge < this.sessionDuration) {
        // Session is still valid, resume it
        this.sessionStartTime = parseInt(sessionStart);
        this.startTokenRefresh();
        console.log(`✅ Resumed existing session (${Math.round((this.sessionDuration - sessionAge) / 60000)} minutes remaining)`);
        return true;
      } else {
        // Session expired, clear storage
        this.clearSession();
        console.log('⏰ Previous session expired, cleared storage');
      }
    }
    
    return false;
  }

  // Start a new session
  startSession(idToken) {
    const currentTime = Date.now();
    this.sessionStartTime = currentTime;
    
    // Store session info
    localStorage.setItem('token', idToken);
    localStorage.setItem('sessionStartTime', currentTime.toString());
    localStorage.setItem('lastTokenRefresh', currentTime.toString());
    
    // Start the refresh cycle
    this.startTokenRefresh();
    
    console.log('🚀 Started new 5-hour session');
    this.showSessionInfo();
  }

  // Start token refresh cycle
  startTokenRefresh() {
    // Clear any existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Set up refresh interval
    this.refreshTimer = setInterval(() => {
      this.refreshToken();
    }, this.refreshInterval);

    console.log(`🔄 Token refresh scheduled every ${this.refreshInterval / 60000} minutes`);
  }

  // Refresh the Firebase token
  async refreshToken() {
    try {
      // Check if session has expired
      if (!this.isSessionValid()) {
        console.log('⏰ Session expired, logging out');
        this.logout();
        return;
      }

      if (!window.firebaseAuth || !window.firebaseAuth.currentUser) {
        console.warn('❌ No Firebase user available for token refresh');
        return;
      }

      console.log('🔄 Refreshing Firebase token...');
      
      // Force token refresh
      const newToken = await window.firebaseAuth.currentUser.getIdToken(true);
      
      // Update stored token
      localStorage.setItem('token', newToken);
      localStorage.setItem('lastTokenRefresh', Date.now().toString());
      
      console.log('✅ Token refreshed successfully');
      this.showSessionInfo();

    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      
      // If refresh fails, try one more time after a short delay
      setTimeout(() => {
        this.refreshToken();
      }, 5000);
    }
  }

  // Check if current session is still valid
  isSessionValid() {
    if (!this.sessionStartTime) {
      return false;
    }
    
    const sessionAge = Date.now() - this.sessionStartTime;
    return sessionAge < this.sessionDuration;
  }

  // Get remaining session time
  getRemainingTime() {
    if (!this.isSessionValid()) {
      return 0;
    }
    
    const sessionAge = Date.now() - this.sessionStartTime;
    return Math.max(0, this.sessionDuration - sessionAge);
  }

  // Show session information
  showSessionInfo() {
    const remaining = this.getRemainingTime();
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    console.log(`⏱️ Session time remaining: ${hours}h ${minutes}m`);
  }

  // Clear session data
  clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('sessionStartTime');
    localStorage.removeItem('lastTokenRefresh');
    localStorage.removeItem('role');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    this.sessionStartTime = null;
  }

  // Logout and clear session
  logout() {
    console.log('🚪 Logging out and clearing extended session');
    this.clearSession();
    
    // Sign out from Firebase
    if (window.firebaseAuth) {
      window.firebaseAuth.signOut();
    }
    
    // Redirect to auth page
    window.location.href = '/auth.html';
  }

  // Extend current session (reset timer)
  extendSession() {
    if (this.isSessionValid()) {
      this.sessionStartTime = Date.now();
      localStorage.setItem('sessionStartTime', this.sessionStartTime.toString());
      console.log('⏰ Session extended by 5 hours');
      this.showSessionInfo();
    }
  }

  // Get current token with auto-refresh if needed
  async getValidToken() {
    if (!this.isSessionValid()) {
      console.log('Session expired');
      this.logout();
      return null;
    }

    const token = localStorage.getItem('token');
    const lastRefresh = localStorage.getItem('lastTokenRefresh');
    const now = Date.now();

    // If token is older than 45 minutes, refresh it
    if (lastRefresh && (now - parseInt(lastRefresh)) > this.refreshInterval) {
      await this.refreshToken();
      return localStorage.getItem('token');
    }

    return token;
  }
}

// Create global instance
window.tokenManager = new TokenManager();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TokenManager;
}
