// pages/list.js — confirm-on-delete + live hit-count updates via WebSocket.
(function () {
  // --- Delete confirmation ---
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || !form.matches || !form.matches('form[data-confirm]')) return;
    var msg = form.getAttribute('data-confirm') || 'Are you sure?';
    if (!window.confirm(msg)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  });

  // --- Live updates via WebSocket ---
  // Subscribe to "allLinks" topic. When someone hits a short link,
  // the server broadcasts the new hit count and we update the table row
  // in real time. Also handles "newLink" events (new rows appear).
  function initLiveUpdates() {
    if (typeof LnkToWS === 'undefined') {
      // wsClient.js not loaded — try loading it dynamically
      var script = document.createElement('script');
      script.src = '/static/js/wsClient.js';
      script.onload = function () { initLiveUpdates(); };
      document.head.appendChild(script);
      return;
    }
    var ws = new LnkToWS();

    // Map of code -> hit count display element
    // Each row in the table has a data-code attribute on the <tr>
    // and a .hits span inside it.
    var hitElements = {};
    var rows = document.querySelectorAll('tbody tr');
    for (var i = 0; i < rows.length; i++) {
      var code = rows[i].getAttribute('data-code');
      if (code) {
        var hitSpan = rows[i].querySelector('.hits');
        if (hitSpan) hitElements[code] = hitSpan;
      }
    }

    ws.on('allLinks', function (payload) {
      if (!payload || !payload.code) return;
      var el = hitElements[payload.code];
      if (el) {
        el.textContent = payload.hits;
        if (payload.hits > 0) {
          el.classList.add('hits--live');
        }
      }
    });

    ws.on('newLink', function (payload) {
      if (!payload || !payload.payload) return;
      var data = payload.payload;
      // The stats page will reload its data via AJAX if needed.
      // For a simpler UX, we just show a toast notification.
      // In production, you'd append a new row here.
      var existing = document.querySelector('tr[data-code="' + data.code + '"]');
      if (!existing) {
        // New link appeared — could reload or show notification
        var toast = document.createElement('div');
        toast.className = 'toast toast--info';
        toast.textContent = 'New link /' + data.code + ' created.';
        toast.style.cssText =
          'position:fixed;top:16px;right:16px;background:rgba(47,106,61,0.9),' +
          'color:#fff;padding:10px 16px;border-radius:8px;font-size:0.85rem;' +
          'z-index:9999;backdrop-filter:blur(4px);';
        document.body.appendChild(toast);
        setTimeout(function () {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 3000);
      }
    });

    ws.subscribe('allLinks');
  }

  // Start live updates after a short delay to let the page settle.
  setTimeout(initLiveUpdates, 1000);
})();
