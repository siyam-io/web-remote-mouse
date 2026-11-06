/**
 * keyboard.js - Virtual Keyboard Synchronized Live Full-Text Typing & Action Keys
 */
(function (window) {
  'use strict';

  function initKeyboard() {
    const liveTypeInput = document.getElementById('live-type-input');
    const btnClearText = document.getElementById('btn-clear-text');

    if (!liveTypeInput) return;

    let prevLiveVal = '';
    let isComposing = false;

    // Listen for Auto Keyboard Open event from PC (triggered when mouse clicks a textarea/input)
    window.AppConnection.onMessage((data) => {
      if (data && data.type === 'auto_keyboard_open') {
        const text = typeof data.text === 'string' ? data.text : '';
        if (window.PanelsModule && typeof window.PanelsModule.openKeyboard === 'function') {
          window.PanelsModule.openKeyboard();
        }
        liveTypeInput.value = text;
        prevLiveVal = text;

        setTimeout(() => {
          try {
            liveTypeInput.focus();
            liveTypeInput.setSelectionRange(text.length, text.length);
          } catch (_) {}
        }, 100);
      }
    });

    // Mobile Virtual Keyboard IME Composition Support
    liveTypeInput.addEventListener('compositionstart', () => {
      isComposing = true;
    });

    liveTypeInput.addEventListener('compositionend', (e) => {
      isComposing = false;
      if (e.data) {
        window.AppConnection.send({ type: 'keyboard_type', text: e.data });
      }
      prevLiveVal = liveTypeInput.value;
    });

    function resetState() {
      if (liveTypeInput) liveTypeInput.value = '';
      prevLiveVal = '';
    }

    // Special Keys on Live Input (Tab, Esc, Enter)
    liveTypeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        window.AppConnection.send({ type: 'keyboard_key', key: 'Tab' });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        window.AppConnection.send({ type: 'keyboard_key', key: 'Escape' });
      } else if (e.key === 'Enter') {
        // Send / Submit on Enter (without Shift): sends Enter to PC and clears state
        if (!e.shiftKey) {
          e.preventDefault();
          window.AppConnection.send({ type: 'keyboard_key', key: 'Enter' });
          resetState();
        }
      }
    });

    // Full-Text Diff Synchronizer (Syncs mobile textarea edits to PC in real-time)
    liveTypeInput.addEventListener('input', (e) => {
      if (isComposing) return;

      const currentVal = liveTypeInput.value;

      if (e.inputType === 'deleteContentBackward') {
        window.AppConnection.send({ type: 'keyboard_key', key: 'Backspace' });
        prevLiveVal = currentVal;
        return;
      }

      if (e.inputType === 'insertLineBreak') {
        window.AppConnection.send({ type: 'keyboard_key', key: 'Enter' });
        resetState();
        return;
      }

      // Appending to the end
      if (currentVal.startsWith(prevLiveVal)) {
        const added = currentVal.substring(prevLiveVal.length);
        if (added.length > 0) {
          window.AppConnection.send({ type: 'keyboard_type', text: added });
        }
      } else if (prevLiveVal.startsWith(currentVal)) {
        // Deleting from the end
        const diff = prevLiveVal.length - currentVal.length;
        for (let i = 0; i < diff; i++) {
          window.AppConnection.send({ type: 'keyboard_key', key: 'Backspace' });
        }
      } else {
        // Mid-text edit, paste, or block replacement: prefix & suffix diff
        let prefixLen = 0;
        while (prefixLen < prevLiveVal.length && prefixLen < currentVal.length && prevLiveVal[prefixLen] === currentVal[prefixLen]) {
          prefixLen++;
        }
        let suffixLen = 0;
        while (suffixLen < (prevLiveVal.length - prefixLen) && suffixLen < (currentVal.length - prefixLen) &&
               prevLiveVal[prevLiveVal.length - 1 - suffixLen] === currentVal[currentVal.length - 1 - suffixLen]) {
          suffixLen++;
        }
        const toDelete = prevLiveVal.length - prefixLen - suffixLen;
        const toInsert = currentVal.substring(prefixLen, currentVal.length - suffixLen);

        for (let i = 0; i < toDelete; i++) {
          window.AppConnection.send({ type: 'keyboard_key', key: 'Backspace' });
        }
        if (toInsert.length > 0) {
          window.AppConnection.send({ type: 'keyboard_type', text: toInsert });
        }
      }

      prevLiveVal = currentVal;
    });

    // Clear Text Button (Clears local typing box)
    if (btnClearText) {
      btnClearText.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        resetState();
        liveTypeInput.focus();
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
        window.AppConnection.send({ type: 'keyboard_key', key: key });

        // Update local text value for backspace/enter if applicable
        if (key === 'Backspace' && liveTypeInput.value.length > 0) {
          liveTypeInput.value = liveTypeInput.value.slice(0, -1);
          prevLiveVal = liveTypeInput.value;
        } else if (key === 'Space') {
          liveTypeInput.value += ' ';
          prevLiveVal = liveTypeInput.value;
        } else if (key === 'Enter') {
          // Send / Submit on Enter button: clear previous state
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
