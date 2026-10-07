// pages/analytics.js — live hit-count + trend updates via WebSocket.
'use strict';

(function () {
  var codeEl = document.querySelector('.ana__code');
  if (!codeEl) return;
  var code = codeEl.textContent.trim();
  if (!code) return;

  if (typeof LnkToWS === 'undefined') return;

  var ws = new LnkToWS();

  ws.on('link:' + code, function (payload) {
    if (!payload) return;

    var totalEl = document.getElementById('kpi-total-hits');
    if (totalEl) {
      totalEl.textContent = payload.hits;
      totalEl.classList.add('kpi__live');
    }

    var last7El = document.getElementById('kpi-last7');
    if (last7El) {
      last7El.classList.add('kpi__live');
    }

    // Pulse badge
    if (totalEl) {
      var badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = '+1';
      badge.style.cssText =
        'display:inline-block;margin-left:6px;padding:2px 10px;' +
        'background:rgba(217,164,65,0.2);color:var(--amber);' +
        'border-radius:999px;font-size:0.75rem;font-weight:600;' +
        'animation:kpiLive 1s ease-out;';
      totalEl.parentNode.appendChild(badge);
      setTimeout(function () {
        if (badge.parentNode) badge.parentNode.removeChild(badge);
      }, 1000);
    }
  });

  ws.on('newLink', function (data) {
    if (!data || !data.payload || data.payload.code !== code) return;
    console.log('New link event for current page');
  });

  ws.subscribe('link:' + code);
})();