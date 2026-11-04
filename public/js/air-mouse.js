/**
 * air-mouse.js - Gyroscope & Accelerometer Motion Pointer Navigation
 */
(function (window) {
  'use strict';

  function initAirMouse() {
    const trackpad = document.getElementById('trackpad');
    const airMouseView = document.getElementById('air-mouse-view');
    const airTriggerPad = document.getElementById('air-trigger-pad');
    if (!airTriggerPad) return;

    const airTriggerPrimary = airTriggerPad.querySelector('.trigger-primary-label');
    const airTriggerStatus = airTriggerPad.querySelector('.trigger-status-label');
    const httpsNotice = document.getElementById('https-notice');
    const btnSwitchHttps = document.getElementById('btn-switch-https');
    const aimModeHoldBtn = document.getElementById('aim-mode-hold-btn');
    const aimModeToggleBtn = document.getElementById('aim-mode-toggle-btn');

    const telemetrySensorDot = document.getElementById('telemetry-sensor-dot');
    const telemetryStatusText = document.getElementById('telemetry-status-text');
    const telemetryReading = document.getElementById('telemetry-reading');
    const telemetryPackets = document.getElementById('telemetry-packets');

    let totalPacketsSent = 0;
    let totalOrientationEvents = 0;
    let isOrientationListening = false;
    let isAiming = false;
    let lastGamma = null;
    let lastBeta = null;
    let aimStartTime = 0;
    let aimMotionDistance = 0;

    const GYRO_DEADZONE = 0.28;
    const GYRO_SCALE_FACTOR = 8.5;

    const isSecureOrigin = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (btnSwitchHttps) {
      btnSwitchHttps.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = `https://${window.location.hostname}:3443`;
      });
    }

    if (aimModeHoldBtn && aimModeToggleBtn) {
      aimModeHoldBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.AppState.airAimBehavior = 'hold';
        aimModeHoldBtn.classList.add('active');
        aimModeToggleBtn.classList.remove('active');
        if (isAiming) stopAiming();
        if (airTriggerPrimary) airTriggerPrimary.textContent = 'HOLD TO AIM';
        if (airTriggerStatus) airTriggerStatus.textContent = 'Touch & hold to steer cursor';
        window.AppState.haptic(15);
      });

      aimModeToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.AppState.airAimBehavior = 'toggle';
        aimModeToggleBtn.classList.add('active');
        aimModeHoldBtn.classList.remove('active');
        if (isAiming) stopAiming();
        if (airTriggerPrimary) airTriggerPrimary.textContent = 'TAP TO AIM';
        if (airTriggerStatus) airTriggerStatus.textContent = 'Tap to start / stop steering';
        window.AppState.haptic(15);
      });
    }

    async function requestDeviceOrientationPermission() {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const permissionState = await DeviceOrientationEvent.requestPermission();
          return permissionState === 'granted';
        } catch (_) {
          return false;
        }
      }
      return true;
    }

    function handleOrientation(e) {
      totalOrientationEvents++;
      const currentGamma = e.gamma;
      const currentBeta = e.beta;

      if (currentGamma !== null && currentBeta !== null && telemetryReading) {
        telemetryReading.textContent = `γ: ${currentGamma.toFixed(1)}° | β: ${currentBeta.toFixed(1)}°`;
      }

      if (telemetrySensorDot && telemetryStatusText) {
        telemetrySensorDot.className = 'telemetry-dot dot-active';
        telemetryStatusText.textContent = isAiming ? 'Sensor: Steering PC Cursor' : 'Sensor: Active (Ready to Aim)';
      }

      if (window.AppState.currentMode !== 'air' || !isAiming) {
        lastGamma = null;
        lastBeta = null;
        return;
      }

      if (currentGamma === null || currentBeta === null) return;

      if (lastGamma === null || lastBeta === null) {
        lastGamma = currentGamma;
        lastBeta = currentBeta;
        return;
      }

      const rawDeltaGamma = currentGamma - lastGamma;
      const rawDeltaBeta = currentBeta - lastBeta;
      lastGamma = currentGamma;
      lastBeta = currentBeta;

      if (Math.abs(rawDeltaGamma) > 25 || Math.abs(rawDeltaBeta) > 25) return;

      let effDeltaX = 0;
      if (Math.abs(rawDeltaGamma) > GYRO_DEADZONE) {
        effDeltaX = rawDeltaGamma - Math.sign(rawDeltaGamma) * GYRO_DEADZONE;
      }

      let effDeltaY = 0;
      if (Math.abs(rawDeltaBeta) > GYRO_DEADZONE) {
        effDeltaY = rawDeltaBeta - Math.sign(rawDeltaBeta) * GYRO_DEADZONE;
      }

      if (effDeltaX === 0 && effDeltaY === 0) return;

      const moveX = effDeltaX * window.AppState.gyroSensitivity * GYRO_SCALE_FACTOR;
      const moveY = effDeltaY * window.AppState.gyroSensitivity * GYRO_SCALE_FACTOR;

      aimMotionDistance += Math.hypot(moveX, moveY);
      totalPacketsSent++;
      if (telemetryPackets) {
        telemetryPackets.textContent = 'Sent: ' + totalPacketsSent;
      }

      window.AppConnection.send({
        type: 'move',
        dx: Math.round(moveX * 10) / 10,
        dy: Math.round(moveY * 10) / 10
      });
    }

    function handleMotion(e) {
      if (totalOrientationEvents > 5) return;
      if (!e.rotationRate) return;

      const rot = e.rotationRate;
      const rotX = rot.gamma || 0;
      const rotY = rot.beta || 0;

      if (telemetryReading) {
        telemetryReading.textContent = `Rot X: ${rotX.toFixed(1)} | Y: ${rotY.toFixed(1)}`;
      }

      if (telemetrySensorDot && telemetryStatusText) {
        telemetrySensorDot.className = 'telemetry-dot dot-active';
        telemetryStatusText.textContent = isAiming ? 'Motion Sensor: Steering' : 'Motion: Active (Ready)';
      }

      if (window.AppState.currentMode !== 'air' || !isAiming) return;
      if (Math.abs(rotX) < 1.0 && Math.abs(rotY) < 1.0) return;

      const moveX = rotX * window.AppState.gyroSensitivity * 0.45;
      const moveY = rotY * window.AppState.gyroSensitivity * 0.45;

      aimMotionDistance += Math.hypot(moveX, moveY);
      totalPacketsSent++;
      if (telemetryPackets) telemetryPackets.textContent = 'Sent: ' + totalPacketsSent;

      window.AppConnection.send({
        type: 'move',
        dx: Math.round(moveX * 10) / 10,
        dy: Math.round(moveY * 10) / 10
      });
    }

    function startOrientationTracking() {
      if (!isOrientationListening) {
        window.addEventListener('deviceorientation', handleOrientation, { passive: false });
        window.addEventListener('deviceorientationabsolute', handleOrientation, { passive: false });
        window.addEventListener('devicemotion', handleMotion, { passive: false });
        isOrientationListening = true;

        setTimeout(() => {
          if (totalOrientationEvents === 0) {
            if (!isSecureOrigin) {
              if (httpsNotice) httpsNotice.style.display = 'flex';
              if (telemetrySensorDot) telemetrySensorDot.className = 'telemetry-dot dot-error';
              if (telemetryStatusText) telemetryStatusText.textContent = '⚠️ Blocked: Switch to HTTPS (3443)';
            } else {
              if (telemetrySensorDot) telemetrySensorDot.className = 'telemetry-dot dot-waiting';
              if (telemetryStatusText) telemetryStatusText.textContent = 'Sensor: Waiting for device motion...';
            }
          }
        }, 800);
      }
    }

    function stopOrientationTracking() {
      if (isOrientationListening) {
        window.removeEventListener('deviceorientation', handleOrientation);
        window.removeEventListener('deviceorientationabsolute', handleOrientation);
        window.removeEventListener('devicemotion', handleMotion);
        isOrientationListening = false;
      }
      lastGamma = null;
      lastBeta = null;
    }

    function startAiming(e) {
      if (window.AppState.currentMode !== 'air') return;
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      window.AppState.requestWakeLock();

      isAiming = true;
      lastGamma = null;
      lastBeta = null;
      aimStartTime = Date.now();
      aimMotionDistance = 0;

      airTriggerPad.classList.add('aiming-active');
      if (airTriggerPrimary) airTriggerPrimary.textContent = 'AIMING ACTIVE';
      if (airTriggerStatus) {
        airTriggerStatus.textContent = window.AppState.airAimBehavior === 'toggle' ? 'Tap to freeze cursor' : 'Tilting steers cursor';
      }
      if (telemetryStatusText) telemetryStatusText.textContent = 'Sensor: Steering PC Cursor';
      window.AppState.haptic(20);
    }

    function stopAiming(e) {
      if (!isAiming) return;
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      const duration = Date.now() - aimStartTime;
      const wasQuickTap = window.AppState.airAimBehavior === 'hold' && duration < 280 && aimMotionDistance < 12;

      isAiming = false;
      lastGamma = null;
      lastBeta = null;

      airTriggerPad.classList.remove('aiming-active');
      if (airTriggerPrimary) {
        airTriggerPrimary.textContent = window.AppState.airAimBehavior === 'toggle' ? 'TAP TO AIM' : 'HOLD TO AIM';
      }
      if (airTriggerStatus) {
        airTriggerStatus.textContent = window.AppState.airAimBehavior === 'toggle' ? 'Tap to start / stop steering' : 'Touch & hold to move pointer';
      }
      if (telemetryStatusText) telemetryStatusText.textContent = 'Sensor: Active (Ready to Aim)';

      if (wasQuickTap) {
        window.AppConnection.send({ type: 'click', button: 'left' });
        window.AppState.haptic(25);
      }
    }

    function handleAirTouchStart(e) {
      if (window.AppState.currentMode !== 'air') return;
      if (e.target.closest('.air-aim-mode-toggle, .btn-switch-https, .icon-btn')) return;

      if (window.AppState.airAimBehavior === 'hold') {
        startAiming(e);
      }
    }

    function handleAirTouchEnd(e) {
      if (window.AppState.currentMode !== 'air') return;
      if (e.target.closest('.air-aim-mode-toggle, .btn-switch-https, .icon-btn')) return;

      if (window.AppState.airAimBehavior === 'hold') {
        stopAiming(e);
      } else if (window.AppState.airAimBehavior === 'toggle') {
        if (isAiming) stopAiming(e); else startAiming(e);
      }
    }

    airTriggerPad.addEventListener('touchstart', handleAirTouchStart, { passive: false });
    airTriggerPad.addEventListener('touchend', handleAirTouchEnd, { passive: false });
    airTriggerPad.addEventListener('touchcancel', () => {
      if (isAiming && window.AppState.airAimBehavior === 'hold') stopAiming();
    }, { passive: false });

    if (airMouseView) {
      airMouseView.addEventListener('touchstart', (e) => {
        if (e.target === airMouseView) handleAirTouchStart(e);
      }, { passive: false });

      airMouseView.addEventListener('touchend', (e) => {
        if (e.target === airMouseView) handleAirTouchEnd(e);
      }, { passive: false });
    }

    // Mode Toggle Buttons (Trackpad vs Air Mouse vs Shorts)
    const modeTrackpadBtn = document.getElementById('mode-trackpad-btn');
    const modeAirBtn = document.getElementById('mode-air-btn');
    const modeShortsBtn = document.getElementById('mode-shorts-btn');

    async function setMode(mode) {
      if (mode === window.AppState.currentMode) return;

      // Reset active tabs & trackpad classes
      if (modeTrackpadBtn) {
        modeTrackpadBtn.classList.remove('active');
        modeTrackpadBtn.setAttribute('aria-selected', 'false');
      }
      if (modeAirBtn) {
        modeAirBtn.classList.remove('active');
        modeAirBtn.setAttribute('aria-selected', 'false');
      }
      if (modeShortsBtn) {
        modeShortsBtn.classList.remove('active');
        modeShortsBtn.setAttribute('aria-selected', 'false');
      }
      trackpad.classList.remove('air-mode', 'shorts-mode');
      stopAiming();
      stopOrientationTracking();

      if (mode === 'air') {
        if (!isSecureOrigin && httpsNotice) httpsNotice.style.display = 'flex';

        const granted = await requestDeviceOrientationPermission();
        if (!granted) {
          alert('Motion sensor permission is required for Air Mouse mode. If on iPhone or Chrome, please connect using HTTPS.');
          setMode('trackpad');
          return;
        }

        window.AppState.currentMode = 'air';
        if (modeAirBtn) {
          modeAirBtn.classList.add('active');
          modeAirBtn.setAttribute('aria-selected', 'true');
        }
        trackpad.classList.add('air-mode');
        startOrientationTracking();
        window.AppState.requestWakeLock();
        window.AppState.haptic(30);

        if (telemetryStatusText) {
          telemetryStatusText.textContent = isSecureOrigin ? 'Sensor: Checking...' : '⚠️ HTTP: Use HTTPS Port 3443';
        }
      } else if (mode === 'shorts') {
        window.AppState.currentMode = 'shorts';
        if (modeShortsBtn) {
          modeShortsBtn.classList.add('active');
          modeShortsBtn.setAttribute('aria-selected', 'true');
        }
        trackpad.classList.add('shorts-mode');
        window.AppState.requestWakeLock();
        window.AppState.haptic(25);
      } else {
        window.AppState.currentMode = 'trackpad';
        if (modeTrackpadBtn) {
          modeTrackpadBtn.classList.add('active');
          modeTrackpadBtn.setAttribute('aria-selected', 'true');
        }
        window.AppState.haptic(20);
      }
    }

    if (modeTrackpadBtn) modeTrackpadBtn.addEventListener('click', (e) => { e.preventDefault(); setMode('trackpad'); });
    if (modeAirBtn) modeAirBtn.addEventListener('click', (e) => { e.preventDefault(); setMode('air'); });
    if (modeShortsBtn) modeShortsBtn.addEventListener('click', (e) => { e.preventDefault(); setMode('shorts'); });
  }

  window.AirMouseModule = { init: initAirMouse };
})(window);

