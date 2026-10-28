using System.Text.Json.Nodes;

namespace BeamBridge;

internal static class Protocol
{
    private static readonly object Gate = new();

    public static void Emit(JsonObject line)
    {
        lock (Gate)
        {
            Console.Out.WriteLine(line.ToJsonString());
        }
    }

    public static void Log(string message)
    {
        lock (Gate)
        {
            Console.Error.WriteLine($"[beam] {message}");
        }
    }
}
