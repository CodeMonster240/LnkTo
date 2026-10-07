// ---------------------------------------------------------------------------
// lib/validate.js — equivalent of the WTForms validators used in
// `url/forms.py`. The Python app used Flask-WTF for the URL field's
// InputRequired + Length(4..2027) and a "required" altcha field. We
// reproduce those checks here without pulling in a forms library.
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

// Mirrors `save_url` in url/forms.py: prepend https:// if no scheme,
// append .com/ if there's no dot (so "example" → "https://example.com/").
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
