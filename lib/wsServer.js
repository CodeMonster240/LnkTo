// ---------------------------------------------------------------------------
// lib/wsServer.js — lightweight WebSocket pub/sub layer.
//
// Attaches a `ws` WebSocket server to the raw HTTP server, tracks which
// browser sockets are subscribed to which "topics", and exposes a
// `broadcast(topic, payload)` function that routes a JSON message to
// every subscriber on that topic.
//
// Topics used by LnkTo:
//   "allLinks"      — every open stats/list page (live hit counts, new links)
//   "link:<code>"   — the analytics page for a specific <code>
//
// All broadcast() calls are fire-and-forget: if the WebSocket server
// hasn't been initialised yet (or ws isn't installed) they silently no-op,
// so the rest of the app works fine in a zero-WS deployment.
// ---------------------------------------------------------------------------
'use strict';

let wss = null;
const WebSocket = require('ws');
const topics = new Map(); // topic -> Set<ws>

/**
 * Attach the WebSocket server to an existing HTTP server.
 * Called once from server.js right after `http.createServer(app)`.
 */
function attachWss(httpServer) {
  wss = new WebSocket.Server({ server: httpServer });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch (_e) { return; }
      if (msg.type === 'subscribe' && typeof msg.topic === 'string') {
        if (!topics.has(msg.topic)) topics.set(msg.topic, new Set());
        topics.get(msg.topic).add(ws);
      } else if (msg.type === 'unsubscribe' && typeof msg.topic === 'string') {
        const set = topics.get(msg.topic);
        if (set) set.delete(ws);
      }
    });

    ws.on('close', () => {
      for (const set of topics.values()) {
        set.delete(ws);
      }
    });

    ws.on('error', () => { /* ignore */ });
  });

  wss.on('error', (err) => {
    console.error('[wsServer] server error:', err.message);
  });
}

/**
 * Broadcast a JSON payload to every socket subscribed to `topic`.
 * Silently does nothing if the server isn't running.
 */
function broadcast(topic, payload) {
  if (!wss) return;
  const set = topics.get(topic);
  if (!set || set.size === 0) return;
  const data = JSON.stringify({ type: topic, payload });
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

/**
 * Broadcast to every connected socket (all topics).
 * Used for "new link created" events.
 */
function broadcastAll(payload) {
  if (!wss) return;
  const data = JSON.stringify(payload);
  for (const set of topics.values()) {
    for (const ws of set) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }
}

module.exports = {
  attachWss,
  broadcast,
  broadcastAll,
  isReady: () => wss !== null,
};