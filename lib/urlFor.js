// ---------------------------------------------------------------------------
// lib/urlFor.js — minimal helper to replace Flask's `url_for()` in
// templates. EJS templates still use `urlFor('index')` etc. via a global
// registered in `app.js`.
// ---------------------------------------------------------------------------
'use strict';

/**
 * Build a URL for a named route.
 *
 * @param {string} name  - route name (matches the key in app.js routes map)
 * @param {object} [opts] - { params, external }
 *   params:   path-param substitutions, e.g. { page: 2 }
 *   external: when true, prepend the request host (http(s)://host)
 * @param {object} [req]  - the current request (required when external=true)
 */
function urlFor(name, opts = {}, req = null) {
    const routeTable = {
    index:    { path: '/',         params: [] },
    stats:    { path: '/stats',    params: [] },
    static:   { path: '/static',   params: [] },
    redirect: { path: '/:code',    params: ['code'] },
    statsPage:{ path: '/stats/page/:page', params: ['page'] },
    analytics:{ path: '/stats/:code',       params: ['code'] },
    settings: { path: '/settings/:code',  params: ['code'] },
    deleteCode:{path: '/delete/:code',      params: ['code'] },
  };

  const entry = routeTable[name];
  if (!entry) {
    throw new Error(`urlFor: unknown route "${name}"`);
  }

  let path = entry.path;
  for (const p of entry.params) {
    const v = opts.params ? opts.params[p] : undefined;
    if (v === undefined || v === null) {
      throw new Error(`urlFor: missing param "${p}" for route "${name}"`);
    }
    path = path.replace(`:${p}`, encodeURIComponent(String(v)));
  }

  // Append a static filename if requested:  urlFor('static', { params: { filename: 'css/style.css' } })
  if (name === 'static' && opts.params && opts.params.filename) {
    path = `${path}/${opts.params.filename}`;
  }

  if (opts.external && req) {
    return `${req.protocol}://${req.get('host')}${path}`;
  }
  return path;
}

module.exports = { urlFor };
