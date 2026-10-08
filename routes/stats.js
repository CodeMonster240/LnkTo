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
async function renderList(req, res, page) {
  const stats = await Url.paginate({
    page,
    perPage: 10,
    q: (req.query.q || '').toString().slice(0, 100),
    sort: (req.query.sort || 'recent').toString().slice(0, 20),
    ownerTokenHash: req.ownerTokenHash,
  });
  res.render('stats', { stats });
}

router.get('/stats', async (req, res, next) => {
  try { await renderList(req, res, 1); } catch (err) { next(err); }
});
router.get('/stats/page/:page', async (req, res, next) => {
  try { await renderList(req, res, req.params.page); } catch (err) { next(err); }
});

// Per-link analytics page.
router.get('/stats/:code', async (req, res, next) => {
  try {
  const data = await Url.analytics(req.params.code, req.ownerTokenHash);
  if (!data) {
    return res.status(404).render('404', { missingCode: req.params.code });
  }
  res.render('analytics', { data });
  } catch (err) { next(err); }
});

// JSON endpoint — used by the analytics page to refresh without reload.
router.get('/api/stats/:code/data', async (req, res, next) => {
  try {
  const data = await Url.analytics(req.params.code, req.ownerTokenHash);
  if (!data) return res.status(404).json({ error: 'not found' });
  res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;
