#!/usr/bin/env node
// ---------------------------------------------------------------------------
// scripts/init-db.js — equivalent of `create_db.py`. Creates the SQLite
// table if it doesn't exist. Safe to run repeatedly.
//
// Usage:  node scripts/init-db.js   (or  npm run init-db )
// ---------------------------------------------------------------------------
'use strict';

const path = require('path');
const { db, DB_FILE, remote } = require('../db');
const { LNKTO_DATABASE_URL } = require('../config');

// The schema is created automatically when better-sqlite3 connects
// (see db.js). This script just verifies the connection works and
// prints the location, then closes cleanly.
async function main() {
  try {
  const count = await db.count();
  console.log(`[init-db] Database ready: ${remote ? process.env.TURSO_DATABASE_URL : LNKTO_DATABASE_URL || `sqlite:///${DB_FILE}`}`);
  console.log(`[init-db] urls table has ${count} row(s).`);
  process.exit(0);
  } catch (err) {
  console.error('[init-db] Failed:', err);
  process.exit(1);
  }
}
main();
