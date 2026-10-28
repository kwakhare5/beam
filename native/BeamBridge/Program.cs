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
                Log("dropped malformed line");
                continue;
            }

            if (request is null)
            {
                Log("dropped non-object line");
                continue;
            }

            if (request["cmd"] is not JsonValue cmdValue || !cmdValue.TryGetValue<string>(out var cmd))
            {
                Log("dropped request without cmd");
                continue;
            }

            switch (cmd)
            {
                case "ping":
                    Respond(request["id"]?.DeepClone());
                    break;
                default:
                    Log($"dropped unknown cmd {cmd}");
                    break;
            }
        }

        return 0;
    }

    private static void Respond(JsonNode? id)
    {
        var reply = new JsonObject
        {
            ["id"] = id,
            ["pong"] = true,
            ["version"] = Version
        };
        Console.Out.WriteLine(reply.ToJsonString());
    }

    private static void Log(string message)
    {
        Console.Error.WriteLine($"[beam] {message}");
    }
}
