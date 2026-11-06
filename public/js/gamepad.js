/**
 * gamepad.js - Virtual Gaming Controller (Gamepad Engine & Touch Multi-Key Dispatcher)
 */
(function (window) {
  'use strict';

  const PRESETS = {
    fps: {
      name: 'FPS / Action',
      stick: { up: 'W', down: 'S', left: 'A', right: 'D' },
      A: { type: 'key', code: 'Space', hint: 'Space (Jump)' },
      B: { type: 'key', code: 'Shift', hint: 'Shift (Sprint)' },
      X: { type: 'key', code: 'f', hint: 'F (Use)' },
      Y: { type: 'key', code: 'e', hint: 'E (Action)' },
      L1: { type: 'key', code: 'q', hint: 'Q (Skill)' },
      R1: { type: 'key', code: 'r', hint: 'R (Reload)' },
      L2: { type: 'mouse', button: 'right', hint: 'Aim (R-Click)' },
      R2: { type: 'mouse', button: 'left', hint: 'Fire (L-Click)' },
      Select: { type: 'key', code: 'Tab', hint: 'Tab (Score)' },
      Start: { type: 'key', code: 'Escape', hint: 'Esc (Menu)' }
    },
    racing: {
      name: 'Racing / Driving',
      stick: { up: 'W', down: 'S', left: 'A', right: 'D' },
      A: { type: 'key', code: 'W', hint: 'W (Gas)' },
      B: { type: 'key', code: 'S', hint: 'S (Brake)' },
      X: { type: 'key', code: 'Space', hint: 'Space (Handbrake)' },
      Y: { type: 'key', code: 'Shift', hint: 'Shift (Nitro)' },
      L1: { type: 'key', code: 'b', hint: 'B (Look Back)' },
      R1: { type: 'key', code: 'c', hint: 'C (Camera)' },
      L2: { type: 'key', code: 'S', hint: 'Brake / Rev' },
      R2: { type: 'key', code: 'W', hint: 'Gas / Accelerate' },
      Select: { type: 'key', code: 'm', hint: 'M (Map)' },
      Start: { type: 'key', code: 'Escape', hint: 'Esc (Pause)' }
    },
    retro: {
      name: 'Retro / Arcade',
      stick: { up: 'Up', down: 'Down', left: 'Left', right: 'Right' },
      A: { type: 'key', code: 'z', hint: 'Z (Attack)' },
      B: { type: 'key', code: 'x', hint: 'X (Jump)' },
      X: { type: 'key', code: 'c', hint: 'C (Special)' },
      Y: { type: 'key', code: 'v', hint: 'V (Extra)' },
      L1: { type: 'key', code: 'a', hint: 'A' },
      R1: { type: 'key', code: 's', hint: 'S' },
      L2: { type: 'key', code: 'd', hint: 'D' },
      R2: { type: 'key', code: 'f', hint: 'F' },
      Select: { type: 'key', code: 'Shift', hint: 'Shift (Coin)' },
      Start: { type: 'key', code: 'Enter', hint: 'Enter (Start)' }
    }
  };

  let currentPresetKey = 'fps';
  let activeStickMode = 'stick'; // 'stick' | 'dpad'
  const activeKeys = new Set();
  const activeMouseBtns = new Set();

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
      if (activeMouseBtns.has(btn)) {
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

  function updateButtonHints() {
    const preset = PRESETS[currentPresetKey] || PRESETS.fps;

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

  function initGamepad() {
    const panel = document.getElementById('gamepad-panel');
    const closeBtn = document.getElementById('gp-close-btn');
    const presetSelect = document.getElementById('gp-preset-select');
    const stickModeBtn = document.getElementById('gp-stick-mode-btn');
    const joystickWrap = document.getElementById('gp-joystick-wrap');
    const dpadWrap = document.getElementById('gp-dpad-wrap');
    const joystickBase = document.getElementById('gp-joystick-base');
    const joystickThumb = document.getElementById('gp-joystick-thumb');

    if (!panel) return;

    // Preset selector
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        currentPresetKey = e.target.value;
        releaseAllInputs();
        updateButtonHints();
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

    // Bind action buttons with preset awareness
    const actionKeyMap = {
      'gp-btn-a': () => (PRESETS[currentPresetKey] || PRESETS.fps).A,
      'gp-btn-b': () => (PRESETS[currentPresetKey] || PRESETS.fps).B,
      'gp-btn-x': () => (PRESETS[currentPresetKey] || PRESETS.fps).X,
      'gp-btn-y': () => (PRESETS[currentPresetKey] || PRESETS.fps).Y,
      'gp-btn-l1': () => (PRESETS[currentPresetKey] || PRESETS.fps).L1,
      'gp-btn-r1': () => (PRESETS[currentPresetKey] || PRESETS.fps).R1,
      'gp-btn-l2': () => (PRESETS[currentPresetKey] || PRESETS.fps).L2,
      'gp-btn-r2': () => (PRESETS[currentPresetKey] || PRESETS.fps).R2,
      'gp-btn-select': () => (PRESETS[currentPresetKey] || PRESETS.fps).Select,
      'gp-btn-start': () => (PRESETS[currentPresetKey] || PRESETS.fps).Start
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
          const stick = (PRESETS[currentPresetKey] || PRESETS.fps).stick;
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
      const stick = (PRESETS[currentPresetKey] || PRESETS.fps).stick;

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

    updateButtonHints();
  }

  window.GamepadModule = {
    init: initGamepad,
    releaseAll: releaseAllInputs
  };
})(window);
