/**
 * gamepad.js - Virtual Gaming Controller (Multiplayer Player Slots & Presets Engine)
 */
(function (window) {
  'use strict';

  const PLAYER_PROFILES = {
    p1: {
      name: 'Player 1',
      defaultPreset: 'fps',
      presets: {
        fps: {
          name: '🎯 FPS / Action (WASD)',
          stickLabel: 'MOVEMENT (WASD)',
          stick: { up: 'W', down: 'S', left: 'A', right: 'D' },
          A: { type: 'key', code: 'Space', hint: 'Space' },
          B: { type: 'key', code: 'Shift', hint: 'Shift' },
          X: { type: 'key', code: 'f', hint: 'F' },
          Y: { type: 'key', code: 'e', hint: 'E' },
          L1: { type: 'key', code: 'q', hint: 'Q' },
          R1: { type: 'key', code: 'r', hint: 'R' },
          L2: { type: 'mouse', button: 'right', hint: 'R-Click' },
          R2: { type: 'mouse', button: 'left', hint: 'L-Click' },
          Select: { type: 'key', code: 'Tab', hint: 'Tab' },
          Start: { type: 'key', code: 'Escape', hint: 'Esc' }
        },
        racing: {
          name: '🏎️ Racing / Driving',
          stickLabel: 'STEER (A / D)',
          stick: { up: 'W', down: 'S', left: 'A', right: 'D' },
          A: { type: 'key', code: 'W', hint: 'W (Gas)' },
          B: { type: 'key', code: 'S', hint: 'S (Brake)' },
          X: { type: 'key', code: 'Space', hint: 'Space' },
          Y: { type: 'key', code: 'Shift', hint: 'Nitro' },
          L1: { type: 'key', code: 'b', hint: 'B' },
          R1: { type: 'key', code: 'c', hint: 'C' },
          L2: { type: 'key', code: 'S', hint: 'Brake' },
          R2: { type: 'key', code: 'W', hint: 'Gas' },
          Select: { type: 'key', code: 'm', hint: 'M (Map)' },
          Start: { type: 'key', code: 'Escape', hint: 'Esc' }
        },
        retro: {
          name: '🕹️ Retro Arcade (WASD)',
          stickLabel: 'MOVEMENT (WASD)',
          stick: { up: 'W', down: 'S', left: 'A', right: 'D' },
          A: { type: 'key', code: 'z', hint: 'Z' },
          B: { type: 'key', code: 'x', hint: 'X' },
          X: { type: 'key', code: 'c', hint: 'C' },
          Y: { type: 'key', code: 'v', hint: 'V' },
          L1: { type: 'key', code: 'a', hint: 'A' },
          R1: { type: 'key', code: 's', hint: 'S' },
          L2: { type: 'key', code: 'd', hint: 'D' },
          R2: { type: 'key', code: 'f', hint: 'F' },
          Select: { type: 'key', code: 'Shift', hint: 'Shift' },
          Start: { type: 'key', code: 'Enter', hint: 'Enter' }
        }
      }
    },
    p2: {
      name: 'Player 2',
      defaultPreset: 'arcade_arrows',
      presets: {
        arcade_arrows: {
          name: '🎯 Arrows + Nums',
          stickLabel: 'MOVEMENT (ARROWS)',
          stick: { up: 'Up', down: 'Down', left: 'Left', right: 'Right' },
          A: { type: 'key', code: 'Enter', hint: 'Enter' },
          B: { type: 'key', code: 'Shift', hint: 'Shift' },
          X: { type: 'key', code: '1', hint: '1' },
          Y: { type: 'key', code: '2', hint: '2' },
          L1: { type: 'key', code: '4', hint: '4' },
          R1: { type: 'key', code: '5', hint: '5' },
          L2: { type: 'key', code: '7', hint: '7' },
          R2: { type: 'key', code: '8', hint: '8' },
          Select: { type: 'key', code: '9', hint: '9' },
          Start: { type: 'key', code: '0', hint: '0' }
        },
        split_ijkl: {
          name: '🕹️ IJKL Split-Screen',
          stickLabel: 'MOVEMENT (IJKL)',
          stick: { up: 'i', down: 'k', left: 'j', right: 'l' },
          A: { type: 'key', code: 'n', hint: 'N' },
          B: { type: 'key', code: 'm', hint: 'M' },
          X: { type: 'key', code: 'u', hint: 'U' },
          Y: { type: 'key', code: 'o', hint: 'O' },
          L1: { type: 'key', code: 'y', hint: 'Y' },
          R1: { type: 'key', code: 'p', hint: 'P' },
          L2: { type: 'key', code: 'h', hint: 'H' },
          R2: { type: 'key', code: 'Enter', hint: 'Enter' },
          Select: { type: 'key', code: '8', hint: '8' },
          Start: { type: 'key', code: '0', hint: '0' }
        }
      }
    },
    p3: {
      name: 'Player 3',
      defaultPreset: 'tfgh',
      presets: {
        tfgh: {
          name: '🎮 TFGH Split-Screen',
          stickLabel: 'MOVEMENT (TFGH)',
          stick: { up: 't', down: 'g', left: 'f', right: 'h' },
          A: { type: 'key', code: 'v', hint: 'V' },
          B: { type: 'key', code: 'b', hint: 'B' },
          X: { type: 'key', code: 'r', hint: 'R' },
          Y: { type: 'key', code: 'y', hint: 'Y' },
          L1: { type: 'key', code: 'c', hint: 'C' },
          R1: { type: 'key', code: 'n', hint: 'N' },
          L2: { type: 'key', code: 'x', hint: 'X' },
          R2: { type: 'key', code: 'z', hint: 'Z' },
          Select: { type: 'key', code: '7', hint: '7' },
          Start: { type: 'key', code: '8', hint: '8' }
        }
      }
    },
    p4: {
      name: 'Player 4',
      defaultPreset: 'nums',
      presets: {
        nums: {
          name: '🎯 Numbers 8426',
          stickLabel: 'MOVEMENT (8,4,2,6)',
          stick: { up: '8', down: '2', left: '4', right: '6' },
          A: { type: 'key', code: '5', hint: '5' },
          B: { type: 'key', code: '0', hint: '0' },
          X: { type: 'key', code: '1', hint: '1' },
          Y: { type: 'key', code: '3', hint: '3' },
          L1: { type: 'key', code: '7', hint: '7' },
          R1: { type: 'key', code: '9', hint: '9' },
          L2: { type: 'key', code: 'Enter', hint: 'Enter' },
          R2: { type: 'key', code: 'Space', hint: 'Space' },
          Select: { type: 'key', code: 'Tab', hint: 'Tab' },
          Start: { type: 'key', code: 'Escape', hint: 'Esc' }
        }
      }
    }
  };

  let currentPlayerId = 'p1';
  try {
    const savedP = localStorage.getItem('gamepad_player');
    if (savedP && PLAYER_PROFILES[savedP]) currentPlayerId = savedP;
  } catch (_) {}

  let currentPresetKey = (PLAYER_PROFILES[currentPlayerId] || PLAYER_PROFILES.p1).defaultPreset;
  try {
    const savedPr = localStorage.getItem('gamepad_preset');
    if (savedPr && (PLAYER_PROFILES[currentPlayerId] || PLAYER_PROFILES.p1).presets[savedPr]) {
      currentPresetKey = savedPr;
    }
  } catch (_) {}

  let activeStickMode = 'stick'; // 'stick' | 'dpad'
  const activeKeys = new Set();
  const activeMouseBtns = new Set();

  function getCurrentPreset() {
    const profile = PLAYER_PROFILES[currentPlayerId] || PLAYER_PROFILES.p1;
    return profile.presets[currentPresetKey] || profile.presets[profile.defaultPreset];
  }

  function triggerHaptic(ms = 12) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (_) {}
  }

  function sendPress(action) {
    if (!action) return;
    if (action.type === 'key') {
      const code = action.code;
      if (!activeKeys.has(code)) {
        activeKeys.add(code);
        window.AppConnection.send({ type: 'keydown', key: code });
      }
    } else if (action.type === 'mouse') {
      const btn = action.button || 'left';
      if (!activeMouseBtns.has(btn)) {
        activeMouseBtns.add(btn);
        window.AppConnection.send({ type: 'mousedown', button: btn });
      }
    }
  }

  function sendRelease(action) {
    if (!action) return;
    if (action.type === 'key') {
      const code = action.code;
      if (activeKeys.has(code)) {
        activeKeys.delete(code);
        window.AppConnection.send({ type: 'keyup', key: code });
      }
    } else if (action.type === 'mouse') {
      const btn = action.button || 'left';
      if (!activeMouseBtns.has(btn)) {
        activeMouseBtns.delete(btn);
        window.AppConnection.send({ type: 'mouseup', button: btn });
      }
    }
  }

  function releaseAllInputs() {
    activeKeys.forEach((k) => {
      window.AppConnection.send({ type: 'keyup', key: k });
    });
    activeKeys.clear();

    activeMouseBtns.forEach((b) => {
      window.AppConnection.send({ type: 'mouseup', button: b });
    });
    activeMouseBtns.clear();
  }

  function updateUIForPreset() {
    const preset = getCurrentPreset();

    // Update Stick Label
    const stickLabel = document.querySelector('.gp-stick-label');
    if (stickLabel && preset.stickLabel) {
      stickLabel.textContent = preset.stickLabel;
    }

    // Update Action Button Hints
    const btnMappings = [
      { id: 'gp-btn-a', act: preset.A },
      { id: 'gp-btn-b', act: preset.B },
      { id: 'gp-btn-x', act: preset.X },
      { id: 'gp-btn-y', act: preset.Y },
      { id: 'gp-btn-l1', act: preset.L1 },
      { id: 'gp-btn-r1', act: preset.R1 },
      { id: 'gp-btn-l2', act: preset.L2 },
      { id: 'gp-btn-r2', act: preset.R2 }
    ];

    btnMappings.forEach(({ id, act }) => {
      const el = document.getElementById(id);
      if (!el || !act) return;
      const hint = el.querySelector('.gp-key-hint');
      if (hint) {
        hint.textContent = act.hint ? act.hint.split(' ')[0] : (act.code || '');
      }
    });
  }

  function populatePresetDropdown() {
    const presetSelect = document.getElementById('gp-preset-select');
    if (!presetSelect) return;

    const profile = PLAYER_PROFILES[currentPlayerId] || PLAYER_PROFILES.p1;
    presetSelect.innerHTML = '';

    Object.entries(profile.presets).forEach(([key, preset]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = preset.name;
      presetSelect.appendChild(opt);
    });

    presetSelect.value = currentPresetKey;
  }

  function initGamepad() {
    const panel = document.getElementById('gamepad-panel');
    const closeBtn = document.getElementById('gp-close-btn');
    const playerSelect = document.getElementById('gp-player-select');
    const presetSelect = document.getElementById('gp-preset-select');
    const stickModeBtn = document.getElementById('gp-stick-mode-btn');
    const joystickWrap = document.getElementById('gp-joystick-wrap');
    const dpadWrap = document.getElementById('gp-dpad-wrap');
    const joystickBase = document.getElementById('gp-joystick-base');
    const joystickThumb = document.getElementById('gp-joystick-thumb');

    if (!panel) return;

    // Player slot selector
    if (playerSelect) {
      playerSelect.value = currentPlayerId;
      playerSelect.addEventListener('change', (e) => {
        const newPlayer = e.target.value;
        if (PLAYER_PROFILES[newPlayer]) {
          currentPlayerId = newPlayer;
          try { localStorage.setItem('gamepad_player', newPlayer); } catch (_) {}

          const profile = PLAYER_PROFILES[newPlayer];
          if (!profile.presets[currentPresetKey]) {
            currentPresetKey = profile.defaultPreset;
            try { localStorage.setItem('gamepad_preset', currentPresetKey); } catch (_) {}
          }

          releaseAllInputs();
          populatePresetDropdown();
          updateUIForPreset();
        }
      });
    }

    // Preset selector
    if (presetSelect) {
      populatePresetDropdown();
      presetSelect.addEventListener('change', (e) => {
        currentPresetKey = e.target.value;
        try { localStorage.setItem('gamepad_preset', currentPresetKey); } catch (_) {}
        releaseAllInputs();
        updateUIForPreset();
      });
    }

    // Toggle Joystick / D-Pad
    if (stickModeBtn && joystickWrap && dpadWrap) {
      stickModeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        releaseAllInputs();
        if (activeStickMode === 'stick') {
          activeStickMode = 'dpad';
          joystickWrap.style.display = 'none';
          dpadWrap.style.display = 'flex';
          stickModeBtn.textContent = '🕹️';
        } else {
          activeStickMode = 'stick';
          joystickWrap.style.display = 'flex';
          dpadWrap.style.display = 'none';
          stickModeBtn.textContent = '🎛️';
        }
      });
    }

    // Setup Multi-Touch Buttons (A, B, X, Y, L1, R1, L2, R2, Select, Start, D-Pad, Nums)
    function attachButtonListeners(btn, getAction) {
      if (!btn) return;

      const onDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        triggerHaptic(15);
        btn.classList.add('gp-btn-active');
        const action = typeof getAction === 'function' ? getAction() : getAction;
        sendPress(action);
      };

      const onUp = (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.remove('gp-btn-active');
        const action = typeof getAction === 'function' ? getAction() : getAction;
        sendRelease(action);
      };

      btn.addEventListener('touchstart', onDown, { passive: false });
      btn.addEventListener('touchend', onUp, { passive: false });
      btn.addEventListener('touchcancel', onUp, { passive: false });
      btn.addEventListener('mousedown', onDown);
      btn.addEventListener('mouseup', onUp);
      btn.addEventListener('mouseleave', onUp);
    }

    // Bind action buttons with current player & preset awareness
    const actionKeyMap = {
      'gp-btn-a': () => getCurrentPreset().A,
      'gp-btn-b': () => getCurrentPreset().B,
      'gp-btn-x': () => getCurrentPreset().X,
      'gp-btn-y': () => getCurrentPreset().Y,
      'gp-btn-l1': () => getCurrentPreset().L1,
      'gp-btn-r1': () => getCurrentPreset().R1,
      'gp-btn-l2': () => getCurrentPreset().L2,
      'gp-btn-r2': () => getCurrentPreset().R2,
      'gp-btn-select': () => getCurrentPreset().Select,
      'gp-btn-start': () => getCurrentPreset().Start
    };

    Object.entries(actionKeyMap).forEach(([id, getAction]) => {
      const el = document.getElementById(id);
      if (el) attachButtonListeners(el, getAction);
    });

    // D-Pad buttons
    const dpadButtons = [
      { id: 'gp-dpad-up', dir: 'up' },
      { id: 'gp-dpad-down', dir: 'down' },
      { id: 'gp-dpad-left', dir: 'left' },
      { id: 'gp-dpad-right', dir: 'right' }
    ];

    dpadButtons.forEach(({ id, dir }) => {
      const el = document.getElementById(id);
      if (el) {
        attachButtonListeners(el, () => {
          const stick = getCurrentPreset().stick;
          return { type: 'key', code: stick[dir] };
        });
      }
    });

    // Quick numeric & sub buttons
    document.querySelectorAll('.gp-num-btn, .gp-sub-btn').forEach((btn) => {
      const key = btn.dataset.key;
      if (key) {
        attachButtonListeners(btn, { type: 'key', code: key });
      }
    });

    // Analog Thumbstick Engine
    let stickTouchId = null;
    let stickCenterX = 0;
    let stickCenterY = 0;
    const MAX_RADIUS = 46;
    const DEADZONE = 12;

    const stickActiveDirections = { up: false, down: false, left: false, right: false };

    function syncStickDirections(newDirs) {
      const stick = getCurrentPreset().stick;

      ['up', 'down', 'left', 'right'].forEach((dir) => {
        const code = stick[dir];
        if (newDirs[dir] && !stickActiveDirections[dir]) {
          stickActiveDirections[dir] = true;
          sendPress({ type: 'key', code });
        } else if (!newDirs[dir] && stickActiveDirections[dir]) {
          stickActiveDirections[dir] = false;
          sendRelease({ type: 'key', code });
        }
      });
    }

    function resetJoystick() {
      if (joystickThumb) {
        joystickThumb.style.transform = 'translate(0px, 0px)';
      }
      syncStickDirections({ up: false, down: false, left: false, right: false });
      stickTouchId = null;
    }

    if (joystickBase && joystickThumb) {
      joystickBase.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (stickTouchId !== null) return;

        const touch = e.changedTouches[0];
        stickTouchId = touch.identifier;

        const rect = joystickBase.getBoundingClientRect();
        stickCenterX = rect.left + rect.width / 2;
        stickCenterY = rect.top + rect.height / 2;

        handleStickMove(touch.clientX, touch.clientY);
      }, { passive: false });

      const onTouchMove = (e) => {
        if (stickTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === stickTouchId) {
            e.preventDefault();
            handleStickMove(touch.clientX, touch.clientY);
            break;
          }
        }
      };

      const onTouchEnd = (e) => {
        if (stickTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === stickTouchId) {
            e.preventDefault();
            resetJoystick();
            break;
          }
        }
      };

      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd, { passive: false });
      window.addEventListener('touchcancel', onTouchEnd, { passive: false });

      function handleStickMove(clientX, clientY) {
        const rawDx = clientX - stickCenterX;
        const rawDy = clientY - stickCenterY;
        const dist = Math.hypot(rawDx, rawDy);

        let clampedDx = rawDx;
        let clampedDy = rawDy;

        if (dist > MAX_RADIUS) {
          const angle = Math.atan2(rawDy, rawDx);
          clampedDx = Math.cos(angle) * MAX_RADIUS;
          clampedDy = Math.sin(angle) * MAX_RADIUS;
        }

        joystickThumb.style.transform = `translate(${clampedDx}px, ${clampedDy}px)`;

        // Determine 8-way directional booleans based on angle & deadzone
        const newDirs = { up: false, down: false, left: false, right: false };

        if (dist >= DEADZONE) {
          const normX = clampedDx / (dist || 1);
          const normY = clampedDy / (dist || 1);

          // Threshold at 0.38 allows smooth 8-way diagonals (e.g. W+D)
          if (normY < -0.38) newDirs.up = true;
          if (normY > 0.38) newDirs.down = true;
          if (normX < -0.38) newDirs.left = true;
          if (normX > 0.38) newDirs.right = true;
        }

        syncStickDirections(newDirs);
      }
    }

    // Close Button
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.PanelsModule && typeof window.PanelsModule.closeGamepad === 'function') {
          window.PanelsModule.closeGamepad();
        }
      });
    }

    updateUIForPreset();
  }

  window.GamepadModule = {
    init: initGamepad,
    releaseAll: releaseAllInputs
  };
})(window);
