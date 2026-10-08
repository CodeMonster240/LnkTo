// ---------------------------------------------------------------------------
// config.js — application environment configuration.
//
// Anything that can vary per environment is read from `process.env`.
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
// DB_DIR       -> folder for the SQLite file. Defaults to /tmp on Vercel
//                (the only writable function directory), ~/LnkTo_data on
//                other hosts where HOME is set, project dir otherwise.
const SECRET_KEY = process.env.SECRET_KEY || 'dev-only-change-me-please';
const DEBUG = (process.env.DEBUG || '1') === '1';

// --- Database ---------------------------------------------------------------
// Put the DB under a writable folder. Vercel's /tmp storage is ephemeral;
// use LNKTO_DATABASE_FILE or LNKTO_DB_DIR with a persistent database setup
// when deploying a production workload there.
const defaultDbDir = path.join(
  process.env.VERCEL ? '/tmp' : (process.env.HOME || APPLICATION_DIR),
  process.env.VERCEL ? '' : 'LnkTo_data'
);
let DB_DIR = process.env.LNKTO_DB_DIR || defaultDbDir;
try {
  fs.mkdirSync(DB_DIR, { recursive: true });
} catch (_err) {
  // Fall back to the project dir if we can't create the target folder.
  DB_DIR = APPLICATION_DIR;
}

// We deliberately read LNKTO_DATABASE_URL (not DATABASE_URL) so an unrelated
// platform-provided DATABASE_URL cannot select an unsupported driver.
const SQLITE_PATH = process.env.LNKTO_DATABASE_FILE
  || path.join(DB_DIR, 'shortener.db');
const LNKTO_DATABASE_URL = process.env.LNKTO_DATABASE_URL
  || `sqlite:///${SQLITE_PATH}`;
const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || '';
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

// --- Static ----------------------------------------------------------------
const STATIC_DIR = path.join(APPLICATION_DIR, 'public');

// --- Server name -----------------------------------------------------------
// In production we want Express/req to use the actual request host
// (https://you.example.com). In local dev we set SERVER_NAME so
// `url_for('index', _external=true)` produces http://localhost:5001/...
const IS_PROD =
  process.env.VERCEL === '1' ||
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
  TURSO_DATABASE_URL,
  TURSO_AUTH_TOKEN,
  SQLITE_PATH,
  STATIC_DIR,
  SERVER_NAME,
  IS_PROD,
  PORT: parseInt(process.env.PORT || '5001', 10),
  HOST: process.env.HOST || '0.0.0.0',
};
