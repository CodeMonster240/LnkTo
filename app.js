// ---------------------------------------------------------------------------
// app.js — Express application factory. Equivalent of the Python `app.py`
// (creates the Flask app, configures it, wires up CSRF — but in our case
// CSRF is unnecessary because ALTCHA itself is the spam protection, which
// is the same stance the Python code took once ALTCHA was added).
// ---------------------------------------------------------------------------
'use strict';

const path = require('path');
const express = require('express');
const { urlFor } = require('./lib/urlFor');
const { STATIC_DIR, DEBUG, SERVER_NAME, SECRET_KEY } = require('./config');

const indexRoutes = require('./routes/index');
const statsRoutes = require('./routes/stats');
const deleteRoutes = require('./routes/delete');
const redirectRoutes = require('./routes/redirect');
const settingsRoutes = require('./routes/settings');

function createApp() {
  const app = express();

  // View engine — EJS is the closest 1:1 equivalent to Jinja2.
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Mirror Flask's `SERVER_NAME` behaviour: in local dev, url_for() builds
  // http://localhost:5001/... In prod (SERVER_NAME null), we use the
  // request's actual host.
  if (SERVER_NAME) {
    app.set('trust proxy', false);
  }

  // Body parsing for the POST form.
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Expose a global `urlFor` to every template, matching how Flask
  // exposes `url_for` in Jinja2 contexts.
  app.use((req, res, next) => {
    res.locals.urlFor = (name, opts = {}) => urlFor(name, opts, req);
    res.locals.request = req;
    res.locals.query = req.query;
    next();
  });

  // Static files at /static (matches the Python url_for('static', ...)).
  app.use('/static', express.static(STATIC_DIR));

  // favicon.ico — also served from /static, but the Python app
  // explicitly served it from root too, so keep the alias.
  app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(STATIC_DIR, 'favicon.ico'));
  });

      // Routes — order matters: /stats and /delete must be matched before
  // the catch-all :code redirect.
  app.use(statsRoutes);
  app.use(deleteRoutes);
  app.use(settingsRoutes);
  app.use(indexRoutes);
  app.use(redirectRoutes); // :code — must be last

  // 404 handler — same as the Python @app.errorhandler(404).
  app.use((req, res) => {
    res.status(404).render('404');
  });

  // Error handler.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    console.error(err);
    res.status(500).send('Internal Server Error');
  });

  // Stash the secret so other modules can use it (kept for parity with
  // settings.SECRET_KEY; not strictly required by Express itself).
  app.set('SECRET_KEY', SECRET_KEY);
  app.set('DEBUG', DEBUG);

  return app;
}

module.exports = { createApp };
