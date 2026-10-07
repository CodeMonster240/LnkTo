// ---------------------------------------------------------------------------
// lib/validate.js — URL validation without a forms library.
// ---------------------------------------------------------------------------
'use strict';

function validateUrl(raw) {
  if (typeof raw !== 'string') {
    return 'URL is required.';
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return 'URL is required.';
  }
  if (trimmed.length < 4 || trimmed.length > 2027) {
    return "If URL's were that short, would you even be here?";
  }
  return null; // valid
}

// Prepend https:// if no scheme and append .com/ if there's no dot
// (so "example" becomes "https://example.com/").
function normaliseUrl(raw) {
  let url = raw.trim();
  if (!url.toLowerCase().includes('http')) {
    url = 'https://' + url;
  }
  if (!url.includes('.')) {
    url = url + '.com/';
  }
  return url;
}

module.exports = { validateUrl, normaliseUrl };
