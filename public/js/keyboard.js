/**
 * keyboard.js - Virtual Keyboard Direct Keystroke Streaming & Action Keys
 */
(function (window) {
  'use strict';

  function initKeyboard() {
    const liveTypeInput = document.getElementById('live-type-input');
    const btnOpenIme = document.getElementById('btn-open-ime');

    if (!liveTypeInput) return;

    let isComposing = false;

    // Tap Prompt Button to Focus Hidden Proxy Input & Trigger Mobile IME
    if (btnOpenIme) {
      btnOpenIme.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        liveTypeInput.focus();
      });
    }

    // Mobile Virtual Keyboard IME Composition Support
    liveTypeInput.addEventListener('compositionstart', () => {
      isComposing = true;
    });

    liveTypeInput.addEventListener('compositionend', (e) => {
      isComposing = false;
      if (e.data) {
        window.AppConnection.send({ type: 'keyboard_type', text: e.data });
      }
      liveTypeInput.value = '';
    });

    function resetState() {
      if (liveTypeInput) liveTypeInput.value = '';
    }

    // Expose resetState on module so panels.js can clear state when closing/opening
    window.KeyboardModule = window.KeyboardModule || {};
    window.KeyboardModule.resetState = resetState;
    window.KeyboardModule.focusInput = function () {
      if (liveTypeInput) {
        try {
          liveTypeInput.focus();
        } catch (_) {}
      }
    };

    // Special Keys on Live Input (Tab, Esc, Enter, Backspace)
    liveTypeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        window.AppConnection.send({ type: 'keyboard_key', key: 'Tab' });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        window.AppConnection.send({ type: 'keyboard_key', key: 'Escape' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        window.AppConnection.send({ type: 'keyboard_key', key: 'Enter' });
        resetState();
      }
    });

    // Real-Time Direct Keystroke Streaming (No persistent text state)
    liveTypeInput.addEventListener('input', (e) => {
      if (isComposing) return;

      const currentVal = liveTypeInput.value;

      if (e.inputType === 'deleteContentBackward') {
        window.AppConnection.send({ type: 'keyboard_key', key: 'Backspace' });
      } else if (e.inputType === 'insertLineBreak') {
        window.AppConnection.send({ type: 'keyboard_key', key: 'Enter' });
      } else if (currentVal.length > 0) {
        window.AppConnection.send({ type: 'keyboard_type', text: currentVal });
      }

      liveTypeInput.value = '';
    });

    // Quick Action Keys (Esc, Tab, Space, Backspace, Enter, Arrows)
    const actionKeys = document.querySelectorAll('.kb-key-btn');
    actionKeys.forEach((btn) => {
      const key = btn.dataset.key;
      if (!key) return;

      const handleKeyPress = (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.add('key-pressed');
        window.AppConnection.send({ type: 'keyboard_key', key: key });

        if (key === 'Enter') {
          resetState();
        }

        setTimeout(() => {
          btn.classList.remove('key-pressed');
        }, 100);
      };

      btn.addEventListener('touchstart', handleKeyPress, { passive: false });
      btn.addEventListener('mousedown', handleKeyPress);
    });
  }

  window.KeyboardModule = { 
    init: initKeyboard 
  };
})(window);
