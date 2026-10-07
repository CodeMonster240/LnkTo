// ---------------------------------------------------------------------------
// routes/redirect.js — GET /:code
//
// Records the hit (referrer, user-agent, device) and 302-redirects to
// the stored long URL. 404s if the code doesn't exist. We also skip
// recording for any path that looks like an internal/static route —
// the catch-all router means reserved names can sneak in here.
// ---------------------------------------------------------------------------
'use strict';

const express = require('express');
const { Url } = require('../db');
const { parseUserAgent } = require('../lib/parseUA');
const { broadcast } = require('../lib/wsServer');

const router = express.Router();

const RESERVED = new Set(['static', 'stats', 'delete', 'api', 'admin', 'settings']);

router.get('/:code', (req, res, next) => {
  const code = req.params.code;
  if (RESERVED.has(code)) return next();
  if (!/^[A-Za-z0-9_-]{1,50}$/.test(code)) return next();

  const existing = Url.findWithSettings(code);
  if (!existing) {
    return next();
  }

  const ua = parseUserAgent(req.get('user-agent') || '');
  const referrer = req.get('referer') || req.get('referrer') || '';

  const updated = Url.recordHit(code, {
    referrer,
    userAgent: req.get('user-agent') || '',
    device: ua.device,
  });

  // --- WebSocket broadcast: tell every live tab about the new hit ---
  const hits = updated ? updated.hits : existing.hits;
  const payload = {
    code,
    hits,
    old: existing.old,
    ts: new Date().toISOString(),
  };
  // "allLinks" topic — stats page updates every row's hit count.
  broadcast('allLinks', payload);
  // "link:<code>" topic — analytics page for this specific link.
  broadcast('link:' + code, payload);

  // --- Settings: render an interstitial redirect page? ---
  if (existing.showRedirectPage) {
    const domain = extractDomain(existing.old);
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    return res.render('redirect', {
      code,
      old: existing.old,
      duration: existing.redirectDuration || 3,
      showThumbnail: !!existing.showThumbnail,
      thumbnailUrl: existing.showThumbnail ? faviconUrl : null,
      domain,
    });
  }

  return res.redirect(existing.old);
});

/**
 * Extract the bare domain (no protocol, no path) from a URL string.
 */
function extractDomain(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return u.hostname;
  } catch (_e) {
    return rawUrl.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  }
}

module.exports = router;
