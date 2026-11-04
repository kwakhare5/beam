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

        FullscreenWatcher.EnableDpiAwareness();
        var sessionsTest = Environment.GetEnvironmentVariable("BEAM_MUSIC_SESSIONS_TEST") == "1";

        var watcher = new MusicWatcher();
        try
        {
            watcher.StartAsync().GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            Protocol.Log($"smtc unavailable: {ex.Message}");
        }

        var fullscreen = new FullscreenWatcher();
        try
        {
            fullscreen.Start();
        }
        catch (Exception ex)
        {
            Protocol.Log($"fullscreen unavailable: {ex.Message}");
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
                    case "files.copy":
                        CopyFiles(request);
                        break;
                    case "music.toggle":
                    case "music.next":
                    case "music.prev":
                        CommandMusic(request, cmd, watcher);
                        break;
                    case "music.sessions" when sessionsTest:
                        ReplySessions(request, watcher);
                        break;
                    case "music.pick" when sessionsTest:
                        PickMusic(request, watcher);
                        break;
                    case "fullscreen.get":
                        ReplyFullscreen(request, fullscreen);
                        break;
                    default:
                        Protocol.Log($"dropped unknown cmd {cmd}");
                        break;
                }
            }
        }
        finally
        {
            fullscreen.Dispose();
            watcher.Dispose();
        }

        return 0;
    }

    private static void CopyFiles(JsonObject request)
    {
        var id = request["id"]?.DeepClone();
        var paths = ReadPaths(request);
        if (paths is null)
        {
            Protocol.Emit(new JsonObject
            {
                ["id"] = id,
                ["ok"] = false,
                ["error"] = "paths must be a non-empty string array"
            });
            return;
        }

        if (FileClipboard.Copy(paths, out var error))
        {
            Protocol.Emit(new JsonObject { ["id"] = id, ["ok"] = true });
        }
        else
        {
            Protocol.Emit(new JsonObject { ["id"] = id, ["ok"] = false, ["error"] = error });
        }
    }

    private static void CommandMusic(JsonObject request, string cmd, MusicWatcher watcher)
    {
        var id = request["id"]?.DeepClone();
        var (ok, error) = watcher.CommandAsync(cmd).GetAwaiter().GetResult();
        if (!ok)
        {
            Protocol.Log($"{cmd} failed: {error}");
        }
        var reply = new JsonObject { ["id"] = id, ["ok"] = ok };
        if (!ok && error is not null)
        {
            reply["error"] = error;
        }
        Protocol.Emit(reply);
    }

    private static void ReplyFullscreen(JsonObject request, FullscreenWatcher fullscreen)
    {
        var (active, rect) = fullscreen.Snapshot();
        Protocol.Emit(new JsonObject
        {
            ["id"] = request["id"]?.DeepClone(),
            ["active"] = active,
            ["rect"] = rect is { } r
                ? new JsonObject
                {
                    ["left"] = r.Left,
                    ["top"] = r.Top,
                    ["right"] = r.Right,
                    ["bottom"] = r.Bottom
                }
                : null
        });
    }

    private static void ReplySessions(JsonObject request, MusicWatcher watcher)
    {
        var sessions = watcher.SessionsAsync().GetAwaiter().GetResult();
        Protocol.Emit(new JsonObject
        {
            ["id"] = request["id"]?.DeepClone(),
            ["sessions"] = sessions
        });
    }

    private static void PickMusic(JsonObject request, MusicWatcher watcher)
    {
        var id = request["id"]?.DeepClone();
        if (request["app"] is not JsonValue value || !value.TryGetValue<string>(out var app) || string.IsNullOrWhiteSpace(app))
        {
            Protocol.Emit(new JsonObject
            {
                ["id"] = id,
                ["ok"] = false,
                ["error"] = "app must be a non-empty string"
            });
            return;
        }

        var (ok, error) = watcher.PickAsync(app).GetAwaiter().GetResult();
        if (!ok)
        {
            Protocol.Log($"music.pick failed: {error}");
        }
        var reply = new JsonObject { ["id"] = id, ["ok"] = ok };
        if (!ok && error is not null)
        {
            reply["error"] = error;
        }
        Protocol.Emit(reply);
    }

    private static List<string>? ReadPaths(JsonObject request)
    {
        if (request["paths"] is not JsonArray array || array.Count == 0)
        {
            return null;
        }

        var paths = new List<string>(array.Count);
        foreach (var item in array)
        {
            if (item is not JsonValue value ||
                !value.TryGetValue<string>(out var path) ||
                string.IsNullOrWhiteSpace(path) ||
                path.Contains('\0'))
            {
                return null;
            }
            paths.Add(path);
        }
        return paths;
    }
}
