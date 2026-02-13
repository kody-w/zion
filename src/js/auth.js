(function(exports) {
  // GitHub OAuth Configuration — Device Flow (no server needed)
  const OAUTH_CONFIG = {
    clientId: 'Ov23liwGjahyIYDaIB3p',
    scope: 'read:user'
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

  // Device Flow state
  let deviceFlowInterval = null;

  /**
   * Initiate GitHub Device Flow OAuth.
   * Shows a code to the user, they enter it at github.com/login/device,
   * and we poll until they authorize.
   * @param {function} onStatus - callback({stage, userCode, verificationUri, error})
   * @returns {Promise<{username, avatar_url}>}
   */
  async function initiateOAuth(onStatus) {
    if (typeof fetch === 'undefined') {
      throw new Error('fetch not available');
    }

    onStatus = onStatus || function() {};

    // Step 1: Request device code
    onStatus({ stage: 'requesting' });

    const codeRes = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: OAUTH_CONFIG.clientId,
        scope: OAUTH_CONFIG.scope
      })
    });

    if (!codeRes.ok) {
      const err = 'Failed to start device flow: ' + codeRes.status;
      onStatus({ stage: 'error', error: err });
      throw new Error(err);
    }

    const codeData = await codeRes.json();
    // codeData has: device_code, user_code, verification_uri, expires_in, interval

    // Step 2: Show user the code
    onStatus({
      stage: 'waiting',
      userCode: codeData.user_code,
      verificationUri: codeData.verification_uri
    });

    // Step 3: Poll for token
    const pollInterval = (codeData.interval || 5) * 1000;
    const expiresAt = Date.now() + (codeData.expires_in || 900) * 1000;

    return new Promise((resolve, reject) => {
      deviceFlowInterval = setInterval(async () => {
        if (Date.now() > expiresAt) {
          clearInterval(deviceFlowInterval);
          deviceFlowInterval = null;
          onStatus({ stage: 'error', error: 'Code expired. Try again.' });
          reject(new Error('Device code expired'));
          return;
        }

        try {
          const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              client_id: OAUTH_CONFIG.clientId,
              device_code: codeData.device_code,
              grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
            })
          });

          const tokenData = await tokenRes.json();

          if (tokenData.access_token) {
            clearInterval(deviceFlowInterval);
            deviceFlowInterval = null;

            // Store token
            setStorage(TOKEN_KEY, tokenData.access_token);

            // Fetch profile
            const profile = await getProfile(tokenData.access_token);
            onStatus({ stage: 'complete', username: profile.username });
            resolve(profile);
          } else if (tokenData.error === 'authorization_pending') {
            // Still waiting — keep polling
          } else if (tokenData.error === 'slow_down') {
            // Back off — we'll just wait for next interval
          } else if (tokenData.error === 'expired_token') {
            clearInterval(deviceFlowInterval);
            deviceFlowInterval = null;
            onStatus({ stage: 'error', error: 'Code expired. Try again.' });
            reject(new Error('Device code expired'));
          } else if (tokenData.error === 'access_denied') {
            clearInterval(deviceFlowInterval);
            deviceFlowInterval = null;
            onStatus({ stage: 'error', error: 'Authorization denied.' });
            reject(new Error('Access denied'));
          }
        } catch (e) {
          // Network error, keep retrying
        }
      }, pollInterval);
    });
  }

  /**
   * Cancel an in-progress device flow
   */
  function cancelOAuth() {
    if (deviceFlowInterval) {
      clearInterval(deviceFlowInterval);
      deviceFlowInterval = null;
    }
  }

  /**
   * Handle URL callback (?token= for PAT-based auth)
   */
  function handleCallback() {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setStorage(TOKEN_KEY, token);
      window.history.replaceState({}, document.title, window.location.pathname);
      return token;
    }
    return null;
  }

  /**
   * Fetch GitHub user profile
   */
  async function getProfile(token) {
    if (typeof fetch === 'undefined') throw new Error('fetch not available');
    const response = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!response.ok) throw new Error('GitHub API error: ' + response.status);
    const data = await response.json();
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
  exports.cancelOAuth = cancelOAuth;
  exports.handleCallback = handleCallback;
  exports.getProfile = getProfile;
  exports.isAuthenticated = isAuthenticated;
  exports.getUsername = getUsername;
  exports.getToken = getToken;
  exports.setToken = setToken;
  exports.loginAsGuest = loginAsGuest;
  exports.logout = logout;

})(typeof module !== 'undefined' ? module.exports : (window.Auth = {}));
