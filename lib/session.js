// ---------------------------------------------------------------------------
// lib/session.js — persistent, per-browser ownership token.
// ---------------------------------------------------------------------------
'use strict';

const crypto = require('crypto');
const { IS_PROD } = require('../config');

const COOKIE_NAME = 'lnkto_session';
const MAX_AGE_MS = 10 * 365 * 24 * 60 * 60 * 1000;

function readCookie(header, name) {
  if (!header) return null;
  const prefix = `${name}=`;
  const value = header.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!value) return null;
  try {
    return decodeURIComponent(value.slice(prefix.length));
  } catch (_err) {
    return null;
  }
}

function ensureSession(req, res, next) {
  let token = readCookie(req.get('cookie'), COOKIE_NAME);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    token = crypto.randomBytes(32).toString('base64url');
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      maxAge: MAX_AGE_MS,
      path: '/',
    });
  }

  req.ownerTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  next();
}

module.exports = { ensureSession };
