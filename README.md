# 🖱️ Web Remote Mouse & Wireless Companion for Windows

A modern, zero-install, ultra-responsive Web Remote Mouse, Keyboard, Gyro Air Mouse, Virtual Gaming Controller, AudioRelay, and Webcam for Windows. Turn any smartphone (Android or iOS) into a feature-packed PC controller directly over your local Wi-Fi network.

![NodeJS](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011-0078D6?logo=windows&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-Realtime%20Low%20Latency-02569B)
![License](https://img.shields.io/badge/License-MIT-purple.svg)

---

## ⚡ Architecture & How It Works

```
  ┌───────────────────────────────────────────────────────────────┐
  │                   Mobile Device (Phone / Tablet)              │
  │   - Trackpad Gestures   - Native Keyboard (IME)               │
  │   - Gyro Motion (Air)   - Mic / Camera Stream                 │
  └──────────────────────────────┬────────────────────────────────┘
                                 │  Local Wi-Fi (HTTP / HTTPS / WS)
                                 ▼
  ┌───────────────────────────────────────────────────────────────┐
  │                 Node.js Server (:3000 / :3443)                │
  │   - Express Static Web App & REST APIs (Upload/Clipboard)     │
  │   - Low-latency WebSocket Server (Mouse, Keyboard, Camera)    │
  │   - UDP Loopback Audio Streamer (AudioRelay)                  │
  └──────────────────────────────┬────────────────────────────────┘
                                 │  Standard Input/Output (IPC)
                                 ▼
  ┌───────────────────────────────────────────────────────────────┐
  │              Native C# Windows Controller (Win32)             │
  │   - SendInput API (Sub-millisecond cursor movement & click)   │
  │   - CoreAudio API (Native Windows Master Volume OSD)          │
  │   - Windows Media loopback audio capture                      │
  └───────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 1. 🖱️ Ultra-Smooth Trackpad & Gestures
- **Zero-Lag Cursor Streaming**: Uses native Windows `SendInput` API for buttery-smooth mouse movement without lag or floatiness.
- **Single-Finger Tap**: Instant left click with subtle visual feedback.
- **Two-Finger Drag**: Ultra-responsive vertical scrolling (up to 50x sensitivity boost).
- **Physical 3-Button Mouse Bar**: Dedicated **Left Click**, **Middle Click** (Tab/Scroll), and **Right Click** buttons.
- **Adjustable Sensitivity**: Live sliders for cursor speed (`0.5x` - `4.0x`), scroll boost (`1.0x` - `50.0x`), and natural/reverse scroll.

### 2. 🪄 Gyroscope Air Mouse (Wii-style Pointer)
- Move your cursor in mid-air by pointing your phone like a presentation clicker or Nintendo Wiimote.
- Uses mobile 6-axis device orientation sensors over secure HTTPS.
- Choose between **Hold-to-Aim** or **Toggle** behavior with adjustable gyro sensitivity.

### 3. ⌨️ Mobile Remote Keyboard & Hotkeys
- **Native Mobile IME Streaming**: Tap to type with your phone's native keyboard (Gboard, Samsung Keyboard, Apple iOS Keyboard). Keystrokes stream directly to your active PC window in real-time.
- **No Clumsy Text Boxes**: Zero screen clutter. No fixed text chat box getting in your way.
- **Quick Action Keys**: `Esc`, `Tab`, `Space`, `Backspace`, `Enter / Send`.
- **Directional Arrow Cluster**: Full 4-way navigation (`▲`, `▼`, `◀`, `▶`).

### 4. 🔊 Master Volume & Audio Control
- **Dedicated Volume Bar**: `Vol -`, `Mute`, and `Vol +` directly on your screen.
- **Native Windows Volume OSD**: Directly controls Windows Master Endpoint Audio via CoreAudio API, showing the official Windows volume popup on your desktop.

### 5. 🎧 AudioRelay (PC Audio to Phone)
- Stream your PC's desktop audio (YouTube, Spotify, gaming, movies) straight to your smartphone.
- Connect your Bluetooth headphones / wireless earbuds to your phone and listen to PC audio from across the room.
- Low-latency PCM stream with automatic loopback device capture.

### 6. 📹 DroidCam / Wireless HD PC Webcam
- Turn your phone's back or front camera into a wireless HD webcam for your PC.
- View live in your browser (`http://localhost:3000/camera`) or add directly to **OBS Studio**, **Discord**, or **VLC** via the MJPEG feed (`http://localhost:3000/video_feed`).
- Includes built-in flashlight / torch toggle and front/back camera switcher.

### 7. 📁 Wireless File Transfer
- Send photos, videos, PDFs, and files directly from your phone to your PC.
- Automatically saves directly to your Windows **Downloads** folder (`C:\Users\<You>\Downloads`).
- Real-time progress bar with upload status.

### 8. 📋 Seamless Clipboard Sync
- Type or paste long text, links, or passwords on your phone and click **Send to PC Clipboard**.
- Immediately available on PC via `Ctrl + V`.

### 9. 📱 Progressive Web App (PWA) & WakeLock
- Fully installable on iOS (Add to Home Screen) and Android (Install App) as a standalone app.
- Built-in Screen WakeLock API prevents your phone display from turning off while in use.

### 10. 🎮 Virtual Gaming Controller (Gamepad)
- **Multi-Device Local Multiplayer (Player 1 - Player 4)**: Connect multiple phones simultaneously over Wi-Fi! Select **Player 1** (WASD) on one phone and **Player 2** (Arrow Keys / IJKL + Numpad) on another to play 2-player split-screen games, fighting games, or retro emulators together on the same PC. Supports up to 4 concurrent players.
- **Multi-Touch Gaming Layout**: Dedicated left-thumb navigation and right-thumb action clusters supporting simultaneous inputs.
- **Dynamic 360° Analog Joystick / D-Pad**: Smooth virtual thumbstick with spring-back deadzone mapping to WASD or Arrow keys. Quick-switch to 4-way D-Pad with a single tap.
- **Diamond Action Cluster (ABXY)**:
  - `A`: Jump / Accept (`Space`)
  - `B`: Sprint / Cancel (`Shift`)
  - `X`: Interact / Reload (`F`)
  - `Y`: Secondary Action (`E`)
- **Shoulder Bumpers & Triggers**:
  - `L1` (LB) / `R1` (RB): Shoulder bumpers for quick weapons, aiming, or firing.
  - `L2` (LT) / `R2` (RT): Triggers mapped for progressive brake/gas or primary mouse buttons.
- **Meta & Quick-Action Keys**: `Select` (`Tab`), `Start` (`Esc`), Hotbar/Slots `1, 2, 3, 4`, Map (`M`), and Reload (`R`).
- **Built-in Presets**:
  - 🎯 **FPS / Action**: WASD movement, Sprint, Jump, Interact, Mouse clicks.
  - 🏎️ **Racing**: Accelerate (`W`), Brake/Reverse (`S`), Steer Left/Right (`A`/`D`), Handbrake (`Space`), Nitro (`Shift`).
  - 🕹️ **Retro / Arcade**: Classic D-Pad arrow navigation with arcade action buttons.
- **Landscape Console Feel**: Rotate your phone to landscape mode for an ergonomic handheld console layout.

---

## 🚀 Getting Started

### Prerequisites
- Windows 10 or 11 PC
- [Node.js](https://nodejs.org/) (version 18 or newer recommended)
- PC and Smartphone connected to the **same local Wi-Fi router / network**

### 1-Click Launch (Recommended)
Simply double-click **`start.bat`** in the project folder.
- Installs packages (`npm install`) automatically if needed.
- Compiles the native C# controller (`bin\controller.exe`) using Windows built-in .NET compiler.
- Displays your connection URL and ASCII QR code.

### Manual Terminal Launch
```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
```

---

## 📱 Connecting from Your Mobile Phone

1. Open your smartphone browser (Chrome, Safari, Edge, Firefox).
2. Visit the secure HTTPS address displayed in your terminal (e.g., **`https://192.168.0.105:3443`**).
3. **Accept Local SSL Certificate**:
   - Because local servers use a self-signed SSL certificate (required by browsers for Gyro Air Mouse and Camera), your browser may display a warning:
   - On **Chrome / Android**: Tap **Advanced** ➔ **Proceed to 192.168.x.x (unsafe)**.
   - On **Safari / iOS**: Tap **Show Details** ➔ **Visit this website**.
4. *(Optional)* Tap browser menu ➔ **"Add to Home Screen"** or **"Install App"** to use it fullscreen without browser bars!

---

## ⚙️ Windows Auto-Start & Background Service

Want the server to start automatically whenever you turn on your PC without having a terminal open?

### Enable Auto-Start on Boot
- Double-click **`scripts\enable-autostart.bat`**.
- It registers Web Remote Mouse in your Windows Startup registry and launches the server silently in the background.

### Check Server Status Anytime
- Double-click **`scripts\check-status.bat`**.
- Gives you an instant status monitor:
  - 🟢 **SERVER ONLINE**: Shows Port 3443 status, Process ID (PID), and active Mobile URL.
  - Option to Restart, Stop, or Open connection in one keystroke.

### Disable Auto-Start
- Double-click **`scripts\disable-autostart.bat`** to remove it from Windows boot startup.

---

## 🔒 Locking PC Static IP (Recommended)
Home Wi-Fi routers frequently change PC IP addresses via DHCP, breaking your phone bookmark.
- Run **`scripts\lock-static-ip.bat`** (as Administrator).
- It binds your PC's active Wi-Fi / Ethernet adapter to its current IP address permanently so your phone bookmark never stops working.

---

## 🛠️ Project Structure

```
├── bin/
│   ├── controller.cs         # High-performance native C# Win32 controller
│   └── controller.exe        # Compiled binary (SendInput, CoreAudio API)
├── public/
│   ├── css/                  # Modular glassmorphism dark-mode stylesheets
│   │   ├── style.css         # Core layout, trackpad & touch styling
│   │   ├── tools.css         # Tools drawer, keyboard & modal styling
│   │   └── gamepad.css       # Virtual gamepad joystick & buttons styling
│   ├── js/
│   │   ├── app.js            # Main PWA lifecycle & initialization
│   │   ├── trackpad.js       # Mouse gesture engine (drag, tap, multi-touch scroll)
│   │   ├── air-mouse.js      # 6-axis device orientation gyro engine
│   │   ├── gamepad.js        # Virtual gaming controller (analog stick, ABXY, presets)
│   │   ├── keyboard.js       # Direct mobile IME keystroke streamer
│   │   ├── audio-relay.js    # Low-latency PC sound playback on phone
│   │   ├── cam.js            # Camera video streaming (OBS / DroidCam)
│   │   ├── connection.js     # WebSocket connection & auto-reconnect
│   │   ├── panels.js         # Slide-up drawers, modals & tools
│   │   └── state.js          # Persistent sensitivity and user settings
│   ├── index.html            # Responsive mobile-first interface
│   ├── manifest.json         # PWA Web App Manifest
│   └── sw.js                 # Service Worker for offline asset caching
├── scripts/
│   ├── check-status.bat      # Live server status & management tool
│   ├── enable-autostart.bat  # 1-click Windows boot auto-start activator
│   ├── disable-autostart.bat # 1-click Windows boot auto-start remover
│   ├── lock-static-ip.bat    # 1-click permanent LAN IP fixer
│   ├── lock-static-ip.ps1    # PowerShell static IP adapter configuration
│   ├── unlock-dhcp-ip.bat    # Revert to automatic DHCP IP
│   ├── unlock-dhcp-ip.ps1    # PowerShell DHCP IP adapter configuration
│   ├── start-hidden.vbs      # Silent background process launcher
│   └── get-ip.js             # Reliable LAN IP detection helper
├── server.js                 # Unified HTTP/HTTPS/WebSocket Node.js backend
├── start.bat                 # 1-click main console launcher
└── package.json              # Node.js project manifest & dependencies
```

---

## ❓ Frequently Asked Questions (FAQ)

<details>
<summary><b>1. Phone shows "Site can't be reached" or connection timeout?</b></summary>

- Ensure both your PC and phone are on the **same Wi-Fi network**.
- If your PC is connected to a VPN or Cloudflare WARP, make sure your phone connects to the actual LAN IP (`192.168.0.x`).
- Check Windows Firewall: allow Node.js through private networks, or run `check-status.bat` to confirm port 3443 is listening.
</details>

<details>
<summary><b>2. Why does HTTPS show a certificate warning on first visit?</b></summary>

- Modern browsers require HTTPS to access mobile motion sensors (Gyro Air Mouse) and Camera.
- The server generates a safe, local self-signed certificate for your private network. Tap **"Advanced" ➔ "Proceed"** to continue.
</details>

<details>
<summary><b>3. How do I use the phone as a webcam in OBS Studio?</b></summary>

1. Open the Camera tool in the mobile app.
2. In OBS Studio, add a **Browser Source**.
3. Set the URL to: `http://localhost:3000/video_feed` and set width/height to `1280x720` or `1920x1080`.
</details>

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
