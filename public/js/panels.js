/**
 * panels.js - Settings Drawer, Keyboard Drawer, and UI Modals Management
 */
(function (window) {
  'use strict';

  function initPanels() {
    // 1. Settings Drawer Elements
    const settingsToggleBtn = document.getElementById('settings-toggle-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsCloseBtn = document.getElementById('settings-close-btn');

    const mouseSensSlider = document.getElementById('mouse-sens-slider');
    const mouseSensVal = document.getElementById('mouse-sens-val');
    const scrollSensSlider = document.getElementById('scroll-sens-slider');
    const scrollSensVal = document.getElementById('scroll-sens-val');
    const gyroSensSlider = document.getElementById('gyro-sens-slider');
    const gyroSensVal = document.getElementById('gyro-sens-val');
    const invertScrollToggle = document.getElementById('invert-scroll-toggle');
    const invertDesc = document.getElementById('invert-desc');
    const btnResetSettings = document.getElementById('btn-reset-settings');

    // 2. Keyboard Drawer Elements
    const keyboardToggleBtn = document.getElementById('keyboard-toggle-btn');
    const keyboardPanel = document.getElementById('keyboard-panel');
    const kbCloseBtn = document.getElementById('kb-close-btn');
    const liveTypeInput = document.getElementById('live-type-input');
    const batchTextInput = document.getElementById('batch-text-input');

    // 3. Fullscreen Button
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    function updateSettingsUI() {
      if (mouseSensSlider && mouseSensVal) {
        mouseSensSlider.value = window.AppState.mouseSensitivity.toFixed(1);
        mouseSensVal.textContent = window.AppState.mouseSensitivity.toFixed(1) + 'x';
      }
      if (scrollSensSlider && scrollSensVal) {
        scrollSensSlider.value = window.AppState.scrollSensitivity.toFixed(1);
        scrollSensVal.textContent = window.AppState.scrollSensitivity.toFixed(1) + 'x';
      }
      if (gyroSensSlider && gyroSensVal) {
        gyroSensSlider.value = window.AppState.gyroSensitivity.toFixed(1);
        gyroSensVal.textContent = window.AppState.gyroSensitivity.toFixed(1) + 'x';
      }
      if (invertScrollToggle && invertDesc) {
        invertScrollToggle.checked = window.AppState.invertScroll;
        invertDesc.textContent = window.AppState.invertScroll 
          ? 'Standard (swipe up = scroll up)' 
          : 'Natural (swipe up = scroll down)';
      }
    }

    updateSettingsUI();

    if (mouseSensSlider) {
      mouseSensSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        window.AppState.setMouseSensitivity(val);
        if (mouseSensVal) mouseSensVal.textContent = val.toFixed(1) + 'x';
      });
    }

    if (scrollSensSlider) {
      scrollSensSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        window.AppState.setScrollSensitivity(val);
        if (scrollSensVal) scrollSensVal.textContent = val.toFixed(1) + 'x';
      });
    }

    if (gyroSensSlider) {
      gyroSensSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        window.AppState.setGyroSensitivity(val);
        if (gyroSensVal) gyroSensVal.textContent = val.toFixed(1) + 'x';
      });
    }

    if (invertScrollToggle) {
      invertScrollToggle.addEventListener('change', (e) => {
        window.AppState.setInvertScroll(e.target.checked);
        if (invertDesc) {
          invertDesc.textContent = e.target.checked 
            ? 'Standard (swipe up = scroll up)' 
            : 'Natural (swipe up = scroll down)';
        }
        window.AppState.haptic(15);
      });
    }

    if (btnResetSettings) {
      btnResetSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        window.AppState.resetDefaults();
        updateSettingsUI();
        window.AppState.haptic(25);
      });
    }

    function openSettings() {
      closeKeyboard();
      if (settingsPanel) settingsPanel.classList.add('open');
      if (settingsToggleBtn) settingsToggleBtn.classList.add('active');
    }

    function closeSettings() {
      if (settingsPanel) settingsPanel.classList.remove('open');
      if (settingsToggleBtn) settingsToggleBtn.classList.remove('active');
    }

    function openKeyboard() {
      closeSettings();
      if (keyboardPanel) keyboardPanel.classList.add('open');
      if (keyboardToggleBtn) keyboardToggleBtn.classList.add('active');
      if (liveTypeInput) setTimeout(() => liveTypeInput.focus(), 150);
    }

    function closeKeyboard() {
      if (keyboardPanel) keyboardPanel.classList.remove('open');
      if (keyboardToggleBtn) keyboardToggleBtn.classList.remove('active');
      if (liveTypeInput) liveTypeInput.blur();
      if (batchTextInput) batchTextInput.blur();
    }

    if (settingsToggleBtn) {
      settingsToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (settingsPanel && settingsPanel.classList.contains('open')) {
          closeSettings();
        } else {
          openSettings();
        }
      });
    }

    if (settingsCloseBtn) {
      settingsCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeSettings();
      });
    }

    if (keyboardToggleBtn) {
      keyboardToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (keyboardPanel && keyboardPanel.classList.contains('open')) {
          closeKeyboard();
        } else {
          openKeyboard();
        }
      });
    }

    if (kbCloseBtn) {
      kbCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeKeyboard();
      });
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }
  }

  window.PanelsModule = { init: initPanels };
})(window);

