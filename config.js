// ---------------------------------------------------------------------------
// config.js — equivalent of the Python `settings.py`.
//
// Anything that can vary per environment is read from `process.env`. The
// behaviour mirrors the Python version 1:1 so that deployment notes, the
// `.env.example`, and the PythonAnywhere doc still apply (just with the
// node-friendly `npm start` instead of `python run.py`).
// ---------------------------------------------------------------------------
'use strict';

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const APPLICATION_DIR = __dirname;

// --- Production-safe defaults ----------------------------------------------
// SECRET_KEY  -> MUST be set in production. The static string here is fine
//                for local dev but should never ship to a public host.
// DEBUG        -> "1" to enable verbose logging, anything else disables it.
// DB_DIR       -> folder for the SQLite file. Defaults to ~/LnkTo_data
//                on hosts where HOME is set, project dir otherwise.
const SECRET_KEY = process.env.SECRET_KEY || 'dev-only-change-me-please';
const DEBUG = (process.env.DEBUG || '1') === '1';

// --- Database ---------------------------------------------------------------
// Put the DB under a writable folder that survives git pulls / restarts.
// On PythonAnywhere-style hosts HOME=/home/<user> is always writable.
const defaultDbDir = path.join(
  process.env.HOME || APPLICATION_DIR,
  'LnkTo_data'
);
let DB_DIR = process.env.LNKTO_DB_DIR || defaultDbDir;
try {
  fs.mkdirSync(DB_DIR, { recursive: true });
} catch (_err) {
  // Fall back to the project dir if we can't create the target folder.
  DB_DIR = APPLICATION_DIR;
}

// We deliberately read LNKTO_DATABASE_URL (not DATABASE_URL) because some
// hosts (e.g. PythonAnywhere) auto-export DATABASE_URL pointing at MySQL.
// Honouring that here without an explicit opt-in would crash on hosts that
// haven't set up a MySQL driver.
const SQLITE_PATH = process.env.LNKTO_DATABASE_FILE
  || path.join(DB_DIR, 'shortener.db');
const LNKTO_DATABASE_URL = process.env.LNKTO_DATABASE_URL
  || `sqlite:///${SQLITE_PATH}`;

// --- Static ----------------------------------------------------------------
const STATIC_DIR = path.join(APPLICATION_DIR, 'public');

// --- Server name -----------------------------------------------------------
// In production we want Express/req to use the actual request host
// (https://you.example.com). In local dev we set SERVER_NAME so
// `url_for('index', _external=true)` produces http://localhost:5001/...
const IS_PROD =
  (process.env.FLASK_ENV || '').toLowerCase() === 'production' ||
  (process.env.LNKTO_ENV || '').toLowerCase() === 'production' ||
  (process.env.DEBUG || '1') === '0';

const SERVER_NAME = IS_PROD
  ? null
  : (process.env.SERVER_NAME || 'localhost:5001');

module.exports = {
  APPLICATION_DIR,
  SECRET_KEY,
  DEBUG,
  DB_DIR,
  LNKTO_DATABASE_URL,
  SQLITE_PATH,
  STATIC_DIR,
  SERVER_NAME,
  IS_PROD,
  PORT: parseInt(process.env.PORT || '5001', 10),
  HOST: process.env.HOST || '0.0.0.0',
};
