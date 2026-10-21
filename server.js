const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');
const qrcode = require('qrcode-terminal');
const { spawn } = require('child_process');
const fs = require('fs');
const selfsigned = require('selfsigned');

const CONTROLLER_EXE = path.join(__dirname, 'bin', 'controller.exe');
const CERT_DIR = path.join(__dirname, '.cert');
const CERT_FILE = path.join(CERT_DIR, 'cert.pem');
const KEY_FILE = path.join(CERT_DIR, 'key.pem');

// Native C# Controller Process
let controllerProc = null;

function startController() {
  if (!fs.existsSync(CONTROLLER_EXE)) {
    console.error(`[Controller] ${CONTROLLER_EXE} not found!`);
    return;
  }

  controllerProc = spawn(CONTROLLER_EXE, [], {
    stdio: ['pipe', 'pipe', 'inherit'],
    windowsHide: true
  });

  controllerProc.on('exit', (code) => {
    console.warn(`[Controller] Process exited (code: ${code}). Restarting in 500ms...`);
    controllerProc = null;
    setTimeout(startController, 500);
  });

  controllerProc.on('error', (err) => {
    console.error('[Controller Error]', err.message || err);
  });
}

function sendNativeCommand(cmd) {
  if (controllerProc && controllerProc.stdin && !controllerProc.killed) {
    try {
      controllerProc.stdin.write(cmd + '\n');
    } catch (err) {
      console.error('[Controller Write Error]', err.message || err);
    }
  }
}

startController();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Serve static frontend files from ./public
app.use(express.static(path.join(__dirname, 'public')));

// Create HTTP server
const httpServer = http.createServer(app);

// Unified WebSocket server attached to both HTTP and HTTPS via upgrade
const wss = new WebSocketServer({ noServer: true });

function handleUpgrade(req, socket, head) {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
}

httpServer.on('upgrade', handleUpgrade);

// WebSocket message dispatcher
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WS] Client connected from ${clientIp}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'move': {
          const dx = Math.round(Number(data.dx) || 0);
          const dy = Math.round(Number(data.dy) || 0);
          if (dx !== 0 || dy !== 0) {
            sendNativeCommand(`move ${dx} ${dy}`);
          }
          break;
        }

        case 'click': {
          const button = (data.button || 'left').toLowerCase();
          sendNativeCommand(`click ${button}`);
          break;
        }

        case 'scroll': {
          const dy = Number(data.dy) || 0;
          const direction = data.direction || (dy < 0 ? 'up' : 'down');
          const steps = Math.max(1, Math.min(250, Math.round(Math.abs(data.amount || dy || 1))));
          sendNativeCommand(`scroll ${direction} ${steps}`);
          break;
        }

        case 'keyboard_type': {
          if (typeof data.text === 'string' && data.text.length > 0) {
            const clean = data.text.replace(/\r/g, '');
            for (const line of clean.split('\n')) {
              if (line.length > 0) {
                sendNativeCommand(`type ${line}`);
              }
            }
          }
          break;
        }

        case 'keyboard_key': {
          if (typeof data.key === 'string' && data.key.length > 0) {
            sendNativeCommand(`key ${data.key}`);
          }
          break;
        }

        case 'volume': {
          const action = (data.action || '').toLowerCase();
          sendNativeCommand(`vol ${action}`);
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

// Generate or load cached SSL certificate for local HTTPS
async function getOrCreateCert(primaryIp) {
  try {
    if (!fs.existsSync(CERT_DIR)) {
      fs.mkdirSync(CERT_DIR, { recursive: true });
    }

    if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) {
      return {
        cert: fs.readFileSync(CERT_FILE, 'utf8'),
        key: fs.readFileSync(KEY_FILE, 'utf8')
      };
    }

    const attrs = [{ name: 'commonName', value: primaryIp || 'localhost' }];
    const pems = await selfsigned.generate(attrs, {
      days: 365,
      keySize: 2048,
      algorithm: 'sha256'
    });

    fs.writeFileSync(CERT_FILE, pems.cert);
    fs.writeFileSync(KEY_FILE, pems.private);

    return { cert: pems.cert, key: pems.private };
  } catch (err) {
    console.error('[SSL Error] Failed to generate certificate:', err.message || err);
    return null;
  }
}

// Start HTTP and HTTPS servers
(async () => {
  const detectedIps = getLocalIpAddresses();
  const primaryIp = detectedIps.length > 0 ? detectedIps[0].address : 'localhost';
  const httpUrl = `http://${primaryIp}:${PORT}`;
  const httpsUrl = `https://${primaryIp}:${HTTPS_PORT}`;

  // Start HTTP server
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log('\n=============================================================');
    console.log('                 WEB REMOTE MOUSE SERVER                     ');
    console.log('=============================================================');
    console.log(`  Trackpad (HTTP):   ${httpUrl}`);
    console.log(`  Localhost (HTTP):  http://localhost:${PORT}`);
  });

  // Start HTTPS server for Air Mouse / Gyroscope
  const sslCreds = await getOrCreateCert(primaryIp);
  if (sslCreds) {
    try {
      const httpsServer = https.createServer({ key: sslCreds.key, cert: sslCreds.cert }, app);
      httpsServer.on('upgrade', handleUpgrade);
      httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`  Air Mouse (HTTPS): ${httpsUrl}  [Required for Gyro]`);
        console.log('-------------------------------------------------------------');
        console.log('  Scan QR Code for Secure HTTPS (Enables Air Mouse & Gyro):');
        console.log('  (On phone: tap "Advanced" -> "Proceed" to allow local cert)');
        console.log('-------------------------------------------------------------');
        qrcode.generate(httpsUrl, { small: true });
        console.log('-------------------------------------------------------------');
        console.log('  Server is running. Press Ctrl+C in this terminal to stop.\n');
      });
      httpsServer.on('error', (err) => {
        console.warn(`[HTTPS Warning] Could not start HTTPS on port ${HTTPS_PORT}: ${err.message}`);
        console.log('\n  Scan QR code for HTTP (Trackpad Mode):');
        qrcode.generate(httpUrl, { small: true });
      });
    } catch (err) {
      console.warn('[HTTPS Warning] SSL setup error:', err.message);
    }
  } else {
    console.log('\n  Scan QR code for HTTP:');
    qrcode.generate(httpUrl, { small: true });
  }
})();
