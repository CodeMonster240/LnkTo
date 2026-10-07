// ---------------------------------------------------------------------------
// routes/stats.js
//   GET  /stats                 — list, paginated, with search + sort
//   GET  /stats/page/:page      — paginated list
//   GET  /stats/:code           — per-link analytics page
//   GET  /api/stats/:code/data  — JSON for progressive enhancement
// ---------------------------------------------------------------------------
'use strict';

const express = require('express');
const { Url } = require('../db');

const router = express.Router();

// List page (with optional search + sort query params).
function renderList(req, res, page) {
  const stats = Url.paginate({
    page,
    perPage: 10,
    q: (req.query.q || '').toString().slice(0, 100),
    sort: (req.query.sort || 'recent').toString().slice(0, 20),
  });
  res.render('stats', { stats });
}

router.get('/stats', (req, res) => renderList(req, res, 1));
router.get('/stats/page/:page', (req, res) => renderList(req, res, req.params.page));

// Per-link analytics page.
router.get('/stats/:code', (req, res) => {
  const data = Url.analytics(req.params.code);
  if (!data) {
    return res.status(404).render('404', { missingCode: req.params.code });
  }
  res.render('analytics', { data });
});

// JSON endpoint — used by the analytics page to refresh without reload.
router.get('/api/stats/:code/data', (req, res) => {
  const data = Url.analytics(req.params.code);
  if (!data) return res.status(404).json({ error: 'not found' });
  res.json(data);
});

module.exports = router;
