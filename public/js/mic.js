/**
 * mic.js - Voice Dictation & Microphone Speech-to-Text Controller
 */
(function (window) {
  'use strict';

  function initMic() {
    const micToggleBtn = document.getElementById('mic-toggle-btn');
    const speechOverlay = document.getElementById('speech-overlay');
    const speechText = document.getElementById('speech-text');
    const speechLangBtn = document.getElementById('speech-lang-btn');
    const speechCloseBtn = document.getElementById('speech-close-btn');

    if (!micToggleBtn) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isRecording = false;
    let currentLang = 'en-US'; // 'en-US' | 'bn-BD'

    // Check if secure origin for audio permissions
    const isSecureOrigin = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    function setRecordingUI(active) {
      isRecording = active;
      if (active) {
        micToggleBtn.classList.add('recording');
        if (speechOverlay) {
          speechOverlay.classList.add('visible');
          if (speechText) speechText.textContent = 'Listening... Speak now';
        }
      } else {
        micToggleBtn.classList.remove('recording');
        if (speechOverlay) speechOverlay.classList.remove('visible');
      }
    }

    function setupSpeechRecognition() {
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
            // Send the transcribed speech directly to PC as keyboard typing
            window.AppConnection.send({
              type: 'keyboard_type',
              text: finalTranscript.trim() + ' '
            });
            window.AppState.haptic(20);
          }
        };

        r.onerror = (e) => {
          console.warn('[Mic Speech Error]:', e.error);
          if (e.error === 'not-allowed') {
            alert('Microphone access was denied. Please allow microphone permissions in your mobile browser.');
            stopRecording();
          } else if (e.error === 'network' && !isSecureOrigin) {
            // Suggest switching to HTTPS for mobile browsers
            alert('Speech Recognition requires HTTPS. Please connect via HTTPS (Port 3443) or use Windows Dictation.');
            stopRecording();
          }
        };

        r.onend = () => {
          if (isRecording) {
            // Auto restart continuous listening if still toggled on
            try {
              r.start();
            } catch (_) {
              setRecordingUI(false);
            }
          } else {
            setRecordingUI(false);
          }
        };

        return r;
      } catch (err) {
        console.warn('SpeechRecognition init error:', err);
        return null;
      }
    }

    function startRecording() {
      if (!SpeechRecognition) {
        // Fallback: Trigger native Windows Voice Typing (Win + H) on PC
        window.AppConnection.send({ type: 'keyboard_key', key: 'WinH' });
        window.AppState.haptic(40);
        alert('Web Speech API is not supported in this browser. Triggered Windows Voice Typing (Win + H) on your PC screen!');
        return;
      }

      if (!recognition) {
        recognition = setupSpeechRecognition();
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
            console.warn('Could not start recognition:', e);
          }
        }
      }
    }

    function stopRecording() {
      isRecording = false;
      if (recognition) {
        try {
          recognition.stop();
        } catch (_) {}
      }
      setRecordingUI(false);
      window.AppState.haptic(20);
    }

    function toggleRecording() {
      window.AppState.requestWakeLock();
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }

    // Toggle button in header
    micToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleRecording();
    });

    // Close button on live speech overlay
    if (speechCloseBtn) {
      speechCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        stopRecording();
      });
    }

    // Language switcher button (EN vs BN)
    if (speechLangBtn) {
      speechLangBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentLang = currentLang === 'en-US' ? 'bn-BD' : 'en-US';
        speechLangBtn.textContent = currentLang === 'en-US' ? 'EN' : 'বাংলা';
        window.AppState.haptic(15);

        if (recognition) {
          recognition.lang = currentLang;
          if (isRecording) {
            stopRecording();
            setTimeout(startRecording, 200);
          }
        }
      });
    }
  }

  window.MicModule = { init: initMic };
})(window);

