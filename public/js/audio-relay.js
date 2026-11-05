/**
 * audio-relay.js - AudioRelay Wireless Audio Streamer
 * Allows phone to act as wireless headphones/speakers for PC (PC Audio -> Phone)
 * Supports Preamp Volume Boost up to 500%+ with dynamic compression limiter
 */
(function (window) {
  'use strict';

  function initAudioRelay() {
    const audioRelayBtn = document.getElementById('audiorelay-toggle-btn');
    const audioOverlay = document.getElementById('audiorelay-overlay');
    const audioCloseBtn = document.getElementById('audiorelay-close-btn');
    const audioVolSlider = document.getElementById('audiorelay-vol-slider');
    const audioVolBadge = document.getElementById('audiorelay-vol-badge');
    const audioBoostBtn = document.getElementById('audiorelay-boost-btn');
    const audioStatusText = document.getElementById('audiorelay-status-text');
    const audioLatencyBadge = document.getElementById('audiorelay-latency-badge');

    if (!audioRelayBtn) return;

    let isPlaying = false;
    let audioCtx = null;
    let gainNode = null;
    let compressorNode = null;
    let nextPlayTime = 0;
    let packetsReceived = 0;
    let lastStatsTime = Date.now();

    function setAudioRelayUI(active) {
      isPlaying = active;
      if (active) {
        audioRelayBtn.classList.add('streaming');
        if (audioOverlay) audioOverlay.classList.add('visible');
        if (audioStatusText) audioStatusText.textContent = 'Listening to PC Audio...';
      } else {
        audioRelayBtn.classList.remove('streaming');
        if (audioOverlay) audioOverlay.classList.remove('visible');
        if (audioStatusText) audioStatusText.textContent = 'Audio stream paused';
      }
    }

    function updateVolume(val) {
      val = Math.max(0, Math.min(1000, Math.round(val)));
      if (audioVolSlider) {
        if (val > parseInt(audioVolSlider.max, 10)) {
          audioVolSlider.max = Math.max(600, val);
        }
        audioVolSlider.value = val;
      }

      const gainMultiplier = val / 100;
      if (gainNode && audioCtx) {
        gainNode.gain.setValueAtTime(gainMultiplier, audioCtx.currentTime);
      }

      if (audioVolBadge) {
        if (val <= 100) {
          audioVolBadge.textContent = `${val}%`;
          audioVolBadge.className = 'audiorelay-vol-badge';
        } else if (val <= 200) {
          audioVolBadge.textContent = `${val}% ⚡`;
          audioVolBadge.className = 'audiorelay-vol-badge boosted-mid';
        } else if (val <= 500) {
          audioVolBadge.textContent = `${val}% 🔥`;
          audioVolBadge.className = 'audiorelay-vol-badge boosted-high';
        } else {
          audioVolBadge.textContent = `${val}% 🚀 MAX`;
          audioVolBadge.className = 'audiorelay-vol-badge boosted-ultra';
        }
      }
    }

    async function startAudioRelay() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!audioCtx) {
          audioCtx = new AudioCtx({ sampleRate: 48000 });
        }

        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        if (!gainNode) {
          gainNode = audioCtx.createGain();
          const initialVol = audioVolSlider ? parseInt(audioVolSlider.value, 10) : 100;
          gainNode.gain.setValueAtTime(initialVol / 100, audioCtx.currentTime);

          // Soft-knee dynamics compressor/limiter to prevent clipping when boosted up to 500%+
          compressorNode = audioCtx.createDynamicsCompressor();
          compressorNode.threshold.setValueAtTime(-3, audioCtx.currentTime); // dB
          compressorNode.knee.setValueAtTime(6, audioCtx.currentTime);
          compressorNode.ratio.setValueAtTime(16, audioCtx.currentTime);
          compressorNode.attack.setValueAtTime(0.003, audioCtx.currentTime);
          compressorNode.release.setValueAtTime(0.08, audioCtx.currentTime);

          gainNode.connect(compressorNode);
          compressorNode.connect(audioCtx.destination);
        }

        nextPlayTime = audioCtx.currentTime + 0.03;
        packetsReceived = 0;
        lastStatsTime = Date.now();

        // Ask server to start forwarding loopback audio
        window.AppConnection.send({ type: 'start_pc_audio_stream' });

        setAudioRelayUI(true);
        window.AppState.requestWakeLock();
        window.AppState.haptic(30);
      } catch (err) {
        console.error('[AudioRelay Error]', err);
        alert('Could not start AudioRelay: ' + (err.message || err));
        stopAudioRelay();
      }
    }

    function stopAudioRelay() {
      // Ask server to stop forwarding loopback audio
      window.AppConnection.send({ type: 'stop_pc_audio_stream' });

      if (audioCtx && audioCtx.state === 'running') {
        try { audioCtx.suspend(); } catch (_) {}
      }

      setAudioRelayUI(false);
      window.AppState.haptic(20);
    }

    // Play incoming raw Int16 48000Hz mono PCM buffer
    function playAudioChunk(arrayBuffer) {
      if (!isPlaying || !audioCtx || audioCtx.state !== 'running' || !gainNode) return;

      const int16 = new Int16Array(arrayBuffer);
      if (int16.length === 0) return;

      const floatData = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        floatData[i] = int16[i] / 32768.0;
      }

      const audioBuffer = audioCtx.createBuffer(1, floatData.length, 48000);
      audioBuffer.copyToChannel(floatData, 0);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gainNode);

      const now = audioCtx.currentTime;
      // Resync if drift exceeds 120ms or buffer underrun
      if (nextPlayTime < now || nextPlayTime - now > 0.12) {
        nextPlayTime = now + 0.02;
      }

      source.start(nextPlayTime);
      nextPlayTime += audioBuffer.duration;

      packetsReceived++;
      const curTime = Date.now();
      if (curTime - lastStatsTime >= 1000) {
        const latencyMs = Math.max(15, Math.round((nextPlayTime - now) * 1000));
        if (audioLatencyBadge) {
          audioLatencyBadge.textContent = `${latencyMs}ms | 48kHz`;
        }
        packetsReceived = 0;
        lastStatsTime = curTime;
      }
    }

    // Register binary listener for loopback audio packets
    window.AppConnection.onBinary((buffer) => {
      // Check if it's NOT a JPEG image frame (camera starts with 0xFF, 0xD8)
      if (buffer.byteLength > 2) {
        const u8 = new Uint8Array(buffer, 0, 2);
        if (u8[0] === 0xFF && u8[1] === 0xD8) {
          return; // Ignore camera frame
        }
      }
      playAudioChunk(buffer);
    });

    // Volume Slider
    if (audioVolSlider) {
      audioVolSlider.addEventListener('input', (e) => {
        updateVolume(parseFloat(e.target.value));
      });
    }

    // Quick Boost Button (Cycles 100% -> 200% -> 500% -> 800% -> 100%)
    const boostSteps = [100, 200, 500, 800];
    if (audioBoostBtn) {
      audioBoostBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const current = parseInt(audioVolSlider ? audioVolSlider.value : 100, 10);
        let next = boostSteps[0];
        for (let i = 0; i < boostSteps.length; i++) {
          if (boostSteps[i] > current) {
            next = boostSteps[i];
            break;
          }
        }
        updateVolume(next);
        window.AppState.haptic(25);
      });
    }

    // Toggle button in header
    audioRelayBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isPlaying) {
        stopAudioRelay();
      } else {
        startAudioRelay();
      }
    });

    if (audioCloseBtn) {
      audioCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        stopAudioRelay();
      });
    }

    // Initialize default volume display
    updateVolume(audioVolSlider ? parseInt(audioVolSlider.value, 10) : 100);
  }

  window.AudioRelayModule = { init: initAudioRelay };
})(window);
