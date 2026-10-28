using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace BeamBridge;

internal static class Program
{
    private const string Version = "0.1.0";

    private static int Main()
    {
        Console.SetIn(new StreamReader(Console.OpenStandardInput(), new UTF8Encoding(false)));
        Console.SetOut(new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false)) { AutoFlush = true });
        Console.SetError(new StreamWriter(Console.OpenStandardError(), new UTF8Encoding(false)) { AutoFlush = true });

        var watcher = new MusicWatcher();
        try
        {
            watcher.StartAsync().GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            Protocol.Log($"smtc unavailable: {ex.Message}");
        }

        try
        {
            while (Console.In.ReadLine() is { } line)
            {
                if (string.IsNullOrWhiteSpace(line))
                {
                    continue;
                }

                JsonObject? request;
                try
                {
                    request = JsonNode.Parse(line) as JsonObject;
                }
                catch (JsonException)
                {
                    Protocol.Log("dropped malformed line");
                    continue;
                }

                if (request is null)
                {
                    Protocol.Log("dropped non-object line");
                    continue;
                }

                if (request["cmd"] is not JsonValue cmdValue || !cmdValue.TryGetValue<string>(out var cmd))
                {
                    Protocol.Log("dropped request without cmd");
                    continue;
                }

                switch (cmd)
                {
                    case "ping":
                        Protocol.Emit(new JsonObject
                        {
                            ["id"] = request["id"]?.DeepClone(),
                            ["pong"] = true,
                            ["version"] = Version
                        });
                        break;
                    default:
                        Protocol.Log($"dropped unknown cmd {cmd}");
                        break;
                }
            }
        }
        finally
        {
            watcher.Dispose();
        }

        return 0;
    }
}
