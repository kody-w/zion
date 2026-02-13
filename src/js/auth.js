(function(exports) {
  // GitHub OAuth Configuration
  const OAUTH_CONFIG = {
    clientId: 'ZION_GITHUB_CLIENT_ID',
    redirectUri: typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '',
    scope: 'read:user'
  };

  // Storage keys
  const TOKEN_KEY = 'zion_auth_token';
  const USERNAME_KEY = 'zion_username';
  const AVATAR_KEY = 'zion_avatar';
  const CODE_KEY = 'zion_oauth_code';

  // Helper: safe localStorage access
  function getStorage(key) {
    if (typeof localStorage === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage not available:', e);
      return null;
    }
  }

  function setStorage(key, value) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  }

  function removeStorage(key) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  }

  /**
   * Initiate GitHub OAuth flow
   * Redirects to GitHub authorization page
   */
  function initiateOAuth() {
    if (typeof window === 'undefined') {
      console.warn('OAuth requires browser environment');
      return;
    }

    const params = new URLSearchParams({
      client_id: OAUTH_CONFIG.clientId,
      redirect_uri: OAUTH_CONFIG.redirectUri,
      scope: OAUTH_CONFIG.scope
    });

    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   * Checks URL for ?code= or ?token= parameter
   * NOTE: Full token exchange requires a server proxy due to CORS.
   * For development, you can use ?token= parameter with a GitHub Personal Access Token.
   *
   * @returns {string|null} - OAuth code or token if found
   */
  function handleCallback() {
    if (typeof window === 'undefined') {
      console.warn('handleCallback requires browser environment');
      return null;
    }

    const params = new URLSearchParams(window.location.search);

    // Check for direct token (testing/PAT mode)
    const token = params.get('token');
    if (token) {
      setStorage(TOKEN_KEY, token);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return token;
    }

    // Check for OAuth code
    const code = params.get('code');
    if (code) {
      setStorage(CODE_KEY, code);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // NOTE: Code needs to be exchanged for token via server proxy
      console.log('OAuth code received. Exchange this for a token via your server proxy.');
      return code;
    }

    return null;
  }

  /**
   * Fetch GitHub user profile
   * @param {string} token - GitHub access token
   * @returns {Promise<{username: string, avatar_url: string}>}
   */
  async function getProfile(token) {
    if (typeof fetch === 'undefined') {
      throw new Error('fetch not available');
    }

    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    // Store profile data
    setStorage(USERNAME_KEY, data.login);
    setStorage(AVATAR_KEY, data.avatar_url);

    return {
      username: data.login,
      avatar_url: data.avatar_url
    };
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  function isAuthenticated() {
    return !!getStorage(TOKEN_KEY);
  }

  /**
   * Get stored username
   * @returns {string|null}
   */
  function getUsername() {
    return getStorage(USERNAME_KEY);
  }

  /**
   * Get stored token
   * @returns {string|null}
   */
  function getToken() {
    return getStorage(TOKEN_KEY);
  }

  /**
   * Set token (for PAT-based auth by AI agents)
   * @param {string} token
   */
  function setToken(token) {
    setStorage(TOKEN_KEY, token);
  }

  /**
   * Log out and clear all auth data
   */
  function logout() {
    removeStorage(TOKEN_KEY);
    removeStorage(USERNAME_KEY);
    removeStorage(AVATAR_KEY);
    removeStorage(CODE_KEY);
  }

  // Export public API
  exports.OAUTH_CONFIG = OAUTH_CONFIG;
  exports.initiateOAuth = initiateOAuth;
  exports.handleCallback = handleCallback;
  exports.getProfile = getProfile;
  exports.isAuthenticated = isAuthenticated;
  exports.getUsername = getUsername;
  exports.getToken = getToken;
  exports.setToken = setToken;
  exports.logout = logout;

})(typeof module !== 'undefined' ? module.exports : (window.Auth = {}));
