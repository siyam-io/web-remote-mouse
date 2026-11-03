/**
 * connection.js - WebSocket Connection & Packet Dispatcher
 */
(function (window) {
  'use strict';

  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  let ws = null;
  let reconnectTimer = null;

  function updateStatus(connected) {
    if (statusBadge && statusText) {
      if (connected) {
        statusBadge.classList.add('connected');
        statusText.textContent = 'Connected';
      } else {
        statusBadge.classList.remove('connected');
        statusText.textContent = 'Reconnecting...';
      }
    }
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

      ws.onopen = () => {
        updateStatus(true);
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      };

      ws.onclose = () => {
        updateStatus(false);
        scheduleReconnect();
      };

      ws.onerror = () => {
        updateStatus(false);
        try { ws.close(); } catch (_) {}
      };
    } catch (_) {
      updateStatus(false);
      scheduleReconnect();
    }
  }

  function send(payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  window.AppConnection = {
    connect,
    send,
    updateStatus
  };
})(window);

