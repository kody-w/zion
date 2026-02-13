(function(exports) {
  // GitHub App OAuth Configuration — Standard Web Flow (CORS-enabled for GitHub Apps)
  const OAUTH_CONFIG = {
    clientId: 'Iv23lixLqM3xo88npTs4',
    scope: 'read:user',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://zion-oauth.kwildfeuer.workers.dev'
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
      // Use form-urlencoded to avoid CORS preflight (simple request)
      var res = await fetch(OAUTH_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        body: 'client_id=' + encodeURIComponent(OAUTH_CONFIG.clientId) +
              '&code=' + encodeURIComponent(code)
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

  // ========================================================================
  // PLAYER DATA PERSISTENCE — Save/load player state across sessions
  // ========================================================================

  var PLAYER_DATA_KEY = 'zion_player_data';
  var PLAYER_PREFS_KEY = 'zion_player_prefs';

  /**
   * Save player game data to localStorage
   * @param {Object} data - Player state to save
   */
  function savePlayerData(data) {
    if (!data) return;
    try {
      var saveData = {
        version: 2,
        ts: Date.now(),
        username: getUsername(),
        inventory: data.inventory || null,
        spark: data.spark || 0,
        position: data.position || null,
        zone: data.zone || 'nexus',
        skills: data.skills || null,
        questState: data.questState || null,
        achievements: data.achievements || null,
        guild: data.guild || null,
        discoveredSecrets: data.discoveredSecrets || [],
        warmth: data.warmth || 0,
        playTime: data.playTime || 0,
        lastSave: Date.now()
      };
      setStorage(PLAYER_DATA_KEY, JSON.stringify(saveData));
    } catch (e) {
      console.warn('Failed to save player data:', e);
    }
  }

  /**
   * Load player game data from localStorage
   * @returns {Object|null} Saved player data or null
   */
  function loadPlayerData() {
    try {
      var raw = getStorage(PLAYER_DATA_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      // Verify it belongs to current user
      if (data.username !== getUsername()) return null;
      return data;
    } catch (e) {
      console.warn('Failed to load player data:', e);
      return null;
    }
  }

  /**
   * Save player preferences
   * @param {Object} prefs - {volume, musicVolume, sfxVolume, quality, chatVisible, minimapVisible, showFPS}
   */
  function savePreferences(prefs) {
    try {
      setStorage(PLAYER_PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {}
  }

  /**
   * Load player preferences
   * @returns {Object} Saved preferences or defaults
   */
  function loadPreferences() {
    try {
      var raw = getStorage(PLAYER_PREFS_KEY);
      if (!raw) return getDefaultPreferences();
      return JSON.parse(raw);
    } catch (e) {
      return getDefaultPreferences();
    }
  }

  function getDefaultPreferences() {
    return {
      volume: 0.5,
      musicVolume: 0.3,
      sfxVolume: 0.5,
      quality: 'medium',
      chatVisible: true,
      minimapVisible: true,
      showFPS: false,
      controlsHint: true
    };
  }

  /**
   * Get avatar URL for display
   * @returns {string} Avatar URL or empty string
   */
  function getAvatarUrl() {
    return getStorage(AVATAR_KEY) || '';
  }

  /**
   * Check if user is a guest
   * @returns {boolean}
   */
  function isGuest() {
    var token = getStorage(TOKEN_KEY);
    return token ? token.startsWith('guest_') : false;
  }

  /**
   * Get time since last save
   * @returns {number} Milliseconds since last save, or Infinity if never saved
   */
  function getTimeSinceLastSave() {
    var data = loadPlayerData();
    if (!data || !data.lastSave) return Infinity;
    return Date.now() - data.lastSave;
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
  exports.savePlayerData = savePlayerData;
  exports.loadPlayerData = loadPlayerData;
  exports.savePreferences = savePreferences;
  exports.loadPreferences = loadPreferences;
  exports.getDefaultPreferences = getDefaultPreferences;
  exports.getAvatarUrl = getAvatarUrl;
  exports.isGuest = isGuest;
  exports.getTimeSinceLastSave = getTimeSinceLastSave;

})(typeof module !== 'undefined' ? module.exports : (window.Auth = {}));
