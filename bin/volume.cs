using System;
using System.Runtime.InteropServices;

namespace RemoteMouse {
    class VolumeControl {
        [DllImport("user32.dll")]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);

        const int KEYEVENTF_EXTENDEDKEY = 0x0001;
        const int KEYEVENTF_KEYUP = 0x0002;

        const byte VK_VOLUME_MUTE = 0xAD;
        const byte VK_VOLUME_DOWN = 0xAE;
        const byte VK_VOLUME_UP = 0xAF;

        static void Main(string[] args) {
            if (args.Length == 0) return;
            string cmd = args[0].Trim().ToLower();
            byte vk = 0;

            if (cmd == "up") {
                vk = VK_VOLUME_UP;
            } else if (cmd == "down") {
                vk = VK_VOLUME_DOWN;
            } else if (cmd == "mute") {
                vk = VK_VOLUME_MUTE;
            }

            if (vk != 0) {
                // Trigger standard Windows extended multimedia key event
                keybd_event(vk, 0, KEYEVENTF_EXTENDEDKEY, 0);
                keybd_event(vk, 0, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, 0);
            }
        }
    }
}
