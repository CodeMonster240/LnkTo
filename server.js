#!/usr/bin/env node
// ---------------------------------------------------------------------------
// server.js — long-running Node.js entry point for local and VM hosting.
//   1. Initialises the SQLite DB (idempotent — uses CREATE TABLE IF NOT EXISTS).
//   2. Starts Express on 0.0.0.0:5001 (override via HOST / PORT).
//   3. Attaches the WebSocket server (lib/wsServer.js) for live updates.
//
// Run with:  npm start   (or  node server.js )
// ---------------------------------------------------------------------------
'use strict';

const http = require('http');
const { createApp } = require('./app');
const { HOST, PORT, DEBUG, LNKTO_DATABASE_URL, SQLITE_PATH } = require('./config');
const { db } = require('./db');
const { attachWss, isReady } = require('./lib/wsServer');

// Touch the DB so any connection errors surface here, not on first request.
console.log(`[server.js] DB ready: ${LNKTO_DATABASE_URL || `sqlite:///${SQLITE_PATH}`}`);

const app = createApp();

// Wrap the Express app in a raw HTTP server so we can attach WebSocket.
const server = http.createServer(app);

// Attach WebSocket server for live hit counts, new-link events, etc.
if (isReady()) {
  console.log('[server.js] Warning: wsServer already attached.');
}
attachWss(server);
console.log('[server.js] WebSocket server attached for live updates.');

server.listen(PORT, HOST, () => {
  console.log(`[server.js] LnkTo listening on http://${HOST}:${PORT} (debug=${DEBUG})`);
  console.log(`[server.js] Open:  http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/`);
  console.log(`[server.js] WS:    ws://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/`);
});

// Graceful shutdown — flush the SQLite WAL on SIGTERM/SIGINT.
async function shutdown(signal) {
  console.log(`[server.js] ${signal} received, closing DB.`);
  try { await db.close(); } catch (err) { console.error('[server.js] DB close failed:', err); }
  server.close(() => process.exit(0));
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
