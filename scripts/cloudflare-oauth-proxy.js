/**
 * ZION OAuth Proxy — Cloudflare Worker
 *
 * Proxies the GitHub OAuth token exchange request to bypass CORS restrictions.
 * GitHub does not send Access-Control-Allow-Origin headers on the token endpoint,
 * so browser-based apps need a server-side proxy for the code→token exchange.
 *
 * Deploy: Cloudflare Dashboard → Workers & Pages → Create → Hello World → Edit Code → paste this → Deploy
 */

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

    // Forward the token exchange request to GitHub
    const body = await request.text();
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body
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
