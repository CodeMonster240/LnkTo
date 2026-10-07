// public/js/redirect.js — epic wormhole tunnel animation.
//
// Renders a multi-layered Canvas wormhole: a swirling vortex with
// concentric rings, a starfield backdrop, amber particle trails, and
// the destination thumbnail spiraling through the tunnel's center.
'use strict';

(function () {
  var data = window.__REDIRECT_DATA || {};
  var dest = data.old || '/';
  var duration = data.duration || 3;
  var showThumb = data.showThumbnail || false;

  var canvas = document.getElementById('wh-canvas');
  if (!canvas) {
    // Fallback: simple delay then redirect
    setTimeout(function () { window.location.href = dest; }, duration * 1000);
    return;
  }

  var ctx = canvas.getContext('2d');
  var overlay = document.getElementById('wh-overlay');
  var thumbImg = null;
  var thumbSize = 120;

  // Load thumbnail image if enabled
  if (showThumb && overlay) {
    var imgEl = overlay.querySelector('.wh-thumb');
    if (imgEl && imgEl.src) {
      thumbImg = new Image();
      // The canvas is never exported, so keep the image in the default
      // loading mode to avoid CORS failures on favicon hosts.
      thumbImg.src = imgEl.src;
    }
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  var w = canvas.width, h = canvas.height;
  var cx = w / 2, cy = h / 2;

  // Particle system for the tunnel
  var particles = [];
  var NUM_PARTICLES = 120;
  for (var p = 0; p < NUM_PARTICLES; p++) {
    particles.push({
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * 300 + 50,
      depth: Math.random() * 40,
      speed: 0.5 + Math.random() * 2,
      size: 0.5 + Math.random() * 2,
    });
  }

  // Stars in the background
  var stars = [];
  var NUM_STARS = 300;
  for (var s = 0; s < NUM_STARS; s++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 1.5,
      twinkle: Math.random() * Math.PI * 2,
    });
  }

  // Tunnel rings
  var NUM_RINGS = 30;
  var rings = [];
  for (var r = 0; r < NUM_RINGS; r++) {
    rings.push({
      depth: (r / NUM_RINGS) * 60,
      offset: Math.random() * Math.PI * 2,
      color: 0.5 + (r / NUM_RINGS) * 0.5,
    });
  }

  var startTime = performance.now();
  var totalMs = duration * 1000;

  function animate(now) {
    var elapsed = now - startTime;
    var progress = Math.min(elapsed / totalMs, 1);
    var eased = 1 - Math.pow(1 - progress, 3); // ease out

    // Clear with a dark gradient
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) / 2);
    grad.addColorStop(0, '#0a0a0f');
    grad.addColorStop(1, '#050508');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Draw stars
    ctx.fillStyle = 'rgba(244, 238, 226, 0.4)';
    for (var i = 0; i < stars.length; i++) {
      var star = stars[i];
      var twinkle = Math.sin(now * 0.002 + star.twinkle) * 0.3 + 0.7;
      var sx = star.x + Math.sin(now * 0.0005 + i) * twinkle;
      var sy = star.y + Math.cos(now * 0.0003 + i) * twinkle;
      ctx.globalAlpha = twinkle * 0.5;
      ctx.fillRect(sx, sy, star.size, star.size);
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(now * 0.0003);

    // Draw tunnel rings (concentric ellipses receding into the distance)
    for (var ri = 0; ri < rings.length; ri++) {
      var ring = rings[ri];
      // Ring moves toward viewer (z increases toward 0)
      var z = ring.depth - eased * 80;
      if (z < 1) {
        // Reset ring to far end
        ring.depth += 60;
        z = ring.depth - eased * 80;
      }

      var scale = 1 / (z / 20 + 0.1);
      var radius = scale * 180;
      var ringAlpha = Math.max(0, 1 - z / 60) * 0.7;

      if (radius < 2) continue;

      ctx.strokeStyle = 'rgba(217, 164, 65, ' + ringAlpha + ')';
      ctx.lineWidth = 2 / scale;

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner brighter ring
      ctx.strokeStyle = 'rgba(244, 238, 226, ' + (ringAlpha * 0.7) + ')';
      ctx.lineWidth = 1 / scale;
      ctx.stroke();
    }

    // Draw particles flying INTO the tunnel center
    for (var pi = 0; pi < particles.length; pi++) {
      var part = particles[pi];
      var pz = part.depth - eased * 80;
      if (pz < 0.5) {
        part.depth = 40;
        pz = part.depth - eased * 80;
      }

      var pscale = 1 / (pz / 20 + 0.1);
      var pradius = part.radius * pscale;
      var px = Math.cos(part.angle) * pradius;
      var py = Math.sin(part.angle) * pradius;
      var psize = part.size * pscale;

      if (pz > 2) {
        ctx.fillStyle = 'rgba(196, 90, 42, ' + (0.8 * (1 - pz / 40)) + ')';
        ctx.globalAlpha = 1 - pz / 40;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.3, psize), 0, Math.PI * 2);
        ctx.fill();

        // Trail
        ctx.strokeStyle = 'rgba(217, 164, 65, ' + (0.4 * (1 - pz / 40)) + ')';
        ctx.lineWidth = psize * 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - Math.cos(part.angle) * psize * 5, py - Math.sin(part.angle) * psize * 5);
        ctx.stroke();
      }

      // Move particle closer over time
      part.depth -= part.speed * 0.016;
    }

    ctx.restore();

    // Draw thumbnail spiraling through the center
    if (
      thumbImg &&
      thumbImg.complete &&
      thumbImg.naturalWidth > 0 &&
      thumbImg.naturalHeight > 0
    ) {
      var thumbProgress = Math.min(1, (elapsed + 200) / totalMs);
      // Thumbnail starts from the far edge (bottom of screen) and
      // spirals into the center
      var spiralT = elapsed / totalMs;
      var spiralRadius = (1 - spiralT) * Math.min(w, h) * 0.3;
      var spiralAngle = spiralT * Math.PI * 6 + now * 0.002;
      var thumbX = cx + Math.cos(spiralAngle) * spiralRadius;
      var thumbY = cy + Math.sin(spiralAngle) * spiralRadius;
      var thumbScale = 0.3 + spiralT * 0.7;

      ctx.save();
      ctx.translate(thumbX, thumbY);
      ctx.scale(thumbScale, thumbScale);
      ctx.globalAlpha = Math.min(1, thumbProgress * 1.5);
      ctx.filter = 'blur(0)';
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(217, 164, 65, 0.5)';
      ctx.drawImage(thumbImg, -thumbSize / 2, -thumbSize / 2, thumbSize, thumbSize);
      ctx.restore();

      // Glow around thumbnail
      ctx.save();
      ctx.translate(thumbX, thumbY);
      var glowSize = thumbSize * thumbScale * 0.8;
      var glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
      glowGrad.addColorStop(0, 'rgba(217, 164, 65, 0.4)');
      glowGrad.addColorStop(1, 'rgba(217, 164, 65, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // Fade out quickly, then redirect
      if (overlay) {
        overlay.style.opacity = 0;
        overlay.style.transition = 'opacity 300ms ease';
      }
      setTimeout(function () { window.location.href = dest; }, 300);
    }
  }

  // Fallback redirect (safety net for no-JS or errors in animation)
  setTimeout(function () { window.location.href = dest; }, (duration + 2) * 1000);

  requestAnimationFrame(animate);
})();
