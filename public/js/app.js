/**
 * app.js - Main Client Application Bootstrap & Global Touch Controls
 */
(function (window) {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    // 1. Global Touch Prevention to avoid unwanted browser gestures/bounces
    window.addEventListener('touchmove', (e) => {
      if (e.target.closest('#keyboard-panel input, #settings-panel input, #settings-panel label, .range-slider')) {
        return;
      }
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchstart', () => {
      window.AppState.requestWakeLock();
    }, { passive: true });

    window.addEventListener('gesturestart', (e) => e.preventDefault());
    window.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('#keyboard-panel input, #settings-panel input')) {
        e.preventDefault();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        window.AppState.requestWakeLock();
      }
    });

    // 2. Initialize Core Modules
    window.AppConnection.connect();
    window.TrackpadModule.init();
    window.AirMouseModule.init();
    window.ControlsModule.init();
    window.MicModule.init();
    if (window.CamModule) window.CamModule.init();
    if (window.AudioRelayModule) window.AudioRelayModule.init();
    window.KeyboardModule.init();
    window.PanelsModule.init();

    // 3. Register Offline-First PWA Service Worker for instant load & auto-discovery
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch((err) => {
        console.warn('[ServiceWorker] Registration warning:', err.message || err);
      });
    }

    console.log('[RemoteMouse] All modules initialized successfully.');
  });
})(window);

