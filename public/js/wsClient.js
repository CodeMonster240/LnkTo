// public/js/wsClient.js — minimal WebSocket client helper.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.LnkToWS = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function LnkToWS() {
    this.callbacks = {};
    this._pendingSubs = [];
    this._attempt = 0;
    this._maxAttempts = 50;
    this._connect();
  }

  LnkToWS.prototype._connect = function () {
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    var host = location.host;
    var url = proto + '//' + host + '/';
    var ws;
    try { ws = new WebSocket(url); } catch (e) { return; }
    this._ws = ws;
    var self = this;

    ws.addEventListener('open', function () {
      self._attempt = 0;
      // Flush any pending subscriptions now that we're connected.
      while (self._pendingSubs.length > 0) {
        self._ws.send(JSON.stringify({
          type: 'subscribe',
          topic: self._pendingSubs.shift()
        }));
      }
    });

    ws.addEventListener('message', function (event) {
      var msg;
      try { msg = JSON.parse(event.data); } catch (e) { return; }
      if (msg.type && self.callbacks[msg.type]) {
        self.callbacks[msg.type](msg.payload);
      }
    });

    ws.addEventListener('close', function () {
      if (self._attempt >= self._maxAttempts) return;
      self._attempt += 1;
      var delay = Math.min(1000 * Math.pow(1.5, self._attempt), 30000);
      setTimeout(function () { self._connect(); }, delay);
    });

    ws.addEventListener('error', function () { /* suppress */ });
  };

  LnkToWS.prototype.subscribe = function (topic) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ type: 'subscribe', topic: topic }));
    } else {
      // Queue it — will be sent when 'open' fires.
      this._pendingSubs.push(topic);
    }
  };

  LnkToWS.prototype.on = function (type, cb) {
    this.callbacks[type] = cb;
  };

  return LnkToWS;
});
