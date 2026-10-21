using System;
using System.Runtime.InteropServices;
using System.Text;

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

    class Controller {
        [DllImport("user32.dll")]
        static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);

        [DllImport("user32.dll")]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

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
        const byte VK_ESCAPE = 0x1B;
        const byte VK_SPACE = 0x20;
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
            public KEYBDINPUT ki;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct KEYBDINPUT {
            public ushort wVk;
            public ushort wScan;
            public uint dwFlags;
            public uint time;
            public UIntPtr dwExtraInfo;
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

        static void HandleVolume(string action) {
            var audio = GetAudio();
            Guid empty = Guid.Empty;
            if (audio != null) {
                try {
                    if (action == "up") {
                        audio.VolumeStepUp(ref empty);
                        return;
                    } else if (action == "down") {
                        audio.VolumeStepDown(ref empty);
                        return;
                    } else if (action == "mute") {
                        bool currentMute;
                        audio.GetMute(out currentMute);
                        audio.SetMute(!currentMute, ref empty);
                        return;
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
            inputs[0].u.ki.dwExtraInfo = UIntPtr.Zero;

            inputs[1].type = 1;
            inputs[1].u.ki.wVk = 0;
            inputs[1].u.ki.wScan = (ushort)ch;
            inputs[1].u.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
            inputs[1].u.ki.time = 0;
            inputs[1].u.ki.dwExtraInfo = UIntPtr.Zero;

            SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT)));
        }

        static void TapKey(byte vk, bool extended = false) {
            uint flags = extended ? KEYEVENTF_EXTENDEDKEY : 0;
            keybd_event(vk, 0, flags, UIntPtr.Zero);
            keybd_event(vk, 0, flags | KEYEVENTF_KEYUP, UIntPtr.Zero);
        }

        static void Main(string[] args) {
            Console.InputEncoding = Encoding.UTF8;
            Console.OutputEncoding = Encoding.UTF8;
            Console.WriteLine("READY");

            string line;
            while ((line = Console.ReadLine()) != null) {
                line = line.Trim();
                if (line.Length == 0) continue;

                try {
                    int spaceIdx = line.IndexOf(' ');
                    string cmd = spaceIdx > 0 ? line.Substring(0, spaceIdx).ToLower() : line.ToLower();
                    string rest = spaceIdx > 0 ? line.Substring(spaceIdx + 1).Trim() : "";

                    switch (cmd) {
                        case "move": {
                            string[] parts = rest.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                            if (parts.Length >= 2) {
                                int dx = int.Parse(parts[0]);
                                int dy = int.Parse(parts[1]);
                                mouse_event(MOUSEEVENTF_MOVE, dx, dy, 0, UIntPtr.Zero);
                            }
                            break;
                        }
                        case "click": {
                            string btn = rest.ToLower();
                            if (btn == "right") {
                                mouse_event(MOUSEEVENTF_RIGHTDOWN | MOUSEEVENTF_RIGHTUP, 0, 0, 0, UIntPtr.Zero);
                            } else if (btn == "middle") {
                                mouse_event(MOUSEEVENTF_MIDDLEDOWN | MOUSEEVENTF_MIDDLEUP, 0, 0, 0, UIntPtr.Zero);
                            } else {
                                mouse_event(MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
                            }
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
                            uint dwData = unchecked((uint)(amount * 120));
                            mouse_event(MOUSEEVENTF_WHEEL, 0, 0, dwData, UIntPtr.Zero);
                            break;
                        }
                        case "vol":
                        case "volume": {
                            HandleVolume(rest.ToLower());
                            break;
                        }
                        case "key": {
                            string keyName = rest;
                            if (keyName.Equals("Enter", StringComparison.OrdinalIgnoreCase) || keyName.Equals("Return", StringComparison.OrdinalIgnoreCase)) TapKey(VK_RETURN);
                            else if (keyName.Equals("Backspace", StringComparison.OrdinalIgnoreCase)) TapKey(VK_BACK);
                            else if (keyName.Equals("Tab", StringComparison.OrdinalIgnoreCase)) TapKey(VK_TAB);
                            else if (keyName.Equals("Escape", StringComparison.OrdinalIgnoreCase) || keyName.Equals("Esc", StringComparison.OrdinalIgnoreCase)) TapKey(VK_ESCAPE);
                            else if (keyName.Equals("Space", StringComparison.OrdinalIgnoreCase)) TapKey(VK_SPACE);
                            else if (keyName.Equals("ArrowUp", StringComparison.OrdinalIgnoreCase) || keyName.Equals("Up", StringComparison.OrdinalIgnoreCase)) TapKey(VK_UP, true);
                            else if (keyName.Equals("ArrowDown", StringComparison.OrdinalIgnoreCase) || keyName.Equals("Down", StringComparison.OrdinalIgnoreCase)) TapKey(VK_DOWN, true);
                            else if (keyName.Equals("ArrowLeft", StringComparison.OrdinalIgnoreCase) || keyName.Equals("Left", StringComparison.OrdinalIgnoreCase)) TapKey(VK_LEFT, true);
                            else if (keyName.Equals("ArrowRight", StringComparison.OrdinalIgnoreCase) || keyName.Equals("Right", StringComparison.OrdinalIgnoreCase)) TapKey(VK_RIGHT, true);
                            break;
                        }
                        case "type": {
                            foreach (char c in rest) {
                                SendUnicodeChar(c);
                            }
                            break;
                        }
                        case "exit": {
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
