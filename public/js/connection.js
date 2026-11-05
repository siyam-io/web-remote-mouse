/**
 * connection.js - WebSocket Connection & Packet Dispatcher
 * With Automatic PC IP Discovery (Zero-Config Wi-Fi IP Reconnect)
 */
(function (window) {
  'use strict';

  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  let ws = null;
  let reconnectTimer = null;
  let reconnectAttempts = 0;
  let isDiscovering = false;
  let lastDiscoveryTime = 0;
  let heartbeatTimer = null;
  let lastPongTime = Date.now();

  function startHeartbeat() {
    stopHeartbeat();
    lastPongTime = Date.now();
    heartbeatTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        // If server hasn't answered for 9 seconds (e.g. mobile was sleeping), force reconnect
        if (Date.now() - lastPongTime > 9000) {
          console.warn('[Heartbeat] Connection dead or sleeping. Reconnecting...');
          try { ws.close(); } catch (_) {}
          return;
        }
        try { ws.send(JSON.stringify({ type: 'ping' })); } catch (_) {}
      }
    }, 3500);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function onWake() {
    if (document.visibilityState === 'visible') {
      if (window.AppState && window.AppState.requestWakeLock) {
        window.AppState.requestWakeLock();
      }
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log('[Connection] Phone woke up. Reconnecting immediately...');
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        connect();
      } else {
        try { ws.send(JSON.stringify({ type: 'ping' })); } catch (_) {
          connect();
        }
      }
    }
  }

  document.addEventListener('visibilitychange', onWake);
  window.addEventListener('focus', onWake);
  window.addEventListener('pageshow', onWake);
  window.addEventListener('online', onWake);

  const jsonListeners = new Set();
  const binaryListeners = new Set();

  function showToast(msg, duration = 3000) {
    let toast = document.getElementById('discovery-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'discovery-toast';
      toast.className = 'discovery-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.display = 'flex';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.display = 'none';
    }, duration);
  }

  function updateStatus(connected) {
    if (statusBadge && statusText) {
      if (connected) {
        statusBadge.classList.add('connected');
        statusText.textContent = 'Connected';
        reconnectAttempts = 0;
        isDiscovering = false;
      } else {
        statusBadge.classList.remove('connected');
        statusText.textContent = isDiscovering ? 'Searching PC...' : 'Reconnecting...';
      }
    }
  }

  // Auto-Discover PC IP if PC IP changed on local Wi-Fi router
  async function autoDiscoverPc() {
    const now = Date.now();
    if (isDiscovering || (now - lastDiscoveryTime < 6000)) return;
    isDiscovering = true;
    lastDiscoveryTime = now;

    if (statusText) statusText.textContent = 'Auto-Detecting PC...';
    showToast('🔍 PC IP changed? Auto-searching your Wi-Fi...');

    const currentHost = window.location.hostname;
    const pairingTopic = localStorage.getItem('mouse_pairing_channel') || 'remotemouse-siyam';

    // Strategy 1: Check Zero-Config Discovery Channel
    try {
      const res = await fetch(`https://ntfy.sh/${pairingTopic}/raw?poll=1`, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        const data = JSON.parse(text);
        if (data && data.ip && data.ip !== currentHost) {
          showToast(`✨ Found PC at ${data.ip}! Reconnecting...`);
          setTimeout(() => {
            const newUrl = `${window.location.protocol}//${data.ip}:${window.location.port}${window.location.pathname}`;
            window.location.replace(newUrl);
          }, 800);
          return;
        }
      }
    } catch (_) {}

    // Strategy 2: Fast Local Wi-Fi Subnet Probe (for offline router/no internet)
    try {
      const subnet = currentHost.includes('.') ? currentHost.substring(0, currentHost.lastIndexOf('.')) : '192.168.0';
      const probes = [];

      // Probe likely IP range (e.g. 100 to 130)
      for (let i = 100; i <= 130; i++) {
        const targetIp = `${subnet}.${i}`;
        if (targetIp === currentHost) continue;

        const probe = fetch(`${window.location.protocol}//${targetIp}:${window.location.port}/api/ping`, {
          mode: 'cors',
          signal: AbortSignal.timeout ? AbortSignal.timeout(700) : undefined
        }).then(r => r.json()).then(data => {
          if (data && data.app === 'WebRemoteMouse') {
            return targetIp;
          }
          return null;
        }).catch(() => null);

        probes.push(probe);
      }

      const results = await Promise.all(probes);
      const foundIp = results.find(ip => ip !== null);
      if (foundIp) {
        showToast(`✨ Found PC at ${foundIp}! Reconnecting...`);
        setTimeout(() => {
          const newUrl = `${window.location.protocol}//${foundIp}:${window.location.port}${window.location.pathname}`;
          window.location.replace(newUrl);
        }, 800);
        return;
      }
    } catch (_) {}

    isDiscovering = false;
    if (statusText) statusText.textContent = 'Reconnecting...';
  }

  function scheduleReconnect() {
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 1500);
    }
  }

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'pong') {
              lastPongTime = Date.now();
              return;
            }
            for (const fn of jsonListeners) fn(data);
          } catch (_) {}
        } else {
          for (const fn of binaryListeners) fn(event.data);
        }
      };

      ws.onopen = () => {
        updateStatus(true);
        startHeartbeat();
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      };

      ws.onclose = () => {
        updateStatus(false);
        stopHeartbeat();
        reconnectAttempts++;
        if (reconnectAttempts >= 3) {
          autoDiscoverPc();
        }
        scheduleReconnect();
      };

      ws.onerror = () => {
        updateStatus(false);
        stopHeartbeat();
        reconnectAttempts++;
        if (reconnectAttempts >= 2) {
          autoDiscoverPc();
        }
        try { ws.close(); } catch (_) {}
      };
    } catch (_) {
      updateStatus(false);
      stopHeartbeat();
      reconnectAttempts++;
      if (reconnectAttempts >= 2) {
        autoDiscoverPc();
      }
      scheduleReconnect();
    }
  }

  function send(payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  function sendRaw(buffer) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(buffer);
    }
  }

  function getBufferedAmount() {
    return (ws && ws.readyState === WebSocket.OPEN) ? ws.bufferedAmount : 0;
  }

  window.AppConnection = {
    connect,
    send,
    sendRaw,
    getBufferedAmount,
    onMessage: (fn) => jsonListeners.add(fn),
    onBinary: (fn) => binaryListeners.add(fn),
    updateStatus,
    autoDiscoverPc
  };
})(window);
