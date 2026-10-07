// ---------------------------------------------------------------------------
// app.js — Express application factory.
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

  // In local dev, url_for() builds http://localhost:5001/... In prod
  // (SERVER_NAME null), we use the
  // request's actual host.
  if (SERVER_NAME) {
    app.set('trust proxy', false);
  }

  // Body parsing for the POST form.
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Expose a global `urlFor` to every template.
  app.use((req, res, next) => {
    res.locals.urlFor = (name, opts = {}) => urlFor(name, opts, req);
    res.locals.request = req;
    res.locals.query = req.query;
    next();
  });

  // Static files at /static.
  app.use('/static', express.static(STATIC_DIR));

  // Also serve the favicon from the root path.
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

  // 404 handler.
  app.use((req, res) => {
    res.status(404).render('404');
  });

  // Error handler.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    console.error(err);
    res.status(500).send('Internal Server Error');
  });

  // Stash the secret so other modules can use it.
  app.set('SECRET_KEY', SECRET_KEY);
  app.set('DEBUG', DEBUG);

  return app;
}

module.exports = { createApp };
