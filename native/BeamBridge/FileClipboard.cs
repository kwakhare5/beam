using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

namespace BeamBridge;

internal static class FileClipboard
{
    private const uint CF_HDROP = 15;
    private const uint GMEM_MOVEABLE = 0x0002;
    private const int DropFilesSize = 20;

    public static bool Copy(IReadOnlyList<string> paths, out string error)
    {
        if (paths.Count == 0)
        {
            error = "no paths";
            return false;
        }

        var bytes = BuildDropFiles(paths);
        var memory = GlobalAlloc(GMEM_MOVEABLE, (UIntPtr)bytes.Length);
        if (memory == IntPtr.Zero)
        {
            error = new Win32Exception(Marshal.GetLastWin32Error()).Message;
            return false;
        }

        var target = GlobalLock(memory);
        if (target == IntPtr.Zero)
        {
            error = new Win32Exception(Marshal.GetLastWin32Error()).Message;
            GlobalFree(memory);
            return false;
        }

        try
        {
            Marshal.Copy(bytes, 0, target, bytes.Length);
        }
        finally
        {
            GlobalUnlock(memory);
        }

        if (!OpenClipboardWithRetry(out error))
        {
            GlobalFree(memory);
            return false;
        }

        try
        {
            if (!EmptyClipboard())
            {
                error = new Win32Exception(Marshal.GetLastWin32Error()).Message;
                GlobalFree(memory);
                return false;
            }

            if (SetClipboardData(CF_HDROP, memory) == IntPtr.Zero)
            {
                error = new Win32Exception(Marshal.GetLastWin32Error()).Message;
                GlobalFree(memory);
                return false;
            }
        }
        finally
        {
            CloseClipboard();
        }

        error = string.Empty;
        return true;
    }

    private static byte[] BuildDropFiles(IReadOnlyList<string> paths)
    {
        var text = string.Join('\0', paths) + "\0\0";
        var bytes = new byte[DropFilesSize + Encoding.Unicode.GetByteCount(text)];

        using var stream = new MemoryStream(bytes);
        using var writer = new BinaryWriter(stream);
        writer.Write(DropFilesSize);
        writer.Write(0);
        writer.Write(0);
        writer.Write(0);
        writer.Write(1);
        writer.Write(Encoding.Unicode.GetBytes(text));
        return bytes;
    }

    private static bool OpenClipboardWithRetry(out string error)
    {
        for (var attempt = 0; attempt < 5; attempt++)
        {
            if (OpenClipboard(IntPtr.Zero))
            {
                error = string.Empty;
                return true;
            }
            Thread.Sleep(50);
        }
        error = new Win32Exception(Marshal.GetLastWin32Error()).Message;
        return false;
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool OpenClipboard(IntPtr owner);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool EmptyClipboard();

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetClipboardData(uint format, IntPtr memory);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool CloseClipboard();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr GlobalAlloc(uint flags, UIntPtr bytes);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr GlobalLock(IntPtr memory);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GlobalUnlock(IntPtr memory);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr GlobalFree(IntPtr memory);
}
