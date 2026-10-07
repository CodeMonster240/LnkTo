// ---------------------------------------------------------------------------
// routes/settings.js — per-link settings (redirect page, thumbnail, etc.)
//
//   GET  /settings/:code          — settings form page
//   POST /settings/:code          — save settings (redirects back to analytics)
//   GET  /api/check-code/:code    — JSON: { available: true/false }
// ---------------------------------------------------------------------------
'use strict';

const express = require('express');
const { Url } = require('../db');
const { isCodeAvailable } = require('../lib/code');

const router = express.Router();

// GET /settings/:code — settings page for a specific link.
router.get('/settings/:code', (req, res) => {
  const data = Url.analytics(req.params.code);
  if (!data) {
    return res.status(404).render('404', { missingCode: req.params.code });
  }
  const settings = Url.settings(req.params.code);
  res.render('settings', { code: req.params.code, data, settings });
});

// POST /settings/:code — save settings, redirect back to analytics.
router.post('/settings/:code', (req, res) => {
  const code = req.params.code;
  const existing = Url.findByCode(code);
  if (!existing) {
    return res.status(404).render('404', { missingCode: code });
  }

  const showRedirectPage =
    req.body.show_redirect_page === 'on' || req.body.show_redirect_page === '1';
  const redirectDuration =
    Math.min(Math.max(1, parseInt(req.body.redirect_duration || '3', 10)), 30);
  const showThumbnail =
    req.body.show_thumbnail === 'on' || req.body.show_thumbnail === '1';

  Url.updateSettings(code, {
    showRedirectPage,
    redirectDuration,
    showThumbnail,
  });

  res.redirect('/stats?msg=settings-saved');
});

// GET /api/check-code/:code — live availability check for the custom-link popup.
router.get('/api/check-code/:code', (req, res) => {
  const code = req.params.code;
  if (!/^[A-Za-z0-9_-]{3,50}$/.test(code)) {
    return res.json({ available: false, reason: 'Invalid characters or length' });
  }
  const available = isCodeAvailable(code);
  res.json({ available, reason: available ? null : 'Already taken' });
});

module.exports = router;