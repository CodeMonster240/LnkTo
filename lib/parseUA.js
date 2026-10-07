// ---------------------------------------------------------------------------
// lib/parseUA.js — best-effort User-Agent parser for analytics.
//
// We deliberately avoid pulling in a UA library (like `ua-parser-js`).
// For the analytics view we just need three coarse buckets:
// "Desktop", "Mobile", "Tablet", "Bot", and a short family label
// ("Chrome", "Safari", "Firefox", "Edge", "curl", "Googlebot", ...).
// The header strings are well-known enough to match with a small set of
// ordered regex tests.
// ---------------------------------------------------------------------------
'use strict';

function parseUserAgent(ua) {
  const out = { device: 'Unknown', family: 'Unknown' };
  if (!ua || typeof ua !== 'string') return out;
  const s = ua.toLowerCase();

  // Bots first — bots usually also match "mozilla" so we have to check
  // these patterns before the browser families.
  if (
    /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|preview/.test(
      s
    )
  ) {
    out.device = 'Bot';
    out.family = firstMatch(ua, [
      'Googlebot',
      'Bingbot',
      'Slurp',
      'DuckDuckBot',
      'Baiduspider',
      'YandexBot',
      'facebookexternalhit',
      'Twitterbot',
      'Discordbot',
      'LinkedInBot',
      'curl',
      'wget',
      'python-requests',
      'Go-http-client',
    ]);
    return out;
  }

  // Device class. Tablets are checked before phones because iPad/Android
  // tablets often include "Mobile" in their UA.
  if (/ipad|tablet|playbook|silk/.test(s)) {
    out.device = 'Tablet';
  } else if (
    /iphone|ipod|android.*mobile|mobile|windows phone|blackberry|opera mini/.test(
      s
    )
  ) {
    out.device = 'Mobile';
  } else {
    out.device = 'Desktop';
  }

  out.family = firstMatch(ua, [
    'Edg',
    'OPR',
    'Opera',
    'Vivaldi',
    'Brave',
    'Chrome',
    'Firefox',
    'Safari',
    'curl',
    'wget',
    'Python',
    'Go-http-client',
  ]);

  return out;
}

function firstMatch(s, candidates) {
  for (const c of candidates) {
    if (s.includes(c)) return c;
  }
  return 'Unknown';
}

module.exports = { parseUserAgent };
