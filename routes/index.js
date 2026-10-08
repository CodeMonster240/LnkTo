// ---------------------------------------------------------------------------
// routes/index.js — GET/POST /   (the home form + submission handler).
//
// Mirrors `index()` in url/views.py:
//   - On POST: generate a unique 3-char code, validate the URL, run the
//     bot checks (honeypot + time-based), persist the row, render success.
//   - On GET:  render the empty form.
//
// Spam protection (replaces the old ALTCHA proof-of-work):
//   1. Honeypot field "website_url" — hidden from humans via CSS, but
//      visible to dumb bots that auto-fill every input. If it's filled
//      in, we silently 400 and discard the request.
//   2. Time-based check — the form embeds a `renderedAt` timestamp
//      (ms since epoch). If the POST comes back in < MIN_SUBMIT_MS, we
//      reject. Humans always take longer; bots don't.
// ---------------------------------------------------------------------------
'use strict';

const express = require('express');
const { Url } = require('../db');
const { validateUrl, normaliseUrl } = require('../lib/validate');

const router = express.Router();

const MIN_SUBMIT_MS = 2000; // humans take > 2s to fill a form; bots don't

router.get('/', (req, res) => {
  res.render('index', {
    form: { errors: {} },
    renderedAt: Date.now(),
  });
});

router.post('/', async (req, res) => {
  // 1) Honeypot — silently reject if a bot filled in the hidden field.
  //    We pretend the request succeeded so the bot doesn't retry.
  const honeypot = (req.body && req.body.website_url) || '';
  if (honeypot.trim() !== '') {
    console.log('[honeypot] bot submission blocked, pretending success');
    return res.status(200).send('OK');
  }

       // 2) Generate or use the custom short code.
  const customCode = (req.body && req.body.custom_code || '').trim();
  const codeLen = parseInt((req.body && req.body.code_length) || '3', 10);

  let code;
  if (customCode) {
    // User supplied a custom slug — validate characters and availability.
    if (!/^[A-Za-z0-9_-]{3,50}$/.test(customCode)) {
      return res.status(400).render('index', {
        form: { errors: { custom_code: 'Custom code must be 3-50 chars (letters, digits, hyphens, underscores).' } },
        renderedAt: Date.now(),
      });
    }
    const { isCodeAvailable } = require('../lib/code');
    if (!(await isCodeAvailable(customCode))) {
      return res.status(400).render('index', {
        form: { errors: { custom_code: `That custom link /${customCode} is already taken. Pick another.` } },
        renderedAt: Date.now(),
      });
    }
    code = customCode;
  } else {
    // Generate a random unique code of the requested length.
    const { generateUniqueCode, MAX_LENGTH } = require('../lib/code');
    const safeLen = Math.min(Math.max(3, codeLen), MAX_LENGTH);
    try {
      code = await generateUniqueCode(safeLen);
    } catch (err) {
      console.error(err);
      return res.status(500).send('Could not allocate a short code.');
    }
  }

  // 3) Validate the URL field.
  const rawUrl = req.body && req.body.old;
  const urlError = validateUrl(rawUrl);
  if (urlError) {
    return res.status(400).render('index', {
      form: { errors: { old: urlError } },
      renderedAt: Date.now(),
    });
  }

  // 4) Time-based check — reject submissions faster than a human could
  //    plausibly type. Bots that re-POST the page instantly get blocked.
  const renderedAt = parseInt((req.body && req.body.renderedAt) || '0', 10);
  const elapsed = Date.now() - renderedAt;
  if (!renderedAt || elapsed < MIN_SUBMIT_MS) {
    return res.status(400).render('index', {
      form: {
        errors: {
          _form:
            'Please take a moment to fill out the form before submitting.',
        },
      },
      renderedAt: Date.now(),
    });
  }

  // 5) Persist.
  const old = normaliseUrl(rawUrl);
  const showRedirectPage = (req.body && req.body.show_redirect_page) === 'on' || req.body.show_redirect_page === '1';
  const redirectDuration = parseInt((req.body && req.body.redirect_duration) || '3', 10);
  const showThumbnail = (req.body && req.body.show_thumbnail) === 'on' || req.body.show_thumbnail === '1';

  const row = await Url.create({
    old,
    new: code,
    ownerTokenHash: req.ownerTokenHash,
    settings: {
      showRedirectPage,
      redirectDuration: Math.min(Math.max(1, redirectDuration), 30),
      showThumbnail,
    },
  });

  // 6) Broadcast the new link over WebSocket so live stats pages update.
  const { broadcastAll } = require('../lib/wsServer');
  broadcastAll({
    type: 'newLink',
    payload: { code: row.new, old: row.old, hits: 0, created: row.created },
  });

  return res.render('success', { code: row.new, old: row.old });
});

module.exports = router;
