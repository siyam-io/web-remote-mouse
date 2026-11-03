/**
 * keyboard.js - Virtual Keyboard Live Typing, Batch Sender, and Action Keys
 */
(function (window) {
  'use strict';

  function initKeyboard() {
    const liveTypeInput = document.getElementById('live-type-input');
    const batchTextInput = document.getElementById('batch-text-input');
    const btnSendText = document.getElementById('btn-send-text');

    if (!liveTypeInput) return;

    let prevLiveVal = '';
    let isComposing = false;

    // Mobile Virtual Keyboard IME Composition Support
    liveTypeInput.addEventListener('compositionstart', () => {
      isComposing = true;
    });

    liveTypeInput.addEventListener('compositionend', (e) => {
      isComposing = false;
      if (e.data) {
        window.AppConnection.send({ type: 'keyboard_type', text: e.data });
        window.AppState.haptic(15);
      }
      liveTypeInput.value = '';
      prevLiveVal = '';
    });

    // Special Keys on Live Input
    liveTypeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (liveTypeInput.value.length === 0) {
          e.preventDefault();
          window.AppConnection.send({ type: 'keyboard_key', key: 'Backspace' });
          window.AppState.haptic(15);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        window.AppConnection.send({ type: 'keyboard_key', key: 'Enter' });
        window.AppState.haptic(20);
        liveTypeInput.value = '';
        prevLiveVal = '';
      } else if (e.key === 'Tab') {
        e.preventDefault();
        window.AppConnection.send({ type: 'keyboard_key', key: 'Tab' });
        window.AppState.haptic(15);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        window.AppConnection.send({ type: 'keyboard_key', key: 'Escape' });
        window.AppState.haptic(15);
      }
    });

    // Handle character input from mobile virtual keyboards
    liveTypeInput.addEventListener('input', (e) => {
      if (isComposing) return;

      const currentVal = liveTypeInput.value;
      if (e.inputType === 'deleteContentBackward') {
        window.AppConnection.send({ type: 'keyboard_key', key: 'Backspace' });
        window.AppState.haptic(15);
      } else if (e.inputType === 'insertLineBreak') {
        window.AppConnection.send({ type: 'keyboard_key', key: 'Enter' });
        window.AppState.haptic(20);
      } else if (currentVal.length > prevLiveVal.length) {
        const added = currentVal.substring(prevLiveVal.length);
        window.AppConnection.send({ type: 'keyboard_type', text: added });
        window.AppState.haptic(15);
      } else if (currentVal.length < prevLiveVal.length) {
        const diff = prevLiveVal.length - currentVal.length;
        for (let i = 0; i < diff; i++) {
          window.AppConnection.send({ type: 'keyboard_key', key: 'Backspace' });
        }
        window.AppState.haptic(15);
      }

      if (currentVal.length > 20) {
        liveTypeInput.value = '';
        prevLiveVal = '';
      } else {
        prevLiveVal = currentVal;
      }
    });

    // Batch Text Sender
    function sendBatchText() {
      if (!batchTextInput) return;
      const text = batchTextInput.value;
      if (text && text.length > 0) {
        window.AppConnection.send({ type: 'keyboard_type', text: text });
        window.AppState.haptic(25);
        batchTextInput.value = '';
      }
    }

    if (btnSendText) {
      btnSendText.addEventListener('click', (e) => {
        e.preventDefault();
        sendBatchText();
      });
    }

    if (batchTextInput) {
      batchTextInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendBatchText();
        }
      });
    }

    // Quick Action Keys (Esc, Tab, Space, Backspace, Enter, Arrows)
    const actionKeys = document.querySelectorAll('.kb-key-btn');
    actionKeys.forEach((btn) => {
      const key = btn.dataset.key;
      if (!key) return;

      const handleKeyPress = (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.add('key-pressed');
        window.AppState.haptic(20);
        window.AppConnection.send({ type: 'keyboard_key', key: key });

        setTimeout(() => {
          btn.classList.remove('key-pressed');
        }, 100);
      };

      btn.addEventListener('touchstart', handleKeyPress, { passive: false });
      btn.addEventListener('mousedown', handleKeyPress);
    });
  }

  window.KeyboardModule = { init: initKeyboard };
})(window);

