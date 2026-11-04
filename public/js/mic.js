/**
 * mic.js - WO Mic (Wireless PC Microphone) & Voice Dictation Controller
 */
(function (window) {
  'use strict';

  function initMic() {
    const micToggleBtn = document.getElementById('mic-toggle-btn');
    const speechOverlay = document.getElementById('speech-overlay');
    const speechText = document.getElementById('speech-text');
    const speechModeBadge = document.getElementById('speech-mode-badge');
    const micModeToggle = document.getElementById('mic-mode-toggle');
    const micLevelContainer = document.getElementById('mic-level-container');
    const micLevelBar = document.getElementById('mic-level-bar');
    const speechLangBtn = document.getElementById('speech-lang-btn');
    const speechCloseBtn = document.getElementById('speech-close-btn');

    if (!micToggleBtn) return;

    let isRecording = false;
    let currentMode = 'womic'; // 'womic' (Live PC Mic) | 'dictation' (Speech-to-Text)

    // WO Mic Audio Streaming State
    let audioContext = null;
    let mediaStream = null;
    let scriptProcessor = null;
    let audioSource = null;

    // Dictation State
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let currentLang = 'en-US'; // 'en-US' | 'bn-BD'

    const isSecureOrigin = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    function updateModeUI() {
      if (currentMode === 'womic') {
        if (speechModeBadge) speechModeBadge.textContent = 'WO MIC (LIVE PC MIC)';
        if (micModeToggle) micModeToggle.textContent = 'Mode: Live';
        if (micLevelContainer) micLevelContainer.style.display = 'block';
        if (speechLangBtn) speechLangBtn.style.display = 'none';
        if (speechText) speechText.textContent = isRecording ? 'Streaming live audio to PC...' : 'Tap to start live mic';
      } else {
        if (speechModeBadge) speechModeBadge.textContent = 'VOICE TYPING';
        if (micModeToggle) micModeToggle.textContent = 'Mode: Type';
        if (micLevelContainer) micLevelContainer.style.display = 'none';
        if (speechLangBtn) speechLangBtn.style.display = 'block';
        if (speechText) speechText.textContent = isRecording ? 'Listening... Speak now' : 'Tap to start dictation';
      }
    }

    function setRecordingUI(active) {
      isRecording = active;
      if (active) {
        micToggleBtn.classList.add('recording');
        if (speechOverlay) speechOverlay.classList.add('visible');
      } else {
        micToggleBtn.classList.remove('recording');
        if (speechOverlay) speechOverlay.classList.remove('visible');
        if (micLevelBar) micLevelBar.style.width = '0%';
      }
      updateModeUI();
    }

    // --- WO Mic: Wireless Audio Streaming ---
    async function startWoMic() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Microphone access is not supported on this browser or connection. Please use HTTPS (Port 3443).');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        mediaStream = stream;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioCtx({ sampleRate: 16000 });
        audioSource = audioContext.createMediaStreamSource(stream);

        // 1024 samples chunk = ~64ms latency
        scriptProcessor = audioContext.createScriptProcessor(1024, 1, 1);

        scriptProcessor.onaudioprocess = (e) => {
          if (!isRecording) return;
          const inputData = e.inputBuffer.getChannelData(0);

          let sum = 0;
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            let s = Math.max(-1, Math.min(1, inputData[i]));
            sum += s * s;
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // Live audio VU level meter calculation
          const rms = Math.sqrt(sum / inputData.length);
          const percent = Math.min(100, Math.round(rms * 450));
          if (micLevelBar) {
            micLevelBar.style.width = percent + '%';
          }

          // Send raw PCM binary over WebSocket to server.js -> controller.exe
          window.AppConnection.sendRaw(pcm16.buffer);
        };

        audioSource.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);

        setRecordingUI(true);
        window.AppState.haptic(30);
      } catch (err) {
        console.error('[WO Mic Error]', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          alert('Microphone permission denied. Please allow microphone access in your browser.');
        } else if (!isSecureOrigin) {
          alert('Mobile browsers require HTTPS to stream microphone audio. Please switch to HTTPS (Port 3443).');
        } else {
          alert('Could not start WO Mic: ' + err.message);
        }
        stopWoMic();
      }
    }

    function stopWoMic() {
      if (scriptProcessor) {
        try { scriptProcessor.disconnect(); } catch (_) {}
        scriptProcessor = null;
      }
      if (audioSource) {
        try { audioSource.disconnect(); } catch (_) {}
        audioSource = null;
      }
      if (audioContext) {
        try { audioContext.close(); } catch (_) {}
        audioContext = null;
      }
      if (mediaStream) {
        try {
          mediaStream.getTracks().forEach((track) => track.stop());
        } catch (_) {}
        mediaStream = null;
      }
      setRecordingUI(false);
      window.AppState.haptic(20);
    }

    // --- Voice Dictation (Speech-to-Text) ---
    function setupDictation() {
      if (!SpeechRecognition) return null;

      try {
        const r = new SpeechRecognition();
        r.continuous = true;
        r.interimResults = true;
        r.lang = currentLang;

        r.onstart = () => {
          setRecordingUI(true);
          window.AppState.haptic(30);
        };

        r.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (speechText) {
            speechText.textContent = (finalTranscript || interimTranscript) || 'Listening...';
          }

          if (finalTranscript.trim().length > 0) {
            window.AppConnection.send({
              type: 'keyboard_type',
              text: finalTranscript.trim() + ' '
            });
            window.AppState.haptic(20);
          }
        };

        r.onerror = (e) => {
          if (e.error === 'not-allowed') {
            alert('Microphone permission denied.');
            stopDictation();
          } else if (e.error === 'network' && !isSecureOrigin) {
            alert('Speech Recognition requires HTTPS (Port 3443).');
            stopDictation();
          }
        };

        r.onend = () => {
          if (isRecording && currentMode === 'dictation') {
            try { r.start(); } catch (_) { setRecordingUI(false); }
          } else {
            setRecordingUI(false);
          }
        };

        return r;
      } catch (_) {
        return null;
      }
    }

    function startDictation() {
      if (!SpeechRecognition) {
        window.AppConnection.send({ type: 'keyboard_key', key: 'WinH' });
        window.AppState.haptic(40);
        alert('Web Speech API not supported. Triggered Windows Voice Typing (Win + H) on your PC screen.');
        return;
      }

      if (!recognition) {
        recognition = setupDictation();
      }

      if (recognition) {
        recognition.lang = currentLang;
        try {
          isRecording = true;
          recognition.start();
        } catch (_) {
          try {
            recognition.stop();
            recognition.start();
          } catch (e) {
            console.warn(e);
          }
        }
      }
    }

    function stopDictation() {
      if (recognition) {
        try { recognition.stop(); } catch (_) {}
      }
      setRecordingUI(false);
      window.AppState.haptic(20);
    }

    // Toggle master mic state
    function toggleRecording() {
      window.AppState.requestWakeLock();
      if (isRecording) {
        if (currentMode === 'womic') stopWoMic();
        else stopDictation();
      } else {
        if (currentMode === 'womic') startWoMic();
        else startDictation();
      }
    }

    // Mode Toggle Button (WO Mic vs Voice Typing)
    if (micModeToggle) {
      micModeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const wasRecording = isRecording;
        if (isRecording) {
          if (currentMode === 'womic') stopWoMic();
          else stopDictation();
        }

        currentMode = currentMode === 'womic' ? 'dictation' : 'womic';
        updateModeUI();
        window.AppState.haptic(15);

        if (wasRecording) {
          setTimeout(toggleRecording, 200);
        }
      });
    }

    // Header Mic Toggle Button
    micToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleRecording();
    });

    // Close Button on overlay
    if (speechCloseBtn) {
      speechCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentMode === 'womic') stopWoMic();
        else stopDictation();
      });
    }

    // Dictation Language Switcher (EN vs বাংলা)
    if (speechLangBtn) {
      speechLangBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentLang = currentLang === 'en-US' ? 'bn-BD' : 'en-US';
        speechLangBtn.textContent = currentLang === 'en-US' ? 'EN' : 'বাংলা';
        window.AppState.haptic(15);

        if (recognition) {
          recognition.lang = currentLang;
          if (isRecording && currentMode === 'dictation') {
            stopDictation();
            setTimeout(startDictation, 200);
          }
        }
      });
    }

    updateModeUI();
  }

  window.MicModule = { init: initMic };
})(window);
