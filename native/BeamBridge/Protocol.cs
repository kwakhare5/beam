using System.Text.Json.Nodes;

namespace BeamBridge;

internal static class Protocol
{
    private static readonly object Gate = new();

    public static void Emit(JsonObject line)
    {
        lock (Gate)
        {
            try
            {
                Console.Out.WriteLine(line.ToJsonString());
            }
            catch
            {
                // stdout can close during shutdown; stdin EOF ends the process.
            }
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
