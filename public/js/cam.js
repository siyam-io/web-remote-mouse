/**
 * cam.js - DroidCam Wireless Phone-to-PC Camera Video Streaming & Controls
 */
(function (window) {
  'use strict';

  function initCam() {
    const camToggleBtn = document.getElementById('cam-toggle-btn');
    const camOverlay = document.getElementById('cam-overlay');
    const camCloseBtn = document.getElementById('cam-close-btn');
    const camFlipBtn = document.getElementById('cam-flip-btn');
    const camTorchBtn = document.getElementById('cam-torch-btn');
    const camQualityBtn = document.getElementById('cam-quality-btn');
    const camZoomBtn = document.getElementById('cam-zoom-btn');
    const camPreviewWrap = document.querySelector('.cam-preview-wrap');
    const camPreviewVideo = document.getElementById('cam-preview-video');
    const camFpsBadge = document.getElementById('cam-fps-badge');
    const camStatusText = document.getElementById('cam-status-text');
    const camPcLink = document.getElementById('cam-pc-link');

    if (!camToggleBtn) return;

    let isStreaming = false;
    let mediaStream = null;
    let videoTrack = null;
    let facingMode = 'environment'; // 'environment' (back) or 'user' (front)
    let isTorchOn = false;
    let resMode = '720p'; // '1080p' | '720p' | '480p'
    let currentZoom = 1.0; // 1x to 4x
    let isPreviewVisible = true;
    let captureInterval = null;

    // FPS calculation
    let framesSent = 0;
    let lastFpsTime = Date.now();
    let currentFps = 0;

    // Hidden offscreen canvas for frame capture & compression
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: false });

    const isSecureOrigin = window.isSecureContext ||
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (camPcLink) {
      camPcLink.textContent = `${window.location.protocol}//${window.location.host}/camera`;
      camPcLink.href = '/camera';
    }

    function setStreamingUI(active) {
      isStreaming = active;
      if (active) {
        camToggleBtn.classList.add('streaming');
        if (camOverlay) camOverlay.classList.add('visible');
      } else {
        camToggleBtn.classList.remove('streaming');
        if (camOverlay) camOverlay.classList.remove('visible');
        if (camFpsBadge) camFpsBadge.textContent = '0 FPS';
        if (camStatusText) camStatusText.textContent = 'Camera idle';
        if (camTorchBtn) {
          camTorchBtn.style.display = 'none';
          camTorchBtn.classList.remove('active');
        }
      }
    }

    function getTargetDimensions() {
      if (resMode === '1080p') return { w: 1920, h: 1080, q: 0.70 };
      if (resMode === '480p') return { w: 640, h: 480, q: 0.55 };
      return { w: 1280, h: 720, q: 0.65 }; // 720p default
    }

    async function startCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera access is not supported on this browser or connection. Please use HTTPS (Port 3443).');
        return;
      }

      if (camStatusText) camStatusText.textContent = 'Starting camera...';

      const dims = getTargetDimensions();
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: dims.w },
          height: { ideal: dims.h },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: false
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        mediaStream = stream;
        videoTrack = stream.getVideoTracks()[0];

        if (camPreviewVideo) {
          camPreviewVideo.srcObject = stream;
          try {
            await camPreviewVideo.play();
          } catch (_) {}
        }

        checkTorchSupport();
        applyHardwareZoom(currentZoom);

        setStreamingUI(true);
        window.AppState.requestWakeLock();
        window.AppState.haptic(35);
        if (camStatusText) camStatusText.textContent = `Streaming (${resMode} @ ${currentZoom}x)...`;

        startFrameLoop();
      } catch (err) {
        console.error('[Cam Error]', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          alert('Camera permission was denied. Please allow camera access in browser settings.');
        } else if (!isSecureOrigin) {
          alert('Mobile browsers require HTTPS to stream camera video. Please switch to HTTPS (Port 3443).');
        } else {
          alert('Could not start camera: ' + err.message);
        }
        stopCamera();
      }
    }

    function checkTorchSupport() {
      if (!videoTrack || !camTorchBtn) return;
      try {
        const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        if (capabilities.torch) {
          camTorchBtn.style.display = 'inline-flex';
          isTorchOn = false;
          camTorchBtn.classList.remove('active');
        } else {
          camTorchBtn.style.display = 'none';
        }
      } catch (_) {
        camTorchBtn.style.display = 'none';
      }
    }

    async function toggleTorch() {
      if (!videoTrack) return;
      try {
        isTorchOn = !isTorchOn;
        await videoTrack.applyConstraints({
          advanced: [{ torch: isTorchOn }]
        });
        if (camTorchBtn) {
          camTorchBtn.classList.toggle('active', isTorchOn);
        }
        window.AppState.haptic(15);
      } catch (err) {
        console.warn('[Torch Error]', err);
      }
    }

    function applyHardwareZoom(z) {
      if (!videoTrack) return;
      try {
        const caps = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        if (caps.zoom) {
          const clamped = Math.max(caps.zoom.min || 1, Math.min(caps.zoom.max || 5, z));
          videoTrack.applyConstraints({ advanced: [{ zoom: clamped }] });
        }
      } catch (_) {}
    }

    function stopCamera() {
      if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
      }

      if (videoTrack) {
        try { videoTrack.stop(); } catch (_) {}
        videoTrack = null;
      }

      if (mediaStream) {
        try {
          mediaStream.getTracks().forEach((t) => t.stop());
        } catch (_) {}
        mediaStream = null;
      }

      if (camPreviewVideo) {
        camPreviewVideo.srcObject = null;
      }

      setStreamingUI(false);
      window.AppState.haptic(20);
    }

    function startFrameLoop() {
      if (captureInterval) clearInterval(captureInterval);

      const targetIntervalMs = 33; // ~30 FPS
      framesSent = 0;
      lastFpsTime = Date.now();

      captureInterval = setInterval(() => {
        if (!isStreaming || !camPreviewVideo || camPreviewVideo.readyState < 2) return;

        // Skip frame if queue is backlogged
        if (window.AppConnection.getBufferedAmount && window.AppConnection.getBufferedAmount() > 65536) {
          return;
        }

        const vWidth = camPreviewVideo.videoWidth;
        const vHeight = camPreviewVideo.videoHeight;
        if (!vWidth || !vHeight) return;

        const dims = getTargetDimensions();
        const outWidth = Math.min(vWidth, dims.w);
        const outHeight = Math.round((outWidth / vWidth) * vHeight);

        if (offscreenCanvas.width !== outWidth || offscreenCanvas.height !== outHeight) {
          offscreenCanvas.width = outWidth;
          offscreenCanvas.height = outHeight;
        }

        // Digital Zoom Crop
        if (currentZoom > 1.0) {
          const cropW = vWidth / currentZoom;
          const cropH = vHeight / currentZoom;
          const cropX = (vWidth - cropW) / 2;
          const cropY = (vHeight - cropH) / 2;
          offscreenCtx.drawImage(camPreviewVideo, cropX, cropY, cropW, cropH, 0, 0, outWidth, outHeight);
        } else {
          offscreenCtx.drawImage(camPreviewVideo, 0, 0, outWidth, outHeight);
        }

        offscreenCanvas.toBlob((blob) => {
          if (!isStreaming || !blob) return;

          window.AppConnection.sendRaw(blob);
          framesSent++;

          const now = Date.now();
          if (now - lastFpsTime >= 1000) {
            currentFps = Math.round((framesSent * 1000) / (now - lastFpsTime));
            framesSent = 0;
            lastFpsTime = now;
            if (camFpsBadge) {
              camFpsBadge.textContent = `${currentFps} FPS`;
            }
          }
        }, 'image/jpeg', dims.q);
      }, targetIntervalMs);
    }

    // Toggle camera on/off
    camToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isStreaming) {
        stopCamera();
      } else {
        startCamera();
      }
    });

    if (camCloseBtn) {
      camCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        stopCamera();
      });
    }

    // Flip Front/Back Camera
    if (camFlipBtn) {
      camFlipBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        facingMode = (facingMode === 'environment') ? 'user' : 'environment';
        window.AppState.haptic(20);
        if (isStreaming) {
          stopCamera();
          await startCamera();
        }
      });
    }

    // Toggle Torch
    if (camTorchBtn) {
      camTorchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleTorch();
      });
    }

    // Zoom Toggle (1x -> 2x -> 3x -> 1x)
    if (camZoomBtn) {
      camZoomBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentZoom = currentZoom === 1.0 ? 2.0 : (currentZoom === 2.0 ? 3.0 : 1.0);
        camZoomBtn.textContent = `${currentZoom}x`;
        applyHardwareZoom(currentZoom);
        if (camStatusText) camStatusText.textContent = `Streaming (${resMode} @ ${currentZoom}x)...`;
        window.AppState.haptic(15);
      });
    }

    // Cycle Resolution (720p -> 1080p -> 480p -> 720p)
    if (camQualityBtn) {
      camQualityBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (resMode === '720p') resMode = '1080p';
        else if (resMode === '1080p') resMode = '480p';
        else resMode = '720p';

        camQualityBtn.textContent = resMode.toUpperCase();
        if (camStatusText) camStatusText.textContent = `Streaming (${resMode} @ ${currentZoom}x)...`;
        window.AppState.haptic(15);

        if (isStreaming) {
          stopCamera();
          await startCamera();
        }
      });
    }

    // Toggle Preview (Battery Saver)
    if (camPreviewWrap) {
      camPreviewWrap.addEventListener('click', () => {
        isPreviewVisible = !isPreviewVisible;
        camPreviewWrap.classList.toggle('hidden-preview', !isPreviewVisible);
        window.AppState.haptic(15);
      });
    }

    // Remote Camera Commands from PC
    if (window.AppConnection && window.AppConnection.onMessage) {
      window.AppConnection.onMessage((msg) => {
        if (msg.type === 'cam_remote_exec') {
          if (msg.action === 'torch') toggleTorch();
          else if (msg.action === 'flip' && camFlipBtn) camFlipBtn.click();
          else if (msg.action === 'zoom') {
            currentZoom = parseFloat(msg.value) || 1.0;
            if (camZoomBtn) camZoomBtn.textContent = `${currentZoom}x`;
            applyHardwareZoom(currentZoom);
          }
        }
      });
    }

    window.addEventListener('beforeunload', () => {
      if (isStreaming) stopCamera();
    });
  }

  window.CamModule = { init: initCam };
})(window);
