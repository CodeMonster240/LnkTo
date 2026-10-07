// ---------------------------------------------------------------------------
// routes/delete.js — POST /delete/:code
//
// Hard-deletes a short link and cascades its hits (via FK ON DELETE
// CASCADE). After deletion the short code is freed and can be re-used
// by a future submission. Bot protection is intentionally light here —
// anyone who has the URL can delete (matches the spirit of the app:
// it's a single-user public tool, not multi-tenant).
// ---------------------------------------------------------------------------
'use strict';

const express = require('express');
const { Url } = require('../db');

const router = express.Router();

router.post('/delete/:code', (req, res) => {
  const code = req.params.code;
  const removed = Url.deleteByCode(code);
  if (!removed) {
    return res.status(404).render('404', { missingCode: code });
  }
  res.redirect('/stats?deleted=' + encodeURIComponent(code));
});

module.exports = router;
