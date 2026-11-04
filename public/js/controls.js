/**
 * controls.js - Bottom Mouse Buttons, Volume Control, and Right-side Shorts Video Navigation Rail
 */
(function (window) {
  'use strict';

  function initControls() {
    // 1. Dedicated Mouse Click Buttons (Left, Middle, Right)
    const btnLeft = document.getElementById('btn-left');
    const btnMiddle = document.getElementById('btn-middle');
    const btnRight = document.getElementById('btn-right');

    function setupMouseButton(btn, buttonType) {
      if (!btn) return;
      const triggerClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.AppState.requestWakeLock();
        btn.classList.add('btn-pressed');
        window.AppState.haptic(30);
        window.AppConnection.send({ type: 'click', button: buttonType });

        setTimeout(() => {
          btn.classList.remove('btn-pressed');
        }, 120);
      };

      btn.addEventListener('touchstart', triggerClick, { passive: false });
      btn.addEventListener('mousedown', triggerClick);
    }

    setupMouseButton(btnLeft, 'left');
    setupMouseButton(btnMiddle, 'middle');
    setupMouseButton(btnRight, 'right');

    // 2. Volume Controls (Down, Mute, Up)
    const btnVolDown = document.getElementById('btn-vol-down');
    const btnVolMute = document.getElementById('btn-vol-mute');
    const btnVolUp = document.getElementById('btn-vol-up');

    function setupVolumeButton(btn, action) {
      if (!btn) return;
      const triggerAction = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.AppState.requestWakeLock();
        btn.classList.add('btn-pressed');
        window.AppState.haptic(20);
        window.AppConnection.send({ type: 'volume', action: action });

        setTimeout(() => {
          btn.classList.remove('btn-pressed');
        }, 120);
      };

      btn.addEventListener('touchstart', triggerAction, { passive: false });
      btn.addEventListener('mousedown', triggerAction);
    }

    setupVolumeButton(btnVolDown, 'down');
    setupVolumeButton(btnVolMute, 'mute');
    setupVolumeButton(btnVolUp, 'up');

    // 3. Shorts Video Mode Navigation (Prev Video: Up Arrow, Next Video: Down Arrow)
    const btnShortsPrev = document.getElementById('btn-shorts-prev') || document.getElementById('btn-prev-short');
    const btnShortsNext = document.getElementById('btn-shorts-next') || document.getElementById('btn-next-short');

    function setupShortsButton(btn, keyName) {
      if (!btn) return;
      const triggerKey = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.AppState.requestWakeLock();
        btn.classList.add('btn-pressed');
        window.AppState.haptic(25);
        window.AppConnection.send({ type: 'keyboard_key', key: keyName });

        setTimeout(() => {
          btn.classList.remove('btn-pressed');
        }, 120);
      };

      btn.addEventListener('touchstart', triggerKey, { passive: false });
      btn.addEventListener('mousedown', triggerKey);
    }

    setupShortsButton(btnShortsPrev, 'ArrowUp');
    setupShortsButton(btnShortsNext, 'ArrowDown');
  }

  window.ControlsModule = { init: initControls };
})(window);

