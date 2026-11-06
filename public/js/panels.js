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

    // 2.5 Gaming Controller (Gamepad) Elements
    const gamepadToggleBtn = document.getElementById('gamepad-toggle-btn');
    const gamepadPanel = document.getElementById('gamepad-panel');
    const menuGamepadBtn = document.getElementById('menu-gamepad-btn');

    // 3. Fullscreen Button
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    // 4. Hamburger Menu Drawer Elements
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const menuDrawer = document.getElementById('menu-drawer');
    const menuCloseBtn = document.getElementById('menu-close-btn');
    const menuActiveDot = document.getElementById('menu-active-dot');

    const menuAudiorelayBtn = document.getElementById('menu-audiorelay-btn');
    const menuCamBtn = document.getElementById('menu-cam-btn');
    const menuMicBtn = document.getElementById('menu-mic-btn');
    const menuKeyboardBtn = document.getElementById('menu-keyboard-btn');
    const menuSettingsBtn = document.getElementById('menu-settings-btn');
    const menuFullscreenBtn = document.getElementById('menu-fullscreen-btn');

    const audiorelayToggleBtn = document.getElementById('audiorelay-toggle-btn');
    const camToggleBtn = document.getElementById('cam-toggle-btn');
    const micToggleBtn = document.getElementById('mic-toggle-btn');

    function updateMenuStatus() {
      const isAudioActive = audiorelayToggleBtn && audiorelayToggleBtn.classList.contains('streaming');
      const isCamActive = camToggleBtn && camToggleBtn.classList.contains('streaming');
      const isMicActive = micToggleBtn && micToggleBtn.classList.contains('recording');

      if (menuAudiorelayBtn) {
        menuAudiorelayBtn.textContent = isAudioActive ? 'Stop' : 'Start';
        menuAudiorelayBtn.classList.toggle('active', isAudioActive);
      }
      if (menuCamBtn) {
        menuCamBtn.textContent = isCamActive ? 'Stop' : 'Start';
        menuCamBtn.classList.toggle('active', isCamActive);
      }
      if (menuMicBtn) {
        menuMicBtn.textContent = isMicActive ? 'Stop' : 'Start';
        menuMicBtn.classList.toggle('active', isMicActive);
      }

      if (menuActiveDot) {
        menuActiveDot.style.display = (isAudioActive || isCamActive || isMicActive) ? 'block' : 'none';
      }
    }

    function openMenu() {
      closeSettings();
      closeKeyboard();
      if (menuDrawer) menuDrawer.classList.add('open');
      if (menuToggleBtn) menuToggleBtn.classList.add('active');
      window.AppState.haptic(20);
      updateMenuStatus();
    }

    function closeMenu() {
      if (menuDrawer) menuDrawer.classList.remove('open');
      if (menuToggleBtn) menuToggleBtn.classList.remove('active');
    }

    if (menuToggleBtn) {
      menuToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (menuDrawer && menuDrawer.classList.contains('open')) {
          closeMenu();
        } else {
          openMenu();
        }
      });
    }

    if (menuCloseBtn) {
      menuCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
      });
    }

    // Connect Menu Item Actions
    if (menuAudiorelayBtn && audiorelayToggleBtn) {
      menuAudiorelayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        audiorelayToggleBtn.click();
        closeMenu();
        setTimeout(updateMenuStatus, 150);
      });
    }

    if (menuCamBtn && camToggleBtn) {
      menuCamBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        camToggleBtn.click();
        closeMenu();
        setTimeout(updateMenuStatus, 150);
      });
    }

    if (menuMicBtn && micToggleBtn) {
      menuMicBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        micToggleBtn.click();
        closeMenu();
        setTimeout(updateMenuStatus, 150);
      });
    }

    if (menuGamepadBtn) {
      menuGamepadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        setTimeout(openGamepad, 100);
      });
    }

    if (menuKeyboardBtn) {
      menuKeyboardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        setTimeout(openKeyboard, 100);
      });
    }

    if (menuSettingsBtn) {
      menuSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        setTimeout(openSettings, 100);
      });
    }

    if (menuFullscreenBtn && fullscreenBtn) {
      menuFullscreenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fullscreenBtn.click();
        closeMenu();
      });
    }

    // 5. PWA Install App Handler
    let deferredInstallPrompt = null;
    const menuInstallBtn = document.getElementById('menu-install-btn');
    const installModal = document.getElementById('install-modal');
    const installModalClose = document.getElementById('install-modal-close');
    const installModalOkBtn = document.getElementById('install-modal-ok-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (menuInstallBtn) {
        menuInstallBtn.textContent = 'Install';
      }
    });

    if (menuInstallBtn) {
      menuInstallBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeMenu();

        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          const choice = await deferredInstallPrompt.userChoice;
          if (choice && choice.outcome === 'accepted') {
            menuInstallBtn.textContent = 'Installed';
          }
          deferredInstallPrompt = null;
        } else {
          if (installModal) installModal.style.display = 'flex';
        }
      });
    }

    if (installModalClose) {
      installModalClose.addEventListener('click', () => {
        if (installModal) installModal.style.display = 'none';
      });
    }
    if (installModalOkBtn) {
      installModalOkBtn.addEventListener('click', () => {
        if (installModal) installModal.style.display = 'none';
      });
    }

    // 6. File & Data Transfer (Mobile -> PC)
    const menuFileshareBtn = document.getElementById('menu-fileshare-btn');
    const fileshareModal = document.getElementById('fileshare-modal');
    const fileshareModalClose = document.getElementById('fileshare-modal-close');
    const btnPickFiles = document.getElementById('btn-pick-files');
    const fileTransferInput = document.getElementById('file-transfer-input');
    const fileshareProgressWrap = document.getElementById('fileshare-progress-wrap');
    const fileshareProgressBar = document.getElementById('fileshare-progress-bar');
    const fileshareStatus = document.getElementById('fileshare-status');

    const clipboardShareInput = document.getElementById('clipboard-share-input');
    const btnSendClipboard = document.getElementById('btn-send-clipboard');
    const clipboardStatus = document.getElementById('clipboard-status');

    if (menuFileshareBtn) {
      menuFileshareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        if (fileshareModal) fileshareModal.style.display = 'flex';
      });
    }

    if (fileshareModalClose) {
      fileshareModalClose.addEventListener('click', () => {
        if (fileshareModal) fileshareModal.style.display = 'none';
      });
    }

    if (btnPickFiles && fileTransferInput) {
      btnPickFiles.addEventListener('click', () => {
        fileTransferInput.click();
      });

      fileTransferInput.addEventListener('change', async () => {
        const files = fileTransferInput.files;
        if (!files || files.length === 0) return;

        fileshareProgressWrap.style.display = 'flex';
        fileshareStatus.className = 'fileshare-status';

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileName = file.name;
          const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);

          await new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `/api/upload?filename=${encodeURIComponent(fileName)}`, true);
            xhr.setRequestHeader('x-filename', encodeURIComponent(fileName));

            xhr.upload.onprogress = (evt) => {
              if (evt.lengthComputable) {
                const pct = Math.round((evt.loaded / evt.total) * 100);
                fileshareProgressBar.style.width = pct + '%';
                fileshareStatus.textContent = `Uploading ${fileName} (${fileSizeMb}MB): ${pct}%`;
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                fileshareProgressBar.style.width = '100%';
                fileshareStatus.className = 'fileshare-status success';
                fileshareStatus.textContent = `✅ Saved to PC Downloads: ${fileName}`;
              } else {
                fileshareStatus.className = 'fileshare-status error';
                fileshareStatus.textContent = `❌ Upload failed for ${fileName}`;
              }
              resolve();
            };

            xhr.onerror = () => {
              fileshareStatus.className = 'fileshare-status error';
              fileshareStatus.textContent = `❌ Network error uploading ${fileName}`;
              resolve();
            };

            xhr.send(file);
          });
        }

        fileTransferInput.value = '';
      });
    }

    if (btnSendClipboard && clipboardShareInput) {
      btnSendClipboard.addEventListener('click', async () => {
        const text = clipboardShareInput.value.trim();
        if (!text) return;

        btnSendClipboard.disabled = true;
        btnSendClipboard.textContent = 'Sending...';

        try {
          const res = await fetch('/api/clipboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
          });

          if (res.ok) {
            clipboardStatus.style.display = 'block';
            clipboardStatus.textContent = '✅ Copied to Windows Clipboard!';
            clipboardShareInput.value = '';
            setTimeout(() => {
              clipboardStatus.style.display = 'none';
            }, 3000);
          } else {
            alert('Failed to send text to PC.');
          }
        } catch (_) {
          alert('Network error sending text to PC.');
        } finally {
          btnSendClipboard.disabled = false;
          btnSendClipboard.textContent = 'Copy to PC';
        }
      });
    }

    // Close drawers on outside click
    document.addEventListener('click', (e) => {
      if (menuDrawer && menuDrawer.classList.contains('open')) {
        if (!menuDrawer.contains(e.target) && !menuToggleBtn.contains(e.target)) {
          closeMenu();
        }
      }
    });

    // Check menu status periodically
    setInterval(updateMenuStatus, 1000);

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
      closeGamepad();
      if (settingsPanel) settingsPanel.classList.add('open');
      if (settingsToggleBtn) settingsToggleBtn.classList.add('active');
    }

    function closeSettings() {
      if (settingsPanel) settingsPanel.classList.remove('open');
      if (settingsToggleBtn) settingsToggleBtn.classList.remove('active');
    }

    function openKeyboard() {
      closeSettings();
      closeGamepad();
      closeMenu();
      if (keyboardPanel) keyboardPanel.classList.add('open');
      if (keyboardToggleBtn) keyboardToggleBtn.classList.add('active');
      if (liveTypeInput) setTimeout(() => liveTypeInput.focus(), 150);
    }

    function closeKeyboard() {
      if (keyboardPanel) keyboardPanel.classList.remove('open');
      if (keyboardToggleBtn) keyboardToggleBtn.classList.remove('active');
      if (liveTypeInput) {
        liveTypeInput.blur();
        liveTypeInput.value = '';
      }
      if (window.KeyboardModule && typeof window.KeyboardModule.resetState === 'function') {
        window.KeyboardModule.resetState();
      }
    }

    function openGamepad() {
      closeSettings();
      closeKeyboard();
      closeMenu();
      if (gamepadPanel) gamepadPanel.classList.add('open');
      if (gamepadToggleBtn) gamepadToggleBtn.classList.add('active');
    }

    function closeGamepad() {
      if (gamepadPanel) gamepadPanel.classList.remove('open');
      if (gamepadToggleBtn) gamepadToggleBtn.classList.remove('active');
      if (window.GamepadModule && typeof window.GamepadModule.releaseAll === 'function') {
        window.GamepadModule.releaseAll();
      }
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

    if (gamepadToggleBtn) {
      gamepadToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (gamepadPanel && gamepadPanel.classList.contains('open')) {
          closeGamepad();
        } else {
          openGamepad();
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

    // Expose panel functions globally
    window.PanelsModule = {
      init: initPanels,
      openKeyboard,
      closeKeyboard,
      openGamepad,
      closeGamepad,
      openSettings,
      closeSettings,
      openMenu,
      closeMenu
    };
  }

  window.PanelsModule = { init: initPanels };
})(window);

