// ---------------------------------------------------------------------------
// lib/code.js — random short-code generator with collision avoidance.
//
// Mirrors `url/views.py`:
//   chars = string.ascii_letters + string.digits   # 62 chars
//   length = 3
//   code = ''.join(choice(chars) for x in range(length))
//   while Url.query.filter_by(new=code).first() is not None:
//       code = ...
// ---------------------------------------------------------------------------
'use strict';

const { Url } = require('../db');

const CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 3;
const MAX_LENGTH = 50;

function generateOnce(length = CODE_LENGTH) {
  const bytes = require('crypto').randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CHARSET[bytes[i] % CHARSET.length];
  }
  return out;
}

/**
 * Generate a random unique code of the given length.
 * @param {number} length - Code length (3–50). Defaults to 3.
 * @param {number} maxAttempts - How many tries before giving up.
 * @returns {string} A unique short code.
 */
async function generateUniqueCode(length = CODE_LENGTH, maxAttempts = 2000) {
  const len = Math.min(Math.max(1, parseInt(length, 10) || CODE_LENGTH), MAX_LENGTH);
  for (let i = 0; i < maxAttempts; i += 1) {
    const code = generateOnce(len);
    if (!(await Url.findByCode(code))) {
      console.log('Your new code is:', code);
      return code;
    }
  }
  throw new Error(
    `Could not generate a unique ${len}-char short code after ${maxAttempts} attempts.`
  );
}

/**
 * Check whether a specific code (slug) is available for use.
 * @param {string} code - The proposed slug.
 * @returns {boolean} true if the code is NOT already taken.
 */
async function isCodeAvailable(code) {
  if (!code || typeof code !== 'string') return false;
  if (code.length > MAX_LENGTH) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(code)) return false;
  return !(await Url.findByCode(code));
}

module.exports = {
  generateUniqueCode,
  generateOnce,
  isCodeAvailable,
  CODE_LENGTH,
  MAX_LENGTH,
  CHARSET,
};
