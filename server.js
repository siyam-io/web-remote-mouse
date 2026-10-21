const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');
const { mouse, Point, Button, keyboard, Key } = require('@nut-tree-fork/nut-js');
const qrcode = require('qrcode-terminal');

// Configure nut-js mouse and keyboard delays for responsive control
mouse.config.autoDelayMs = 0;
keyboard.config.autoDelayMs = 0;

// Initialize Express app and HTTP server
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend files from ./public
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server });

// Queue / accumulator to prevent overlapping async mouse calls
let isMoving = false;
let pendingDx = 0;
let pendingDy = 0;

async function processMouseMove(dx, dy) {
  pendingDx += dx;
  pendingDy += dy;

  if (isMoving) return;
  isMoving = true;

  try {
    while (pendingDx !== 0 || pendingDy !== 0) {
      const curDx = pendingDx;
      const curDy = pendingDy;
      pendingDx = 0;
      pendingDy = 0;

      const currentPos = await mouse.getPosition();
      const nextX = currentPos.x + curDx;
      const nextY = currentPos.y + curDy;
      await mouse.setPosition(new Point(nextX, nextY));
    }
  } catch (err) {
    console.error('[Mouse Move Error]', err.message || err);
  } finally {
    isMoving = false;
  }
}

// Key mapping for special keys
const KEY_MAP = {
  'Enter': Key.Return,
  'Return': Key.Return,
  'Backspace': Key.Backspace,
  'Space': Key.Space,
  'Escape': Key.Escape,
  'Esc': Key.Escape,
  'Tab': Key.Tab,
  'ArrowUp': Key.Up,
  'Up': Key.Up,
  'ArrowDown': Key.Down,
  'Down': Key.Down,
  'ArrowLeft': Key.Left,
  'Left': Key.Left,
  'ArrowRight': Key.Right,
  'Right': Key.Right
};

// WebSocket message dispatcher
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WS] Client connected from ${clientIp}`);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'move': {
          const dx = Math.round(Number(data.dx) || 0);
          const dy = Math.round(Number(data.dy) || 0);
          if (dx !== 0 || dy !== 0) {
            processMouseMove(dx, dy);
          }
          break;
        }

        case 'click': {
          const button = (data.button || 'left').toLowerCase();
          if (button === 'middle') {
            await mouse.click(Button.MIDDLE);
          } else if (button === 'right') {
            await mouse.rightClick();
          } else {
            await mouse.leftClick();
          }
          break;
        }

        case 'scroll': {
          // dy < 0 or direction === 'up' indicates scrolling up; dy > 0 indicates scrolling down
          const dy = Number(data.dy) || 0;
          const direction = data.direction;
          const steps = Math.max(1, Math.min(250, Math.round(Math.abs(data.amount || dy || 1))));

          if (direction === 'up' || dy < 0) {
            await mouse.scrollUp(steps);
          } else {
            await mouse.scrollDown(steps);
          }
          break;
        }

        case 'keyboard_type': {
          if (typeof data.text === 'string' && data.text.length > 0) {
            await keyboard.type(data.text);
          }
          break;
        }

        case 'keyboard_key': {
          const targetKey = KEY_MAP[data.key];
          if (targetKey !== undefined) {
            await keyboard.pressKey(targetKey);
            await keyboard.releaseKey(targetKey);
          } else {
            console.warn(`[Keyboard Key] Unmapped key: ${data.key}`);
          }
          break;
        }

        case 'volume': {
          let targetKey;
          if (data.action === 'up') {
            targetKey = Key.AudioVolUp || Key.AudioVolumeUp;
          } else if (data.action === 'down') {
            targetKey = Key.AudioVolDown || Key.AudioVolumeDown;
          } else if (data.action === 'mute') {
            targetKey = Key.AudioMute || Key.AudioVolumeMute;
          }

          if (targetKey !== undefined) {
            await keyboard.pressKey(targetKey);
            await keyboard.releaseKey(targetKey);
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[WS Message Error]', err.message || err);
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Client disconnected (${clientIp})`);
  });

  ws.on('error', (err) => {
    console.error(`[WS Error]`, err.message || err);
  });
});

/**
 * Detect local machine IPv4 addresses (excluding loopback)
 * Prioritizes standard Wi-Fi and Ethernet adapters
 */
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const list = [];

  for (const [name, ifaceList] of Object.entries(interfaces)) {
    for (const iface of ifaceList) {
      if ((iface.family === 'IPv4' || iface.family === 4) && !iface.internal) {
        list.push({ name, address: iface.address });
      }
    }
  }

  // Scoring function to prioritize physical LAN/Wi-Fi adapters over virtual/tunnel adapters
  function scoreAdapter(item) {
    const n = item.name.toLowerCase();
    let score = 0;
    if (n.includes('wi-fi') || n.includes('wireless') || n.includes('wlan')) score += 100;
    if (n.includes('ethernet') && !n.includes('vethernet')) score += 90;
    if (item.address.startsWith('192.168.')) score += 50;
    if (item.address.startsWith('10.')) score += 40;
    if (item.address.startsWith('172.') && !n.includes('vethernet') && !n.includes('warp')) score += 30;
    if (n.includes('vethernet') || n.includes('virtual') || n.includes('warp') || n.includes('wsl')) score -= 80;
    return score;
  }

  list.sort((a, b) => scoreAdapter(b) - scoreAdapter(a));
  return list;
}

// Start HTTP and WebSocket server
server.listen(PORT, '0.0.0.0', () => {
  const detectedIps = getLocalIpAddresses();
  const primaryIp = detectedIps.length > 0 ? detectedIps[0].address : 'localhost';
  const primaryUrl = `http://${primaryIp}:${PORT}`;

  console.log('\n=============================================================');
  console.log('                 WEB REMOTE MOUSE SERVER                     ');
  console.log('=============================================================');
  console.log(`  Access URL:  ${primaryUrl}`);
  console.log(`  Local URL:   http://localhost:${PORT}`);

  if (detectedIps.length > 1) {
    console.log('\n  Other available network addresses:');
    detectedIps.slice(1).forEach((item) => {
      console.log(`    - ${item.name}: http://${item.address}:${PORT}`);
    });
  }

  console.log('\n  Scan this QR code with your mobile phone camera:');
  console.log('-------------------------------------------------------------');
  qrcode.generate(primaryUrl, { small: true });
  console.log('-------------------------------------------------------------');
  console.log('  Server is running. Press Ctrl+C in this terminal to stop.\n');
});
