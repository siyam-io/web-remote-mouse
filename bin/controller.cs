using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Automation;
using System.Windows;

namespace RemoteMouse {
    [ComImport]
    [Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    internal class MMDeviceEnumeratorComObject { }

    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IMMDeviceEnumerator {
        int NotImpl1();
        [PreserveSig]
        int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
    }

    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IMMDevice {
        [PreserveSig]
        int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
    }

    [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioEndpointVolume {
        int NotImpl1();
        int NotImpl2();
        [PreserveSig]
        int GetChannelCount(out uint pnChannelCount);
        [PreserveSig]
        int SetMasterVolumeLevel(float fLevelDB, ref Guid pguidEventContext);
        [PreserveSig]
        int SetMasterVolumeLevelScalar(float fLevel, ref Guid pguidEventContext);
        [PreserveSig]
        int GetMasterVolumeLevel(out float pfLevelDB);
        [PreserveSig]
        int GetMasterVolumeLevelScalar(out float pfLevel);
        [PreserveSig]
        int SetChannelVolumeLevel(uint nChannel, float fLevelDB, ref Guid pguidEventContext);
        [PreserveSig]
        int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, ref Guid pguidEventContext);
        [PreserveSig]
        int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
        [PreserveSig]
        int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
        [PreserveSig]
        int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, ref Guid pguidEventContext);
        [PreserveSig]
        int GetMute(out bool pbMute);
        [PreserveSig]
        int GetVolumeStepInfo(out uint pnStep, out uint pnStepCount);
        [PreserveSig]
        int VolumeStepUp(ref Guid pguidEventContext);
        [PreserveSig]
        int VolumeStepDown(ref Guid pguidEventContext);
    }

    class LiveAudioReceiver {
        [StructLayout(LayoutKind.Sequential)]
        public struct WAVEFORMATEX {
            public ushort wFormatTag;
            public ushort nChannels;
            public uint nSamplesPerSec;
            public uint nAvgBytesPerSec;
            public ushort nBlockAlign;
            public ushort wBitsPerSample;
            public ushort cbSize;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct WAVEHDR {
            public IntPtr lpData;
            public uint dwBufferLength;
            public uint dwBytesRecorded;
            public IntPtr dwUser;
            public uint dwFlags;
            public uint dwLoops;
            public IntPtr lpNext;
            public IntPtr reserved;
        }

        public delegate void WaveCallback(IntPtr hWaveOut, int uMsg, IntPtr dwUser, IntPtr lpWaveHdr, IntPtr dwParam);
        const int CALLBACK_FUNCTION = 0x00030000;
        const int MM_WOM_DONE = 0x3BD;

        [DllImport("winmm.dll")]
        public static extern int waveOutOpen(out IntPtr hWaveOut, int uDeviceID, ref WAVEFORMATEX lpFormat, WaveCallback dwCallback, IntPtr dwInstance, int dwFlags);

        [DllImport("winmm.dll")]
        public static extern int waveOutPrepareHeader(IntPtr hWaveOut, IntPtr lpWaveHdr, int uSize);

        [DllImport("winmm.dll")]
        public static extern int waveOutUnprepareHeader(IntPtr hWaveOut, IntPtr lpWaveHdr, int uSize);

        [DllImport("winmm.dll")]
        public static extern int waveOutWrite(IntPtr hWaveOut, IntPtr lpWaveHdr, int uSize);

        [DllImport("winmm.dll")]
        public static extern int waveOutClose(IntPtr hWaveOut);

        static IntPtr _hWaveOut;
        static WaveCallback _callback;
        static UdpClient _udp;
        static Thread _listenerThread;
        static bool _running;

        static void OnWaveOut(IntPtr hWaveOut, int uMsg, IntPtr dwUser, IntPtr lpWaveHdr, IntPtr dwParam) {
            if (uMsg == MM_WOM_DONE && lpWaveHdr != IntPtr.Zero) {
                try {
                    WAVEHDR hdr = (WAVEHDR)Marshal.PtrToStructure(lpWaveHdr, typeof(WAVEHDR));
                    waveOutUnprepareHeader(hWaveOut, lpWaveHdr, Marshal.SizeOf(typeof(WAVEHDR)));
                    if (hdr.lpData != IntPtr.Zero) {
                        Marshal.FreeHGlobal(hdr.lpData);
                    }
                    Marshal.FreeHGlobal(lpWaveHdr);
                } catch {}
            }
        }

        public static void Start(int port = 50005) {
            if (_running) return;
            try {
                WAVEFORMATEX fmt = new WAVEFORMATEX {
                    wFormatTag = 1, // PCM
                    nChannels = 1,  // Mono
                    nSamplesPerSec = 16000,
                    wBitsPerSample = 16,
                    nBlockAlign = 2,
                    nAvgBytesPerSec = 32000,
                    cbSize = 0
                };

                _callback = new WaveCallback(OnWaveOut);
                int res = waveOutOpen(out _hWaveOut, -1, ref fmt, _callback, IntPtr.Zero, CALLBACK_FUNCTION);
                if (res != 0) return;

                _udp = new UdpClient(port);
                _running = true;

                _listenerThread = new Thread(() => {
                    IPEndPoint ep = new IPEndPoint(IPAddress.Any, port);
                    while (_running) {
                        try {
                            byte[] data = _udp.Receive(ref ep);
                            if (data != null && data.Length > 0 && _hWaveOut != IntPtr.Zero) {
                                IntPtr pData = Marshal.AllocHGlobal(data.Length);
                                Marshal.Copy(data, 0, pData, data.Length);

                                WAVEHDR hdr = new WAVEHDR {
                                    lpData = pData,
                                    dwBufferLength = (uint)data.Length,
                                    dwFlags = 0
                                };

                                IntPtr pHdr = Marshal.AllocHGlobal(Marshal.SizeOf(typeof(WAVEHDR)));
                                Marshal.StructureToPtr(hdr, pHdr, false);

                                int pRes = waveOutPrepareHeader(_hWaveOut, pHdr, Marshal.SizeOf(typeof(WAVEHDR)));
                                if (pRes == 0) {
                                    waveOutWrite(_hWaveOut, pHdr, Marshal.SizeOf(typeof(WAVEHDR)));
                                } else {
                                    Marshal.FreeHGlobal(pData);
                                    Marshal.FreeHGlobal(pHdr);
                                }
                            }
                        } catch {
                            break;
                        }
                    }
                }) { IsBackground = true };
                _listenerThread.Start();
            } catch {}
        }

        public static void Stop() {
            _running = false;
            try { if (_udp != null) _udp.Close(); } catch {}
            try { if (_hWaveOut != IntPtr.Zero) waveOutClose(_hWaveOut); } catch {}
        }
    }

    class LiveAudioLoopback {
        [Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        internal interface IAudioClient {
            [PreserveSig] int Initialize(int shareMode, int streamFlags, long hnsBufferDuration, long hnsPeriodicity, IntPtr pFormat, [In] ref Guid audioSessionGuid);
            [PreserveSig] int GetBufferSize(out uint pNumBufferFrames);
            [PreserveSig] int GetStreamLatency(out long phnsLatency);
            [PreserveSig] int GetCurrentPadding(out uint pNumPaddingFrames);
            [PreserveSig] int IsFormatSupported(int shareMode, IntPtr pFormat, out IntPtr ppClosestMatch);
            [PreserveSig] int GetMixFormat(out IntPtr ppDeviceFormat);
            [PreserveSig] int GetDevicePeriod(out long phnsDefaultDevicePeriod, out long phnsMinimumDevicePeriod);
            [PreserveSig] int Start();
            [PreserveSig] int Stop();
            [PreserveSig] int Reset();
            [PreserveSig] int SetEventHandle(IntPtr eventHandle);
            [PreserveSig] int GetService(ref Guid riid, [MarshalAs(UnmanagedType.IUnknown)] out object ppv);
        }

        [Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        internal interface IAudioCaptureClient {
            [PreserveSig] int GetBuffer(out IntPtr ppData, out uint pNumFramesToRead, out int pdwFlags, out ulong pu64DevicePosition, out ulong pu64QPCPosition);
            [PreserveSig] int ReleaseBuffer(uint numFramesRead);
            [PreserveSig] int GetNextPacketSize(out uint pNumFramesInNextPacket);
        }

        static bool _running;
        static Thread _thread;
        static UdpClient _udp;
        static IAudioClient _audioClient;
        static IAudioCaptureClient _captureClient;

        public static void Start(int targetPort = 50006) {
            if (_running) return;
            try {
                IMMDeviceEnumerator enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
                IMMDevice device;
                if (enumerator.GetDefaultAudioEndpoint(0, 0, out device) != 0 || device == null) return;

                Guid IID_IAudioClient = new Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2");
                object clientObj;
                if (device.Activate(ref IID_IAudioClient, 1, IntPtr.Zero, out clientObj) != 0 || clientObj == null) return;

                _audioClient = (IAudioClient)clientObj;
                IntPtr pFormat;
                if (_audioClient.GetMixFormat(out pFormat) != 0 || pFormat == IntPtr.Zero) return;

                LiveAudioReceiver.WAVEFORMATEX fmt = (LiveAudioReceiver.WAVEFORMATEX)Marshal.PtrToStructure(pFormat, typeof(LiveAudioReceiver.WAVEFORMATEX));
                int nChannels = fmt.nChannels;

                Guid emptySession = Guid.Empty;
                if (_audioClient.Initialize(0, 0x00020000 /* LOOPBACK */, 10000000 /* 1s */, 0, pFormat, ref emptySession) != 0) return;

                Guid IID_IAudioCaptureClient = new Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317");
                object captureObj;
                if (_audioClient.GetService(ref IID_IAudioCaptureClient, out captureObj) != 0 || captureObj == null) return;
                _captureClient = (IAudioCaptureClient)captureObj;

                _udp = new UdpClient();
                IPEndPoint destEp = new IPEndPoint(IPAddress.Loopback, targetPort);

                _audioClient.Start();
                _running = true;

                _thread = new Thread(() => {
                    uint packetSize;
                    IntPtr pData;
                    uint numFrames;
                    int flags;
                    ulong devPos, qpcPos;
                    float[] floatBuf = new float[4096 * nChannels];
                    byte[] pcmBuf = new byte[4096 * 2];

                    while (_running) {
                        try {
                            Thread.Sleep(20);
                            while (_captureClient.GetNextPacketSize(out packetSize) == 0 && packetSize > 0) {
                                if (_captureClient.GetBuffer(out pData, out numFrames, out flags, out devPos, out qpcPos) == 0) {
                                    if (numFrames > 0 && pData != IntPtr.Zero) {
                                        bool isSilent = (flags & 2) != 0;
                                        int totalSamples = (int)(numFrames * nChannels);
                                        if (floatBuf.Length < totalSamples) floatBuf = new float[totalSamples];
                                        if (pcmBuf.Length < numFrames * 2) pcmBuf = new byte[numFrames * 2];

                                        if (isSilent) {
                                            Array.Clear(pcmBuf, 0, (int)(numFrames * 2));
                                        } else {
                                            Marshal.Copy(pData, floatBuf, 0, totalSamples);
                                            for (int i = 0; i < numFrames; i++) {
                                                float sample = nChannels > 1 ? (floatBuf[i * nChannels] + floatBuf[i * nChannels + 1]) * 0.5f : floatBuf[i];
                                                short s = (short)Math.Max(-32768, Math.Min(32767, (int)(sample * 32767f)));
                                                pcmBuf[i * 2] = (byte)(s & 0xFF);
                                                pcmBuf[i * 2 + 1] = (byte)((s >> 8) & 0xFF);
                                            }
                                        }
                                        _udp.Send(pcmBuf, (int)(numFrames * 2), destEp);
                                    }
                                    _captureClient.ReleaseBuffer(numFrames);
                                }
                            }
                        } catch {
                            break;
                        }
                    }
                }) { IsBackground = true };
                _thread.Start();
            } catch {}
        }

        public static void Stop() {
            _running = false;
            try { if (_audioClient != null) _audioClient.Stop(); } catch {}
            try { if (_udp != null) _udp.Close(); } catch {}
        }
    }

    class Controller {
        [DllImport("user32.dll")]
        static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);

        [DllImport("user32.dll")]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        [DllImport("user32.dll")]
        static extern uint MapVirtualKey(uint uCode, uint uMapType);

        [DllImport("user32.dll")]
        static extern short VkKeyScan(char ch);

        [DllImport("user32.dll", SetLastError = true)]
        static extern uint SendInput(uint nInputs, [In] INPUT[] pInputs, int cbSize);

        const uint MOUSEEVENTF_MOVE = 0x0001;
        const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        const uint MOUSEEVENTF_LEFTUP = 0x0004;
        const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
        const uint MOUSEEVENTF_RIGHTUP = 0x0010;
        const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
        const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
        const uint MOUSEEVENTF_WHEEL = 0x0800;

        const uint KEYEVENTF_EXTENDEDKEY = 0x0001;
        const uint KEYEVENTF_KEYUP = 0x0002;
        const uint KEYEVENTF_UNICODE = 0x0004;

        const byte VK_BACK = 0x08;
        const byte VK_TAB = 0x09;
        const byte VK_RETURN = 0x0D;
        const byte VK_SHIFT = 0x10;
        const byte VK_CONTROL = 0x11;
        const byte VK_MENU = 0x12; // Alt key
        const byte VK_ESCAPE = 0x1B;
        const byte VK_SPACE = 0x20;
        const byte VK_PRIOR = 0x21; // Page Up
        const byte VK_NEXT = 0x22;  // Page Down
        const byte VK_END = 0x23;
        const byte VK_HOME = 0x24;
        const byte VK_LEFT = 0x25;
        const byte VK_UP = 0x26;
        const byte VK_RIGHT = 0x27;
        const byte VK_DOWN = 0x28;

        [StructLayout(LayoutKind.Sequential)]
        struct INPUT {
            public uint type;
            public InputUnion u;
        }

        [StructLayout(LayoutKind.Explicit)]
        struct InputUnion {
            [FieldOffset(0)]
            public MOUSEINPUT mi;
            [FieldOffset(0)]
            public KEYBDINPUT ki;
            [FieldOffset(0)]
            public HARDWAREINPUT hi;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct MOUSEINPUT {
            public int dx;
            public int dy;
            public uint mouseData;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct KEYBDINPUT {
            public ushort wVk;
            public ushort wScan;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct HARDWAREINPUT {
            public uint uMsg;
            public ushort wParamL;
            public ushort wParamH;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct RECT {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct GUITHREADINFO {
            public int cbSize;
            public int flags;
            public IntPtr hwndActive;
            public IntPtr hwndFocus;
            public IntPtr hwndCapture;
            public IntPtr hwndMenuOwner;
            public IntPtr hwndMoveSize;
            public IntPtr hwndCaret;
            public RECT rcCaret;
        }

        [DllImport("user32.dll")]
        static extern bool GetGUIThreadInfo(uint idThread, ref GUITHREADINFO lpgui);

        [StructLayout(LayoutKind.Sequential)]
        struct POINT { public int x, y; }

        [DllImport("user32.dll")]
        static extern bool GetCursorPos(out POINT lpPoint);

        [DllImport("user32.dll")]
        static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, int wParam, StringBuilder lParam);
        const uint WM_GETTEXT = 0x000D;

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

        static void CheckFocusedTextFieldAsync() {
            ThreadPool.QueueUserWorkItem(_ => {
                try {
                    // Small delay to allow the target app to process the click and set focus
                    Thread.Sleep(120);
                    string text = null;
                    bool isEditable = false;

                    // 1. Strict UI Automation Check: Only actual Input fields / Textareas / Search bars
                    POINT pt;
                    GetCursorPos(out pt);
                    AutomationElement[] candidates = new AutomationElement[2];
                    try { candidates[0] = AutomationElement.FocusedElement; } catch {}
                    try { candidates[1] = AutomationElement.FromPoint(new Point(pt.x, pt.y)); } catch {}

                    foreach (var el in candidates) {
                        if (el == null) continue;
                        try {
                            ControlType ct = el.Current.ControlType;
                            // Only match actual input fields: ControlType.Edit or editable ComboBox (search bars)
                            // Strictly ignore Document, Text (paragraphs/labels), Pane, Group, etc.
                            if (ct == ControlType.Edit || ct == ControlType.ComboBox) {
                                if (el.Current.IsEnabled) {
                                    bool isReadOnly = false;
                                    object pat;
                                    if (el.TryGetCurrentPattern(ValuePattern.Pattern, out pat)) {
                                        var vp = (ValuePattern)pat;
                                        isReadOnly = vp.Current.IsReadOnly;
                                        if (!isReadOnly && string.IsNullOrEmpty(text)) {
                                            text = vp.Current.Value;
                                        }
                                    }

                                    if (!isReadOnly) {
                                        isEditable = true;
                                        if (string.IsNullOrEmpty(text) && el.TryGetCurrentPattern(TextPattern.Pattern, out pat)) {
                                            var tp = (TextPattern)pat;
                                            text = tp.DocumentRange.GetText(2000);
                                        }
                                        break; // Found true editable input field!
                                    }
                                }
                            }
                        } catch {}
                    }

                    // 2. Win32 Caret Fallback: Only if active blinking text caret is inside an Edit control
                    if (!isEditable) {
                        IntPtr fore = GetForegroundWindow();
                        if (fore != IntPtr.Zero) {
                            uint pid;
                            uint tid = GetWindowThreadProcessId(fore, out pid);
                            GUITHREADINFO gui = new GUITHREADINFO();
                            gui.cbSize = Marshal.SizeOf(typeof(GUITHREADINFO));
                            if (GetGUIThreadInfo(tid, ref gui)) {
                                if (gui.hwndCaret != IntPtr.Zero && (gui.rcCaret.Bottom > gui.rcCaret.Top)) {
                                    IntPtr targetHwnd = gui.hwndFocus != IntPtr.Zero ? gui.hwndFocus : gui.hwndCaret;
                                    StringBuilder className = new StringBuilder(256);
                                    GetClassName(targetHwnd, className, 256);
                                    string cls = className.ToString().ToLower();
                                    if (cls.Contains("edit") || cls.Contains("search") || cls.Contains("input")) {
                                        isEditable = true;
                                        if (gui.hwndFocus != IntPtr.Zero) {
                                            StringBuilder sb = new StringBuilder(2048);
                                            SendMessage(gui.hwndFocus, WM_GETTEXT, 2048, sb);
                                            if (sb.Length > 0) text = sb.ToString();
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (isEditable) {
                        string safeText = text != null ? Convert.ToBase64String(Encoding.UTF8.GetBytes(text)) : "";
                        Console.WriteLine("TEXTFOCUS " + safeText);
                        Console.Out.Flush();
                    }
                } catch {
                    // Suppress automation exceptions
                }
            });
        }

        static IAudioEndpointVolume _audio;
        static IAudioEndpointVolume GetAudio() {
            if (_audio != null) return _audio;
            try {
                var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
                IMMDevice dev;
                enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
                Guid iid = typeof(IAudioEndpointVolume).GUID;
                object o;
                dev.Activate(ref iid, 1, IntPtr.Zero, out o);
                _audio = (IAudioEndpointVolume)o;
            } catch {
                _audio = null;
            }
            return _audio;
        }

        static void MoveMouse(int dx, int dy) {
            INPUT[] inputs = new INPUT[1];
            inputs[0].type = 0; // INPUT_MOUSE
            inputs[0].u.mi.dx = dx;
            inputs[0].u.mi.dy = dy;
            inputs[0].u.mi.dwFlags = MOUSEEVENTF_MOVE;
            uint r = SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
            if (r == 0) {
                mouse_event(MOUSEEVENTF_MOVE, dx, dy, 0, UIntPtr.Zero);
            }
        }

        static void MouseClick(uint downFlag, uint upFlag) {
            INPUT[] inputs = new INPUT[2];
            inputs[0].type = 0; // INPUT_MOUSE
            inputs[0].u.mi.dwFlags = downFlag;
            inputs[1].type = 0;
            inputs[1].u.mi.dwFlags = upFlag;
            uint r = SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT)));
            if (r == 0) {
                mouse_event(downFlag | upFlag, 0, 0, 0, UIntPtr.Zero);
            }
        }

        static void MouseScroll(int amount) {
            uint dwData = unchecked((uint)(amount * 120));
            INPUT[] inputs = new INPUT[1];
            inputs[0].type = 0; // INPUT_MOUSE
            inputs[0].u.mi.mouseData = dwData;
            inputs[0].u.mi.dwFlags = MOUSEEVENTF_WHEEL;
            uint r = SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
            if (r == 0) {
                mouse_event(MOUSEEVENTF_WHEEL, 0, 0, dwData, UIntPtr.Zero);
            }
        }

        const byte VK_VOLUME_MUTE = 0xAD;
        const byte VK_VOLUME_DOWN = 0xAE;
        const byte VK_VOLUME_UP = 0xAF;

        static void HandleVolume(string action) {
            if (action == "up") {
                TapKey(VK_VOLUME_UP, true);
                return;
            } else if (action == "down") {
                TapKey(VK_VOLUME_DOWN, true);
                return;
            } else if (action == "mute") {
                TapKey(VK_VOLUME_MUTE, true);
                return;
            }

            var audio = GetAudio();
            Guid empty = Guid.Empty;
            if (audio != null) {
                try {
                    if (action == "up") {
                        audio.VolumeStepUp(ref empty);
                    } else if (action == "down") {
                        audio.VolumeStepDown(ref empty);
                    } else if (action == "mute") {
                        bool currentMute;
                        audio.GetMute(out currentMute);
                        audio.SetMute(!currentMute, ref empty);
                    }
                } catch {
                    _audio = null;
                }
            }
        }

        static void SendUnicodeChar(char ch) {
            INPUT[] inputs = new INPUT[2];
            inputs[0].type = 1; // INPUT_KEYBOARD
            inputs[0].u.ki.wVk = 0;
            inputs[0].u.ki.wScan = (ushort)ch;
            inputs[0].u.ki.dwFlags = KEYEVENTF_UNICODE;
            inputs[0].u.ki.time = 0;
            inputs[0].u.ki.dwExtraInfo = IntPtr.Zero;

            inputs[1].type = 1;
            inputs[1].u.ki.wVk = 0;
            inputs[1].u.ki.wScan = (ushort)ch;
            inputs[1].u.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
            inputs[1].u.ki.time = 0;
            inputs[1].u.ki.dwExtraInfo = IntPtr.Zero;

            uint res = SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT)));
            if (res == 0) {
                short vk = VkKeyScan(ch);
                if (vk != -1) {
                    byte bVk = (byte)(vk & 0xFF);
                    byte shift = (byte)((vk >> 8) & 0xFF);
                    if ((shift & 1) != 0) keybd_event(VK_SHIFT, (byte)MapVirtualKey(VK_SHIFT, 0), 0, UIntPtr.Zero);
                    TapKey(bVk);
                    if ((shift & 1) != 0) keybd_event(VK_SHIFT, (byte)MapVirtualKey(VK_SHIFT, 0), KEYEVENTF_KEYUP, UIntPtr.Zero);
                }
            }
        }

        static void TapKey(byte vk, bool extended = false) {
            uint scan = MapVirtualKey(vk, 0);
            uint flags = extended ? KEYEVENTF_EXTENDEDKEY : 0;
            keybd_event(vk, (byte)scan, flags, UIntPtr.Zero);
            keybd_event(vk, (byte)scan, flags | KEYEVENTF_KEYUP, UIntPtr.Zero);
        }

        static void SetKeyState(byte vk, bool isDown, bool extended = false) {
            uint scan = MapVirtualKey(vk, 0);
            uint flags = (extended ? KEYEVENTF_EXTENDEDKEY : 0) | (isDown ? 0 : KEYEVENTF_KEYUP);
            keybd_event(vk, (byte)scan, flags, UIntPtr.Zero);
        }

        static void MouseButtonEvent(uint flag) {
            INPUT[] inputs = new INPUT[1];
            inputs[0].type = 0; // INPUT_MOUSE
            inputs[0].u.mi.dwFlags = flag;
            uint r = SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
            if (r == 0) {
                mouse_event(flag, 0, 0, 0, UIntPtr.Zero);
            }
        }

        static bool ResolveKey(string keyName, out byte vk, out bool extended) {
            vk = 0;
            extended = false;
            if (string.IsNullOrEmpty(keyName)) return false;

            string k = keyName.Trim().ToLower();

            // Single letters a-z
            if (k.Length == 1 && k[0] >= 'a' && k[0] <= 'z') {
                vk = (byte)('A' + (k[0] - 'a'));
                return true;
            }
            // Digits 0-9
            if (k.Length == 1 && k[0] >= '0' && k[0] <= '9') {
                vk = (byte)('0' + (k[0] - '0'));
                return true;
            }

            switch (k) {
                case "space": vk = VK_SPACE; return true;
                case "shift": case "lshift": vk = VK_SHIFT; return true;
                case "ctrl": case "lctrl": case "control": vk = VK_CONTROL; return true;
                case "alt": case "lalt": vk = VK_MENU; return true;
                case "tab": vk = VK_TAB; return true;
                case "esc": case "escape": vk = VK_ESCAPE; return true;
                case "enter": case "return": vk = VK_RETURN; return true;
                case "back": case "backspace": vk = VK_BACK; return true;
                case "up": case "arrowup": vk = VK_UP; extended = true; return true;
                case "down": case "arrowdown": vk = VK_DOWN; extended = true; return true;
                case "left": case "arrowleft": vk = VK_LEFT; extended = true; return true;
                case "right": case "arrowright": vk = VK_RIGHT; extended = true; return true;
                case "pageup": case "pgup": vk = VK_PRIOR; extended = true; return true;
                case "pagedown": case "pgdn": vk = VK_NEXT; extended = true; return true;
                case "home": vk = VK_HOME; extended = true; return true;
                case "end": vk = VK_END; extended = true; return true;
                case "del": case "delete": vk = 0x2E; extended = true; return true;
                case "insert": vk = 0x2D; extended = true; return true;
                case "f1": vk = 0x70; return true;
                case "f2": vk = 0x71; return true;
                case "f3": vk = 0x72; return true;
                case "f4": vk = 0x73; return true;
                case "f5": vk = 0x74; return true;
                case "f6": vk = 0x75; return true;
                case "f7": vk = 0x76; return true;
                case "f8": vk = 0x77; return true;
                case "f9": vk = 0x78; return true;
                case "f10": vk = 0x79; return true;
                case "f11": vk = 0x7A; return true;
                case "f12": vk = 0x7B; return true;
            }
            return false;
        }

        static void Main(string[] args) {
            Console.InputEncoding = Encoding.UTF8;
            Console.OutputEncoding = Encoding.UTF8;
            Console.WriteLine("READY");
            LiveAudioReceiver.Start(50005);
            LiveAudioLoopback.Start(50006);

            string line;
            while ((line = Console.ReadLine()) != null) {
                if (line.Length == 0) continue;
                if (!line.StartsWith("type ", StringComparison.OrdinalIgnoreCase)) {
                    line = line.Trim();
                    if (line.Length == 0) continue;
                }

                try {
                    int spaceIdx = line.IndexOf(' ');
                    string cmd = spaceIdx > 0 ? line.Substring(0, spaceIdx).ToLower() : line.ToLower();
                    string rest = spaceIdx > 0 ? (cmd == "type" ? line.Substring(spaceIdx + 1) : line.Substring(spaceIdx + 1).Trim()) : "";

                    switch (cmd) {
                        case "move": {
                            string[] parts = rest.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                            if (parts.Length >= 2) {
                                int dx = int.Parse(parts[0]);
                                int dy = int.Parse(parts[1]);
                                MoveMouse(dx, dy);
                            }
                            break;
                        }
                        case "click": {
                            string btn = rest.ToLower();
                            if (btn == "right") {
                                MouseClick(MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP);
                            } else if (btn == "middle") {
                                MouseClick(MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP);
                            } else {
                                MouseClick(MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP);
                            }
                            break;
                        }
                        case "mousedown": {
                            string btn = rest.ToLower();
                            if (btn == "right") MouseButtonEvent(MOUSEEVENTF_RIGHTDOWN);
                            else if (btn == "middle") MouseButtonEvent(MOUSEEVENTF_MIDDLEDOWN);
                            else MouseButtonEvent(MOUSEEVENTF_LEFTDOWN);
                            break;
                        }
                        case "mouseup": {
                            string btn = rest.ToLower();
                            if (btn == "right") MouseButtonEvent(MOUSEEVENTF_RIGHTUP);
                            else if (btn == "middle") MouseButtonEvent(MOUSEEVENTF_MIDDLEUP);
                            else MouseButtonEvent(MOUSEEVENTF_LEFTUP);
                            break;
                        }
                        case "keydown": {
                            byte vk;
                            bool ext;
                            if (ResolveKey(rest, out vk, out ext)) {
                                SetKeyState(vk, true, ext);
                            }
                            break;
                        }
                        case "keyup": {
                            byte vk;
                            bool ext;
                            if (ResolveKey(rest, out vk, out ext)) {
                                SetKeyState(vk, false, ext);
                            }
                            break;
                        }
                        case "checkfocus": {
                            CheckFocusedTextFieldAsync();
                            break;
                        }
                        case "scroll": {
                            // "scroll up 5", "scroll down 5", or "scroll 5"
                            int amount = 1;
                            string[] parts = rest.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                            if (parts.Length >= 2) {
                                int steps = int.Parse(parts[1]);
                                amount = parts[0].ToLower() == "up" ? steps : -steps;
                            } else if (parts.Length == 1) {
                                amount = int.Parse(parts[0]);
                            }
                            MouseScroll(amount);
                            break;
                        }
                        case "vol":
                        case "volume": {
                            HandleVolume(rest.ToLower());
                            break;
                        }
                        case "key": {
                            byte vk;
                            bool ext;
                            if (ResolveKey(rest, out vk, out ext)) {
                                TapKey(vk, ext);
                            } else if (rest.Equals("WinH", StringComparison.OrdinalIgnoreCase) || rest.Equals("Dictate", StringComparison.OrdinalIgnoreCase)) {
                                // Windows Voice Typing hotkey: Win + H
                                keybd_event(0x5B, 0, 0, UIntPtr.Zero);
                                TapKey(0x48); // 'H' key
                                keybd_event(0x5B, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                            }
                            break;
                        }
                        case "type": {
                            foreach (char c in rest) {
                                SendUnicodeChar(c);
                            }
                            break;
                        }
                        case "loopback": {
                            if (rest == "start") LiveAudioLoopback.Start(50006);
                            else if (rest == "stop") LiveAudioLoopback.Stop();
                            break;
                        }
                        case "exit": {
                            LiveAudioLoopback.Stop();
                            LiveAudioReceiver.Stop();
                            return;
                        }
                    }
                } catch {
                    // Suppress error and keep daemon running
                }
            }
        }
    }
}
