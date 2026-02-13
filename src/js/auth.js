(function(exports) {
  // GitHub App OAuth Configuration — Standard Web Flow (CORS-enabled for GitHub Apps)
  const OAUTH_CONFIG = {
    clientId: 'Iv23lixLqM3xo88npTs4',
    scope: 'read:user',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token'
  };

  // Storage keys
  const TOKEN_KEY = 'zion_auth_token';
  const USERNAME_KEY = 'zion_username';
  const AVATAR_KEY = 'zion_avatar';

  // Helper: safe localStorage access
  function getStorage(key) {
    if (typeof localStorage === 'undefined') return null;
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function setStorage(key, value) {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(key, value); } catch (e) {}
  }
  function removeStorage(key) {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.removeItem(key); } catch (e) {}
  }

  /**
   * Initiate GitHub OAuth — redirects browser to GitHub authorization page.
   * After the user authorizes, GitHub redirects back with ?code= in the URL.
   */
  function initiateOAuth() {
    if (typeof window === 'undefined') return;
    var redirectUri = window.location.origin + window.location.pathname;
    var url = OAUTH_CONFIG.authorizeUrl +
      '?client_id=' + encodeURIComponent(OAUTH_CONFIG.clientId) +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&scope=' + encodeURIComponent(OAUTH_CONFIG.scope);
    window.location.href = url;
  }

  /**
   * Handle OAuth callback — checks for ?code= in URL, exchanges for token.
   * GitHub Apps support CORS on the token exchange endpoint.
   * @returns {Promise<string|null>} access token or null if no code present
   */
  async function handleCallback() {
    if (typeof window === 'undefined') return null;
    var params = new URLSearchParams(window.location.search);
    var code = params.get('code');

    // Also handle legacy ?token= for PAT-based auth
    var token = params.get('token');
    if (token) {
      setStorage(TOKEN_KEY, token);
      window.history.replaceState({}, document.title, window.location.pathname);
      return token;
    }

    if (!code) return null;

    // Clean the URL immediately
    window.history.replaceState({}, document.title, window.location.pathname);

    try {
      // Exchange code for access token (CORS-enabled for GitHub Apps)
      var res = await fetch(OAUTH_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: OAUTH_CONFIG.clientId,
          code: code
        })
      });

      if (!res.ok) {
        console.error('Token exchange failed:', res.status);
        return null;
      }

      var data = await res.json();
      if (data.access_token) {
        setStorage(TOKEN_KEY, data.access_token);
        // Fetch and store profile
        await getProfile(data.access_token);
        return data.access_token;
      } else {
        console.error('Token exchange error:', data.error, data.error_description);
        return null;
      }
    } catch (e) {
      console.error('OAuth callback error:', e);
      return null;
    }
  }

  /**
   * Fetch GitHub user profile
   */
  async function getProfile(token) {
    if (typeof fetch === 'undefined') throw new Error('fetch not available');
    var response = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!response.ok) throw new Error('GitHub API error: ' + response.status);
    var data = await response.json();
    setStorage(USERNAME_KEY, data.login);
    setStorage(AVATAR_KEY, data.avatar_url || '');
    return { username: data.login, avatar_url: data.avatar_url };
  }

  function isAuthenticated() { return !!getStorage(TOKEN_KEY); }
  function getUsername() { return getStorage(USERNAME_KEY); }
  function getToken() { return getStorage(TOKEN_KEY); }
  function setToken(token) { setStorage(TOKEN_KEY, token); }

  function loginAsGuest(username) {
    if (!username || typeof username !== 'string') return false;
    username = username.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (username.length < 1 || username.length > 39) return false;
    setStorage(TOKEN_KEY, 'guest_' + username);
    setStorage(USERNAME_KEY, username);
    setStorage(AVATAR_KEY, '');
    return true;
  }

  function logout() {
    removeStorage(TOKEN_KEY);
    removeStorage(USERNAME_KEY);
    removeStorage(AVATAR_KEY);
  }

  exports.OAUTH_CONFIG = OAUTH_CONFIG;
  exports.initiateOAuth = initiateOAuth;
  exports.handleCallback = handleCallback;
  exports.getProfile = getProfile;
  exports.isAuthenticated = isAuthenticated;
  exports.getUsername = getUsername;
  exports.getToken = getToken;
  exports.setToken = setToken;
  exports.loginAsGuest = loginAsGuest;
  exports.logout = logout;

})(typeof module !== 'undefined' ? module.exports : (window.Auth = {}));
