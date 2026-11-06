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
const dgram = require('dgram');

const udpAudioSocket = dgram.createSocket('udp4');
const AUDIO_PORT = 50005;

// AudioRelay: PC Loopback Audio Socket (captures PC speakers and streams to phone)
const udpLoopbackSocket = dgram.createSocket('udp4');
const LOOPBACK_PORT = 50006;
const audioHttpClients = new Set();

// Unified WebSocket server attached to both HTTP and HTTPS via upgrade
const wss = new WebSocketServer({ noServer: true });

udpLoopbackSocket.on('error', (err) => {
  console.warn('[AudioRelay Loopback Socket Warning]', err.message);
});

udpLoopbackSocket.on('message', (pcmBuffer) => {
  // 1. Broadcast to HTTP audio stream clients (/audio_feed)
  for (const client of audioHttpClients) {
    try {
      client.write(pcmBuffer);
    } catch (_) {
      audioHttpClients.delete(client);
    }
  }

  // 2. Broadcast to active WebSocket AudioRelay listeners (Phone wireless headphones)
  for (const client of wss.clients) {
    if (client.readyState === 1 /* OPEN */ && client.isAudioRelayListener) {
      try {
        client.send(pcmBuffer, { binary: true });
      } catch (_) {}
    }
  }
});

udpLoopbackSocket.bind(LOOPBACK_PORT, '127.0.0.1', () => {
  console.log(`[AudioRelay] Listening for PC loopback audio on 127.0.0.1:${LOOPBACK_PORT}`);
});

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
    stdio: ['pipe', 'pipe', 'ignore'],
    windowsHide: true
  });

  let stdoutBuffer = '';
  controllerProc.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk.toString('utf8');
    const lines = stdoutBuffer.split('\n');
    stdoutBuffer = lines.pop();

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('TEXTFOCUS ')) {
        const b64 = line.substring(10).trim();
        let text = '';
        if (b64.length > 0) {
          try {
            text = Buffer.from(b64, 'base64').toString('utf8');
          } catch (_) {}
        }

        console.log(`[Auto-Keyboard] Text field focused on PC (${text.length} chars). Opening phone keyboard...`);
        // Broadcast to mobile client so virtual keyboard opens automatically with text
        for (const client of wss.clients) {
          if (client.readyState === 1 && !client.isCameraViewer) {
            try {
              client.send(JSON.stringify({ type: 'auto_keyboard_open', text: text }));
            } catch (_) {}
          }
        }
      }
    }
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
  } else {
    console.warn('[Controller] Cannot send command, controllerProc unavailable:', cmd);
  }
}

startController();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Enable Cross-Origin Resource Sharing (CORS) for API & Discovery
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Ping endpoint for Local Wi-Fi Subnet Auto-Discovery
app.get('/api/ping', (req, res) => {
  const detectedIps = getLocalIpAddresses();
  const primaryIp = detectedIps.length > 0 ? detectedIps[0].address : 'localhost';
  res.json({
    app: 'WebRemoteMouse',
    status: 'ok',
    pcName: os.hostname(),
    ip: primaryIp,
    httpPort: PORT,
    httpsPort: HTTPS_PORT,
    timestamp: Date.now()
  });
});

// File Transfer Endpoint: Streams files from mobile phone directly to PC Downloads folder
app.post('/api/upload', (req, res) => {
  const rawName = req.headers['x-filename'] || req.query.filename || `transfer_${Date.now()}`;
  const filename = path.basename(decodeURIComponent(rawName));
  const downloadsDir = path.join(os.homedir(), 'Downloads');
  if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
  const savePath = path.join(downloadsDir, filename);

  const fileStream = fs.createWriteStream(savePath);
  req.pipe(fileStream);

  fileStream.on('finish', () => {
    const size = fs.existsSync(savePath) ? fs.statSync(savePath).size : 0;
    console.log(`[File Transfer] Received from phone: ${filename} (${size} bytes) -> Saved to ${savePath}`);
    res.json({ success: true, filename, path: savePath, size });
  });

  fileStream.on('error', (err) => {
    console.error('[File Transfer Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  });
});

// Clipboard / Text Sharing: Send text or links from mobile directly into PC clipboard
app.post('/api/clipboard', express.json(), (req, res) => {
  const text = req.body && req.body.text;
  if (typeof text === 'string') {
    const proc = spawn('clip.exe');
    proc.stdin.write(text);
    proc.stdin.end();
    console.log(`[Clipboard] Copied text from phone to Windows clipboard (${text.length} chars)`);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Missing text' });
  }
});

// DroidCam Video Streaming State
let latestCameraFrame = null;
const mjpegClients = new Set();

function broadcastCameraFrame(frameBuffer) {
  latestCameraFrame = frameBuffer;

  // 1. Stream to all MJPEG HTTP clients (OBS, VLC, browser)
  if (mjpegClients.size > 0) {
    const header = Buffer.from(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${frameBuffer.length}\r\n\r\n`);
    const trailer = Buffer.from('\r\n');
    for (const client of mjpegClients) {
      try {
        client.write(header);
        client.write(frameBuffer);
        client.write(trailer);
      } catch (_) {
        mjpegClients.delete(client);
      }
    }
  }

  // 2. Stream to all WebSocket PC Camera Viewers
  for (const client of wss.clients) {
    if (client.readyState === 1 /* OPEN */ && client.isCameraViewer) {
      try {
        client.send(frameBuffer, { binary: true });
      } catch (_) {}
    }
  }
}

// Camera PC Viewer Page & Stream Routes
app.get('/camera', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'camera.html'));
});
app.get('/cam', (req, res) => {
  res.redirect('/camera');
});

// Live MJPEG video stream (for OBS Studio, VLC, Web browsers)
app.get('/video_feed', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=--frame',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Connection': 'close'
  });

  if (latestCameraFrame) {
    res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${latestCameraFrame.length}\r\n\r\n`);
    res.write(latestCameraFrame);
    res.write('\r\n');
  }

  mjpegClients.add(res);
  req.on('close', () => {
    mjpegClients.delete(res);
  });
});

// Snapshot image
app.get('/snapshot', (req, res) => {
  if (!latestCameraFrame) {
    return res.status(404).send('No camera frame available. Start camera on phone first.');
  }
  res.writeHead(200, {
    'Content-Type': 'image/jpeg',
    'Content-Length': latestCameraFrame.length,
    'Cache-Control': 'no-cache'
  });
  res.end(latestCameraFrame);
});

// Live PC Audio Stream (AudioRelay HTTP stream for VLC/browser)
app.get('/audio_feed', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'audio/pcm; rate=48000; channels=1',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  audioHttpClients.add(res);
  req.on('close', () => audioHttpClients.delete(res));
});

// Serve static frontend files from ./public
app.use(express.static(path.join(__dirname, 'public')));

// Create HTTP server
const httpServer = http.createServer(app);

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

  ws.on('message', (message, isBinary) => {
    // If incoming packet is raw audio PCM (binary) or raw JPEG (video frame)
    if (isBinary || (Buffer.isBuffer(message) && message.length > 0 && message[0] !== 0x7b /* '{' */)) {
      // Check if JPEG image: starts with 0xFF, 0xD8
      if (message.length > 3 && message[0] === 0xFF && message[1] === 0xD8) {
        broadcastCameraFrame(message);
        return;
      }
      udpAudioSocket.send(message, AUDIO_PORT, '127.0.0.1');
      return;
    }

    try {
      const data = JSON.parse(message.toString());
      if (data.type !== 'ping') {
        console.log(`[WS-MSG] Type: ${data.type}`, data);
      }

      switch (data.type) {
        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong', time: Date.now() }));
          break;
        }
        case 'register_camera_viewer': {
          ws.isCameraViewer = true;
          ws.send(JSON.stringify({ type: 'camera_viewer_registered', success: true }));
          if (latestCameraFrame) {
            ws.send(latestCameraFrame, { binary: true });
          }
          break;
        }
        case 'start_pc_audio_stream': {
          ws.isAudioRelayListener = true;
          sendNativeCommand('loopback start');
          ws.send(JSON.stringify({ type: 'pc_audio_stream_status', streaming: true }));
          break;
        }
        case 'stop_pc_audio_stream': {
          ws.isAudioRelayListener = false;
          ws.send(JSON.stringify({ type: 'pc_audio_stream_status', streaming: false }));
          break;
        }
        case 'cam_remote_cmd': {
          // Forward remote camera action from PC to mobile phone
          for (const client of wss.clients) {
            if (client !== ws && client.readyState === 1 && !client.isCameraViewer) {
              try {
                client.send(JSON.stringify({
                  type: 'cam_remote_exec',
                  action: data.action,
                  value: data.value
                }));
              } catch (_) {}
            }
          }
          break;
        }
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
            const lines = clean.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].length > 0) {
                sendNativeCommand(`type ${lines[i]}`);
              }
              if (i < lines.length - 1) {
                sendNativeCommand('key Enter');
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

// Auto-Discovery: Broadcast current IP to local zero-conf cloud topic
function publishDiscovery(ip) {
  if (!ip || ip === 'localhost' || ip === '127.0.0.1') return;

  const cleanHost = os.hostname().toLowerCase().replace(/[^a-z0-9]/g, '');
  const topic = `remotemouse-${cleanHost}`;
  const payload = JSON.stringify({
    app: 'WebRemoteMouse',
    pcName: os.hostname(),
    ip: ip,
    httpPort: PORT,
    httpsPort: HTTPS_PORT,
    timestamp: Date.now()
  });

  try {
    const postReq = https.request(`https://ntfy.sh/${topic}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Retain': '1'
      },
      timeout: 3500
    }, (res) => {
      res.resume();
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[Auto-Discovery] Broadcasted IP ${ip} on channel: ${topic}`);
      }
    });

    postReq.on('error', () => {});
    postReq.write(payload);
    postReq.end();
  } catch (_) {}
}

// Start HTTP and HTTPS servers
(async () => {
  const detectedIps = getLocalIpAddresses();
  const primaryIp = detectedIps.length > 0 ? detectedIps[0].address : 'localhost';
  const httpUrl = `http://${primaryIp}:${PORT}`;
  const httpsUrl = `https://${primaryIp}:${HTTPS_PORT}`;

  // Publish IP for instant auto-discovery
  publishDiscovery(primaryIp);
  setInterval(() => {
    const freshIps = getLocalIpAddresses();
    const curIp = freshIps.length > 0 ? freshIps[0].address : primaryIp;
    publishDiscovery(curIp);
  }, 45000);

  // Start HTTP server
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log('\n=============================================================');
    console.log('                 WEB REMOTE MOUSE SERVER                     ');
    console.log('=============================================================');
    console.log(`  Trackpad (HTTP):   ${httpUrl}`);
    console.log(`  Camera View (PC):  http://localhost:${PORT}/camera`);
    console.log(`  OBS Video Feed:    http://localhost:${PORT}/video_feed`);
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
