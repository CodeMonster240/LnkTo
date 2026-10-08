// ---------------------------------------------------------------------------
// routes/delete.js — POST /delete/:code
//
// Hard-deletes a short link and cascades its hits (via FK ON DELETE
// CASCADE). After deletion the short code is freed and can be re-used
// by a future submission. Bot protection is intentionally light here —
// only the browser that created the link can delete it.
// ---------------------------------------------------------------------------
'use strict';

const express = require('express');
const { Url } = require('../db');

const router = express.Router();

router.post('/delete/:code', async (req, res, next) => {
  const code = req.params.code;
  const removed = await Url.deleteByCode(code, req.ownerTokenHash);
  if (!removed) {
    return res.status(404).render('404', { missingCode: code });
  }
  res.redirect('/stats?deleted=' + encodeURIComponent(code));
});

module.exports = router;
