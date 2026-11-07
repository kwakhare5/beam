using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json.Nodes;

namespace BeamBridge;

internal sealed class FullscreenWatcher : IDisposable
{
    private const uint EVENT_SYSTEM_FOREGROUND = 0x0003;
    private const uint EVENT_OBJECT_LOCATIONCHANGE = 0x800B;
    private const uint WINEVENT_OUTOFCONTEXT = 0x0000;
    private const uint WINEVENT_SKIPOWNPROCESS = 0x0002;
    private const int OBJID_WINDOW = 0;
    private const uint MONITOR_DEFAULTTONEAREST = 2;
    private const uint DWMWA_EXTENDED_FRAME_BOUNDS = 9;
    private const uint DWMWA_CLOAKED = 14;
    private const int WM_CLOSE = 0x0010;
    private const int WM_DESTROY = 0x0002;
    private const int WM_TIMER = 0x0113;
    private const int WM_QUIT = 0x0012;
    private const uint PollMs = 1000;
    private const int Tolerance = 2;
    private const string ClassName = "BeamFullscreenWatcher";

    private static readonly string[] ShellClasses = { "Progman", "WorkerW", "Shell_TrayWnd", "Shell_SecondaryTrayWnd" };
    private static readonly IntPtr HwndMessage = new(-3);

    private readonly object gate = new();
    private readonly ManualResetEventSlim ready = new(false);
    private Thread? thread;
    private uint threadId;
    private IntPtr window;
    private IntPtr foregroundHook;
    private IntPtr locationHook;
    private WinEventDelegate? winEventKeepAlive;
    private WndProcDelegate? wndProcKeepAlive;
    private bool lastActive;
    private bool disposed;

    public static void EnableDpiAwareness()
    {
        try
        {
            SetProcessDpiAwarenessContext(new IntPtr(-4));
        }
        catch (EntryPointNotFoundException ex)
        {
            Protocol.Log($"dpi awareness unavailable: {ex.Message}");
        }
    }

    public void Start()
    {
        Publish(initial: true);
        thread = new Thread(Run) { IsBackground = true, Name = "fullscreen" };
        thread.Start();
        if (!ready.Wait(3000))
        {
            Protocol.Log("fullscreen watcher did not start");
        }
    }

    public (bool Active, RECT? Rect) Snapshot()
    {
        var hwnd = GetForegroundWindow();
        if (hwnd == IntPtr.Zero || !TryGetFrame(hwnd, out var frame))
        {
            return (false, null);
        }

        return (IsFullscreen(hwnd, in frame), frame);
    }

    public void Dispose()
    {
        if (disposed) return;
        disposed = true;
        var worker = thread;
        if (worker is null || !worker.IsAlive)
        {
            ready.Dispose();
            return;
        }

        if (window != IntPtr.Zero)
        {
            PostMessage(window, WM_CLOSE, IntPtr.Zero, IntPtr.Zero);
        }
        else if (threadId != 0)
        {
            PostThreadMessage(threadId, WM_QUIT, IntPtr.Zero, IntPtr.Zero);
        }

        if (!worker.Join(1500))
        {
            Protocol.Log("fullscreen thread did not exit");
            return;
        }
        ready.Dispose();
    }

    private void Run()
    {
        try
        {
            threadId = GetCurrentThreadId();
            wndProcKeepAlive = OnMessage;
            winEventKeepAlive = OnWinEvent;

            var wc = new WNDCLASSEX
            {
                cbSize = (uint)Marshal.SizeOf<WNDCLASSEX>(),
                lpfnWndProc = Marshal.GetFunctionPointerForDelegate(wndProcKeepAlive),
                hInstance = GetModuleHandle(null),
                lpszClassName = ClassName
            };
            if (RegisterClassEx(ref wc) == 0)
            {
                Protocol.Log($"fullscreen class failed: {Marshal.GetLastWin32Error()}");
                return;
            }

            window = CreateWindowEx(0, ClassName, string.Empty, 0, 0, 0, 0, 0, HwndMessage, IntPtr.Zero, wc.hInstance, IntPtr.Zero);
            if (window == IntPtr.Zero)
            {
                Protocol.Log($"fullscreen window failed: {Marshal.GetLastWin32Error()}");
                return;
            }

            SetTimer(window, (UIntPtr)1, PollMs, IntPtr.Zero);
            foregroundHook = SetWinEventHook(
                EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_FOREGROUND, IntPtr.Zero,
                winEventKeepAlive, 0, 0, WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS);
            locationHook = SetWinEventHook(
                EVENT_OBJECT_LOCATIONCHANGE, EVENT_OBJECT_LOCATIONCHANGE, IntPtr.Zero,
                winEventKeepAlive, 0, 0, WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS);
            if (foregroundHook == IntPtr.Zero || locationHook == IntPtr.Zero)
            {
                Protocol.Log("fullscreen hooks failed");
            }

            ready.Set();
            while (GetMessage(out var message, IntPtr.Zero, 0, 0) > 0)
            {
                TranslateMessage(ref message);
                DispatchMessage(ref message);
            }
        }
        catch (Exception ex)
        {
            Protocol.Log($"fullscreen watcher failed: {ex.Message}");
        }
        finally
        {
            if (foregroundHook != IntPtr.Zero) UnhookWinEvent(foregroundHook);
            if (locationHook != IntPtr.Zero) UnhookWinEvent(locationHook);
            foregroundHook = IntPtr.Zero;
            locationHook = IntPtr.Zero;
            if (window != IntPtr.Zero)
            {
                KillTimer(window, (UIntPtr)1);
                DestroyWindow(window);
                window = IntPtr.Zero;
            }
            ready.Set();
        }
    }

    private IntPtr OnMessage(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam)
    {
        switch (message)
        {
            case WM_TIMER:
                Publish(initial: false);
                return IntPtr.Zero;
            case WM_CLOSE:
            case WM_DESTROY:
                PostQuitMessage(0);
                return IntPtr.Zero;
            default:
                return DefWindowProc(hwnd, message, wParam, lParam);
        }
    }

    private void OnWinEvent(IntPtr hook, uint eventType, IntPtr hwnd, int idObject, int idChild, uint thread, uint time)
    {
        if (disposed) return;
        if (eventType == EVENT_OBJECT_LOCATIONCHANGE && (idObject != OBJID_WINDOW || idChild != 0)) return;
        if (hwnd == IntPtr.Zero || hwnd != GetForegroundWindow()) return;
        Publish(initial: false);
    }

    private void Publish(bool initial)
    {
        var snapshot = Snapshot();
        bool changed;
        lock (gate)
        {
            changed = initial || snapshot.Active != lastActive;
            lastActive = snapshot.Active;
        }
        if (!changed) return;

        Protocol.Emit(new JsonObject
        {
            ["evt"] = "fullscreen.changed",
            ["payload"] = new JsonObject { ["active"] = snapshot.Active }
        });
    }

    private static bool IsFullscreen(IntPtr hwnd, in RECT frame)
    {
        if (!IsWindowVisible(hwnd) || IsIconic(hwnd) || IsZoomed(hwnd)) return false;
        if (IsOwnWindow(hwnd) || IsShellWindow(hwnd) || IsCloaked(hwnd)) return false;

        var monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
        if (monitor == IntPtr.Zero) return false;

        var info = new MONITORINFO { cbSize = (uint)Marshal.SizeOf<MONITORINFO>() };
        if (!GetMonitorInfo(monitor, ref info)) return false;

        var area = info.rcMonitor;
        return frame.Left <= area.Left + Tolerance
            && frame.Top <= area.Top + Tolerance
            && frame.Right >= area.Right - Tolerance
            && frame.Bottom >= area.Bottom - Tolerance;
    }

    private static bool TryGetFrame(IntPtr hwnd, out RECT frame)
    {
        if (DwmGetWindowAttributeRect(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, out frame, Marshal.SizeOf<RECT>()) == 0)
        {
            return true;
        }
        return GetWindowRect(hwnd, out frame);
    }

    private static bool IsOwnWindow(IntPtr hwnd)
    {
        GetWindowThreadProcessId(hwnd, out var pid);
        return pid == (uint)Environment.ProcessId;
    }

    private static bool IsShellWindow(IntPtr hwnd)
    {
        var name = new StringBuilder(64);
        if (GetClassName(hwnd, name, name.Capacity) == 0) return false;
        var text = name.ToString();
        foreach (var shell in ShellClasses)
        {
            if (string.Equals(text, shell, StringComparison.Ordinal)) return true;
        }
        return false;
    }

    private static bool IsCloaked(IntPtr hwnd)
    {
        return DwmGetWindowAttributeInt(hwnd, DWMWA_CLOAKED, out var cloaked, sizeof(int)) == 0 && cloaked != 0;
    }

    private delegate void WinEventDelegate(IntPtr hook, uint eventType, IntPtr hwnd, int idObject, int idChild, uint thread, uint time);

    private delegate IntPtr WndProcDelegate(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MONITORINFO
    {
        public uint cbSize;
        public RECT rcMonitor;
        public RECT rcWork;
        public uint dwFlags;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct WNDCLASSEX
    {
        public uint cbSize;
        public uint style;
        public IntPtr lpfnWndProc;
        public int cbClsExtra;
        public int cbWndExtra;
        public IntPtr hInstance;
        public IntPtr hIcon;
        public IntPtr hCursor;
        public IntPtr hbrBackground;
        public string? lpszMenuName;
        public string lpszClassName;
        public IntPtr hIconSm;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MSG
    {
        public IntPtr hwnd;
        public uint message;
        public IntPtr wParam;
        public IntPtr lParam;
        public uint time;
        public POINT pt;
        public uint lPrivate;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT
    {
        public int X;
        public int Y;
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);

    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hwnd);

    [DllImport("user32.dll")]
    private static extern bool IsIconic(IntPtr hwnd);

    [DllImport("user32.dll")]
    private static extern bool IsZoomed(IntPtr hwnd);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetClassName(IntPtr hwnd, StringBuilder name, int maxCount);

    [DllImport("user32.dll")]
    private static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint flags);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern bool GetMonitorInfo(IntPtr monitor, ref MONITORINFO info);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);

    [DllImport("dwmapi.dll", EntryPoint = "DwmGetWindowAttribute")]
    private static extern int DwmGetWindowAttributeRect(IntPtr hwnd, uint attribute, out RECT value, int size);

    [DllImport("dwmapi.dll", EntryPoint = "DwmGetWindowAttribute")]
    private static extern int DwmGetWindowAttributeInt(IntPtr hwnd, uint attribute, out int value, int size);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetWinEventHook(uint eventMin, uint eventMax, IntPtr hookModule, WinEventDelegate callback, uint processId, uint threadId, uint flags);

    [DllImport("user32.dll")]
    private static extern bool UnhookWinEvent(IntPtr hook);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern ushort RegisterClassEx(ref WNDCLASSEX wc);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateWindowEx(uint exStyle, string className, string windowName, uint style, int x, int y, int width, int height, IntPtr parent, IntPtr menu, IntPtr instance, IntPtr param);

    [DllImport("user32.dll")]
    private static extern UIntPtr SetTimer(IntPtr hwnd, UIntPtr id, uint elapsed, IntPtr timerProc);

    [DllImport("user32.dll")]
    private static extern bool KillTimer(IntPtr hwnd, UIntPtr id);

    [DllImport("user32.dll")]
    private static extern bool DestroyWindow(IntPtr hwnd);

    [DllImport("user32.dll")]
    private static extern IntPtr DefWindowProc(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern int GetMessage(out MSG message, IntPtr hwnd, uint min, uint max);

    [DllImport("user32.dll")]
    private static extern bool TranslateMessage(ref MSG message);

    [DllImport("user32.dll")]
    private static extern IntPtr DispatchMessage(ref MSG message);

    [DllImport("user32.dll")]
    private static extern bool PostMessage(IntPtr hwnd, int message, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern void PostQuitMessage(int code);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool PostThreadMessage(uint threadId, int message, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll")]
    private static extern uint GetCurrentThreadId();

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr GetModuleHandle(string? moduleName);

    [DllImport("user32.dll")]
    private static extern bool SetProcessDpiAwarenessContext(IntPtr context);
}
