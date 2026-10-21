# 🖱️ Web Remote Mouse & Keyboard

A zero-install, ultra-responsive Web Remote Mouse, Keyboard, and Volume Controller for Windows. Control your PC cursor, type text, scroll smoothly, and manage volume directly from any smartphone browser on your local Wi-Fi network.

![NodeJS](https://img.shields.io/badge/Node.js-v18+-green.svg)
![WebSocket](https://img.shields.io/badge/WebSocket-Realtime-blue.svg)
![License](https://img.shields.io/badge/License-MIT-purple.svg)

---

## ✨ Features

- **Zero Install on Phone**: No native app needed. Scan the terminal QR code or visit the local IP in your phone browser (iOS Safari, Android Chrome, etc.).
- **Smooth Trackpad Gestures**:
  - **Single-finger drag**: Smooth mouse cursor movement with zero-lag accumulation.
  - **Single-finger tap**: Instant left click with visual ripple and haptic feedback.
  - **Two-finger drag**: Ultra-responsive vertical scrolling (up to 50x boost).
- **3-Button Mouse Bar**:
  - Dedicated **[Left Click]**, **[Middle Click]** (scroll/tab), and **[Right Click]** buttons.
- **PC Master Volume Bar**:
  - **[🔉 Vol -]**, **[🔇 Mute]**, and **[🔊 Vol +]** directly above mouse buttons.
- **Remote Mobile Keyboard**:
  - **Real-Time Live Typing**: Tapping the input opens your mobile virtual keyboard (Gboard, iOS keyboard) and sends keystrokes instantly to your PC.
  - **Batch Text Sender**: Send full sentences, URLs, or passwords in one click.
  - **Quick Action Keys**: `Esc`, `Tab`, `Space`, `Backspace`, `Enter`, and directional arrow cluster (`▲`, `▼`, `◀`, `▶`).
- **Customizable Settings Drawer (⚙️)**:
  - Mouse Sensitivity slider (`0.5x` to `4.0x`).
  - Scroll Sensitivity slider (`1.0x` to `50.0x`).
  - Invert Scroll Direction toggle (Natural vs Standard).
  - Preferences persisted in `localStorage`.
- **Screen Wake Lock & Auto-Reconnect**:
  - Automatically requests `navigator.wakeLock` on interaction so your phone screen stays on.
  - Auto-reconnecting WebSocket connection.

---

## 🚀 Quick Start

### Option 1: Double-Click Launcher (Windows)
Simply double-click **`start.bat`**.
- It automatically installs dependencies (`npm install`) on first run if missing.
- Detects your local Wi-Fi / LAN IP.
- Generates an ASCII QR code in your terminal.

### Option 2: Terminal
```bash
# 1. Install dependencies
npm install

# 2. Start server
npm start
```

Scan the ASCII QR code shown in your terminal with your phone camera, or navigate to `http://<YOUR_LOCAL_IP>:3000`.

---

## 🛠️ Tech Stack
- **Backend**: Node.js, Express, `ws` (WebSockets), `@nut-tree-fork/nut-js`, `qrcode-terminal`
- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism Dark Theme), Vanilla JavaScript

---

## 📄 License
MIT
