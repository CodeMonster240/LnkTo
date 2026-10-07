// pages/success.js — copy-to-clipboard + small reveal animation for
// the freshly-issued short code. Uses the native Clipboard API with a
// textarea fallback for very old browsers.
(function () {
  // 1) Reveal animation: the 3-character code animates in one character
  //    at a time, like a stamp.
  var codeEl = document.querySelector('.result__code');
  if (codeEl) {
    var raw = codeEl.getAttribute('data-code') || codeEl.textContent || '';
    codeEl.textContent = '';
    Array.prototype.forEach.call(raw, function (ch, i) {
      var span = document.createElement('span');
      span.className = 'result__char';
      span.textContent = ch;
      span.style.animationDelay = (60 + i * 90) + 'ms';
      codeEl.appendChild(span);
    });
  }

  // 2) Copy-to-clipboard.
  var btn = document.querySelector('.result__copy');
  if (!btn) return;

  btn.addEventListener('click', function () {
    var target = document.getElementById(btn.getAttribute('data-copy-target'));
    if (!target) return;
    var text = target.textContent.trim();

    var done = function () {
      var label = btn.querySelector('.result__copy-label');
      if (label) {
        var prev = label.textContent;
        label.textContent = 'Copied';
        setTimeout(function () { label.textContent = prev; }, 1800);
      }
      btn.classList.add('result__copy--ok');
      setTimeout(function () { btn.classList.remove('result__copy--ok'); }, 1800);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }

    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
      } catch (_e) { /* swallow */ }
    }
  });
})();
