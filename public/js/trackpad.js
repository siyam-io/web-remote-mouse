/**
 * trackpad.js - Trackpad Gesture Handling (Cursor Movement, Tap-to-Click, 2-Finger Scroll)
 */
(function (window) {
  'use strict';

  function initTrackpad() {
    const trackpad = document.getElementById('trackpad');
    if (!trackpad) return;

    const scrollOverlay = document.getElementById('scroll-overlay');
    const scrollOverlayText = document.getElementById('scroll-overlay-text');
    let scrollOverlayTimer = null;

    function showScrollIndicator(text) {
      if (!scrollOverlay || !scrollOverlayText) return;
      scrollOverlayText.textContent = text;
      scrollOverlay.classList.add('visible');
      clearTimeout(scrollOverlayTimer);
      scrollOverlayTimer = setTimeout(() => {
        scrollOverlay.classList.remove('visible');
      }, 400);
    }

    // Touch point visual feedback
    const touchIndicator = document.createElement('div');
    touchIndicator.className = 'touch-point';
    touchIndicator.style.display = 'none';
    trackpad.appendChild(touchIndicator);

    function createTapFlash(x, y) {
      const flash = document.createElement('div');
      flash.className = 'tap-flash';
      flash.style.left = `${x}px`;
      flash.style.top = `${y}px`;
      trackpad.appendChild(flash);
      setTimeout(() => flash.remove(), 320);
    }

    let touchCount = 0;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let startTime = 0;
    let totalDistance = 0;
    let lastTwoFingerY = 0;
    let twoFingerScrollAccumulator = 0;

    trackpad.addEventListener('touchstart', (e) => {
      if (window.AppState.currentMode === 'air') return;
      e.preventDefault();
      window.AppState.requestWakeLock();
      trackpad.classList.add('active');
      touchCount = e.touches.length;

      const rect = trackpad.getBoundingClientRect();

      if (touchCount === 1) {
        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        lastX = t.clientX;
        lastY = t.clientY;
        startTime = Date.now();
        totalDistance = 0;

        touchIndicator.style.display = 'block';
        touchIndicator.style.left = `${t.clientX - rect.left}px`;
        touchIndicator.style.top = `${t.clientY - rect.top}px`;
      } else if (touchCount === 2) {
        touchIndicator.style.display = 'none';
        lastTwoFingerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        twoFingerScrollAccumulator = 0;
      } else {
        touchIndicator.style.display = 'none';
      }
    }, { passive: false });

    trackpad.addEventListener('touchmove', (e) => {
      if (window.AppState.currentMode === 'air') return;
      e.preventDefault();
      const currentTouchCount = e.touches.length;
      const rect = trackpad.getBoundingClientRect();

      if (currentTouchCount === 1) {
        const t = e.touches[0];
        const rawDx = t.clientX - lastX;
        const rawDy = t.clientY - lastY;
        totalDistance += Math.hypot(rawDx, rawDy);

        const dx = rawDx * window.AppState.mouseSensitivity;
        const dy = rawDy * window.AppState.mouseSensitivity;

        lastX = t.clientX;
        lastY = t.clientY;

        touchIndicator.style.left = `${t.clientX - rect.left}px`;
        touchIndicator.style.top = `${t.clientY - rect.top}px`;

        if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
          window.AppConnection.send({
            type: 'move',
            dx: Math.round(dx * 10) / 10,
            dy: Math.round(dy * 10) / 10
          });
        }
      } else if (currentTouchCount === 2) {
        touchIndicator.style.display = 'none';
        const currentTwoFingerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rawDeltaY = currentTwoFingerY - lastTwoFingerY;
        lastTwoFingerY = currentTwoFingerY;

        twoFingerScrollAccumulator += rawDeltaY;

        const SCROLL_CHUNK_PX = 6;
        if (Math.abs(twoFingerScrollAccumulator) >= SCROLL_CHUNK_PX) {
          const rawDistance = Math.abs(twoFingerScrollAccumulator);
          const steps = Math.max(1, Math.round((rawDistance / SCROLL_CHUNK_PX) * window.AppState.scrollSensitivity));

          let isDown = twoFingerScrollAccumulator < 0;
          if (window.AppState.invertScroll) {
            isDown = !isDown;
          }

          const direction = isDown ? 'down' : 'up';
          const dy = isDown ? steps : -steps;

          window.AppConnection.send({
            type: 'scroll',
            dy: dy,
            direction: direction,
            amount: steps
          });

          showScrollIndicator(direction === 'down' ? `Scroll Down ↓` : `Scroll Up ↑`);
          twoFingerScrollAccumulator = 0;
        }
      }
    }, { passive: false });

    trackpad.addEventListener('touchend', (e) => {
      if (window.AppState.currentMode === 'air') return;
      e.preventDefault();
      const rect = trackpad.getBoundingClientRect();

      if (touchCount === 1 && e.touches.length === 0) {
        const duration = Date.now() - startTime;
        if (duration < 300 && totalDistance < 10) {
          window.AppConnection.send({ type: 'click', button: 'left' });
          window.AppState.haptic(25);
          createTapFlash(lastX - rect.left, lastY - rect.top);
        }
      }

      touchCount = e.touches.length;
      if (touchCount === 0) {
        trackpad.classList.remove('active');
        touchIndicator.style.display = 'none';
      } else if (touchCount === 1) {
        const t = e.touches[0];
        lastX = t.clientX;
        lastY = t.clientY;
        totalDistance = 100;
      }
    }, { passive: false });

    trackpad.addEventListener('touchcancel', () => {
      if (window.AppState.currentMode === 'air') return;
      trackpad.classList.remove('active');
      touchIndicator.style.display = 'none';
      touchCount = 0;
    });
  }

  window.TrackpadModule = { init: initTrackpad };
})(window);

