/**
 * state.js - Central State & Configuration Management
 */
(function (window) {
  'use strict';

  const STORAGE_KEYS = {
    MOUSE_SENS: 'remote_mouse_sens',
    SCROLL_SENS: 'remote_scroll_sens',
    INVERT_SCROLL: 'remote_invert_scroll',
    GYRO_SENS: 'remote_gyro_sens'
  };

  const DEFAULTS = {
    MOUSE_SENS: 1.8,
    SCROLL_SENS: 12.0,
    INVERT_SCROLL: false,
    GYRO_SENS: 2.2
  };

  function loadStoredFloat(key, defaultVal) {
    const val = parseFloat(localStorage.getItem(key));
    return isNaN(val) ? defaultVal : val;
  }

  let scrollSens = loadStoredFloat(STORAGE_KEYS.SCROLL_SENS, DEFAULTS.SCROLL_SENS);
  if (scrollSens <= 3.0) {
    scrollSens = DEFAULTS.SCROLL_SENS;
    localStorage.setItem(STORAGE_KEYS.SCROLL_SENS, DEFAULTS.SCROLL_SENS.toString());
  }

  const State = {
    mouseSensitivity: loadStoredFloat(STORAGE_KEYS.MOUSE_SENS, DEFAULTS.MOUSE_SENS),
    scrollSensitivity: scrollSens,
    invertScroll: localStorage.getItem(STORAGE_KEYS.INVERT_SCROLL) === 'true',
    gyroSensitivity: loadStoredFloat(STORAGE_KEYS.GYRO_SENS, DEFAULTS.GYRO_SENS),
    currentMode: 'trackpad', // 'trackpad' | 'air'
    airAimBehavior: 'hold',  // 'hold' | 'toggle'
    
    setMouseSensitivity(val) {
      this.mouseSensitivity = val;
      localStorage.setItem(STORAGE_KEYS.MOUSE_SENS, val.toString());
    },

    setScrollSensitivity(val) {
      this.scrollSensitivity = val;
      localStorage.setItem(STORAGE_KEYS.SCROLL_SENS, val.toString());
    },

    setGyroSensitivity(val) {
      this.gyroSensitivity = val;
      localStorage.setItem(STORAGE_KEYS.GYRO_SENS, val.toString());
    },

    setInvertScroll(val) {
      this.invertScroll = val;
      localStorage.setItem(STORAGE_KEYS.INVERT_SCROLL, val.toString());
    },

    resetDefaults() {
      this.mouseSensitivity = DEFAULTS.MOUSE_SENS;
      this.scrollSensitivity = DEFAULTS.SCROLL_SENS;
      this.gyroSensitivity = DEFAULTS.GYRO_SENS;
      this.invertScroll = DEFAULTS.INVERT_SCROLL;

      localStorage.setItem(STORAGE_KEYS.MOUSE_SENS, DEFAULTS.MOUSE_SENS.toString());
      localStorage.setItem(STORAGE_KEYS.SCROLL_SENS, DEFAULTS.SCROLL_SENS.toString());
      localStorage.setItem(STORAGE_KEYS.GYRO_SENS, DEFAULTS.GYRO_SENS.toString());
      localStorage.setItem(STORAGE_KEYS.INVERT_SCROLL, DEFAULTS.INVERT_SCROLL.toString());
    },

    haptic(_duration = 20) {
      // All vibration effects permanently disabled per user request
    }
  };

  // Screen Wake Lock API Helper
  let wakeLock = null;
  async function requestWakeLock() {
    if ('wakeLock' in navigator && !wakeLock) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          wakeLock = null;
        });
      } catch (_) {}
    }
  }

  State.requestWakeLock = requestWakeLock;
  window.AppState = State;
})(window);

