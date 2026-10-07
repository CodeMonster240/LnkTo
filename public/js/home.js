// pages/home.js — autofocus on desktop + popup logic for custom link selection.
'use strict';

(function () {
  var input = document.getElementById('url-input');
  if (input && window.matchMedia('(min-width: 720px)').matches) {
    input.focus({ preventScroll: true });
  }

  var form = document.getElementById('shorten-form');
  if (!form) return;
  var popup = document.getElementById('custom-popup');
  if (!popup) return;

  var slugInput = document.getElementById('custom-slug');
  var slugStatus = document.getElementById('slug-status');
  var lengthSlider = document.getElementById('code-length');
  var lengthOutput = document.getElementById('length-output');
  var durationField = document.getElementById('popup-duration-field');
  var redirectCheckbox = document.getElementById('popup-show-redirect');
  var thumbnailCheckbox = document.getElementById('popup-show-thumbnail');
  var durationInput = document.getElementById('popup-redirect-duration');
  var confirmBtn = document.getElementById('popup-confirm');
  var customCodeField = document.getElementById('custom-code-field');
  var codeLengthField = document.getElementById('code-length-field');
  var showRedirectField = document.getElementById('show-redirect-field');
  var redirectDurationField = document.getElementById('redirect-duration-field');
  var showThumbnailField = document.getElementById('show-thumbnail-field');
  var checkTimer = null;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    popup.style.display = 'flex';
    popup.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (slugInput) slugInput.value = '';
    updateSlugStatus('');
    syncSlider();
  });

  function closePopup() {
    popup.style.display = 'none';
    popup.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  var closeBtns = popup.querySelectorAll('[data-action="close-popup"]');
  for (var i = 0; i < closeBtns.length; i++) {
    closeBtns[i].addEventListener('click', closePopup);
  }
  popup.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePopup();
  });
  var backdrop = popup.querySelector('.popup__backdrop');
  if (backdrop) backdrop.addEventListener('click', closePopup);

  function updateSlugStatus(text, state) {
    if (!slugStatus) return;
    if (!text) {
      slugStatus.innerHTML = '<span class="slug-check__default">Default: 3 random chars</span>';
      slugStatus.className = 'slug-check__status';
    } else {
      slugStatus.textContent = text;
      slugStatus.className = 'slug-check__status slug-check__status--' + (state || 'ok');
    }
  }

  function checkSlugAvailability(slug) {
    if (!slug || slug.length < 3) { updateSlugStatus(''); return; }
    if (!/^[A-Za-z0-9_-]+$/.test(slug)) {
      updateSlugStatus('Invalid characters'); return;
    }
    clearTimeout(checkTimer);
    checkTimer = setTimeout(function () {
      fetch('/api/check-code/' + encodeURIComponent(slug))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.available) {
            updateSlugStatus('/' + slug + ' is available', 'ok');
          } else {
            updateSlugStatus('/' + slug + ' is taken', 'error');
          }
        })
        .catch(function () { updateSlugStatus('Check failed'); });
    }, 350);
  }

  if (slugInput) {
    slugInput.addEventListener('input', function () {
      checkSlugAvailability(this.value.trim());
    });
  }

  function syncSlider() {
    if (!lengthSlider || !lengthOutput) return;
    lengthOutput.textContent = lengthSlider.value;
    lengthSlider.setAttribute('aria-valuenow', lengthSlider.value);
  }
  if (lengthSlider) lengthSlider.addEventListener('input', syncSlider);

  function updateRedirectField() {
    if (!durationField || !redirectCheckbox) return;
    durationField.style.display = redirectCheckbox.checked ? 'block' : 'none';
  }
  if (redirectCheckbox) redirectCheckbox.addEventListener('change', updateRedirectField);

  if (confirmBtn) {
    confirmBtn.addEventListener('click', function () {
      var slug = slugInput ? slugInput.value.trim() : '';
      var codeLen = lengthSlider ? parseInt(lengthSlider.value, 10) : 3;
      if (slug) {
        if (!/^[A-Za-z0-9_-]{3,50}$/.test(slug)) {
          alert('Custom code must be 3-50 characters (letters, digits, hyphens, underscores).');
          return;
        }
        if (slugStatus && slugStatus.classList.contains('slug-check__status--error')) {
          alert('/' + slug + ' is already taken. Pick another.');
          return;
        }
      }
      if (customCodeField) customCodeField.value = slug;
      if (codeLengthField) codeLengthField.value = String(codeLen);
      if (showRedirectField) showRedirectField.value = redirectCheckbox.checked ? '1' : '0';
      if (durationInput && redirectDurationField) redirectDurationField.value = durationInput.value;
      if (showThumbnailField) showThumbnailField.value = thumbnailCheckbox.checked ? '1' : '0';
      popup.style.display = 'none';
      popup.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      form.submit();
    });
  }
})();
