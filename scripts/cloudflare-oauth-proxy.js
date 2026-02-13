/**
 * ZION OAuth Proxy — Cloudflare Worker
 *
 * Proxies the GitHub OAuth token exchange request to bypass CORS restrictions.
 * GitHub does not send Access-Control-Allow-Origin headers on the token endpoint,
 * so browser-based apps need a server-side proxy for the code→token exchange.
 *
 * The client_secret is kept server-side here and never sent to the browser.
 *
 * Deploy: Cloudflare Dashboard → Workers & Pages → Create → Hello World → Edit Code → paste this → Deploy
 */

const CLIENT_SECRET = '60a03ed5958251c0ef40560d55eae251a117843c';

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'https://kody-w.github.io',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
        }
      });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Read client_id and code from the request, append client_secret server-side
    const body = await request.text();
    const fullBody = body + '&client_secret=' + encodeURIComponent(CLIENT_SECRET);

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: fullBody
    });

    const data = await res.text();
    return new Response(data, {
      headers: {
        'Access-Control-Allow-Origin': 'https://kody-w.github.io',
        'Content-Type': 'application/json'
      }
    });
  }
};
