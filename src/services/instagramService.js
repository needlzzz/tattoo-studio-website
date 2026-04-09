'use strict';

const fetch = require('node-fetch');

let cache = null;
let cacheExpiry = 0;

const TTL_MS = () => parseInt(process.env.INSTAGRAM_CACHE_TTL_SECONDS || '900', 10) * 1000;
const FIELDS = 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp';

/**
 * Refresh the Instagram long-lived access token (valid ~60 days, refresh monthly).
 * Call this periodically (e.g. once a day) — here it is done lazily when cache is stale.
 */
async function refreshTokenIfNeeded() {
  // Instagram long-lived tokens are refreshed by calling the refresh endpoint.
  // We only attempt this when the cache is actually being refreshed to avoid
  // unnecessary API calls.
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return;

  try {
    const url = new URL('https://graph.instagram.com/refresh_access_token');
    url.searchParams.set('grant_type', 'ig_refresh_token');
    url.searchParams.set('access_token', token);

    const resp = await fetch(url.toString());
    if (!resp.ok) {
      console.warn('[Instagram] Token refresh failed:', resp.status, await resp.text());
      return;
    }
    const data = await resp.json();
    if (data.access_token) {
      process.env.INSTAGRAM_ACCESS_TOKEN = data.access_token;
      console.log('[Instagram] Access token refreshed. Expires in', data.expires_in, 'seconds.');
    }
  } catch (err) {
    console.warn('[Instagram] Token refresh error:', err.message);
  }
}

/**
 * Fetch Instagram media feed, using server-side cache.
 * Returns an array of media objects.
 */
async function getFeed(maxCount) {
  const now = Date.now();
  if (cache && now < cacheExpiry) {
    return cache;
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;

  if (!token || !userId) {
    throw new Error('Instagram credentials not configured.');
  }

  // Attempt token refresh before fetching new data
  await refreshTokenIfNeeded();

  const url = new URL(`https://graph.instagram.com/${userId}/media`);
  url.searchParams.set('fields', FIELDS);
  url.searchParams.set('limit', String(maxCount || 24));
  url.searchParams.set('access_token', process.env.INSTAGRAM_ACCESS_TOKEN);

  const resp = await fetch(url.toString());
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Instagram API error ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  const items = (data.data || []).filter(
    (item) => item.media_type === 'IMAGE' || item.media_type === 'CAROUSEL_ALBUM'
  );

  cache = items;
  cacheExpiry = now + TTL_MS();
  return items;
}

module.exports = { getFeed };
