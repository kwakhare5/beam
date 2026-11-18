using System.Text.Json.Nodes;
using Windows.ApplicationModel;
using Windows.Management.Deployment;

namespace BeamBridge;

internal sealed class SearchIndex
{
    private readonly object gate = new();
    private List<Entry> entries = new();
    private bool indexing;

    private sealed record Entry(string Name, string Detail, string Launch, bool IsApp);

    private static readonly (string Label, Environment.SpecialFolder Folder)[] UserFolders =
    {
        ("Desktop", Environment.SpecialFolder.DesktopDirectory),
        ("Documents", Environment.SpecialFolder.MyDocuments),
        ("Pictures", Environment.SpecialFolder.MyPictures),
        ("Videos", Environment.SpecialFolder.MyVideos),
        ("Music", Environment.SpecialFolder.MyMusic)
    };

    private static readonly EnumerationOptions WalkOptions = new()
    {
        RecurseSubdirectories = true,
        IgnoreInaccessible = true,
        AttributesToSkip = FileAttributes.Hidden | FileAttributes.System | FileAttributes.ReparsePoint,
        ReturnSpecialDirectories = false
    };

    public void Start()
    {
        _ = RebuildAsync();
    }

    public Task RebuildAsync()
    {
        lock (gate) indexing = true;
        return Task.Run(() =>
        {
            var next = new List<Entry>();
            CollectApps(next);
            CollectFiles(next);
            next.Sort((a, b) => string.Compare(a.Name, b.Name, StringComparison.OrdinalIgnoreCase));
            lock (gate)
            {
                entries = next;
                indexing = false;
            }
        });
    }

    public JsonObject Query(JsonNode? id, string? raw)
    {
        var query = (raw ?? string.Empty).Trim();
        List<Entry> snapshot;
        bool building;
        lock (gate)
        {
            snapshot = entries;
            building = indexing;
        }

        var results = new JsonArray();
        if (query.Length > 0)
        {
            var scored = new List<(int Rank, Entry Entry)>();
            foreach (var entry in snapshot)
            {
                var rank = Rank(entry, query);
                if (rank >= 0) scored.Add((rank, entry));
            }
            scored.Sort((a, b) =>
            {
                if (a.Rank != b.Rank) return a.Rank.CompareTo(b.Rank);
                if (a.Entry.IsApp != b.Entry.IsApp) return a.Entry.IsApp ? -1 : 1;
                var byLength = a.Entry.Name.Length.CompareTo(b.Entry.Name.Length);
                if (byLength != 0) return byLength;
                return string.Compare(a.Entry.Name, b.Entry.Name, StringComparison.OrdinalIgnoreCase);
            });
            foreach (var item in scored)
            {
                results.Add(new JsonObject
                {
                    ["kind"] = item.Entry.IsApp ? "app" : KindOf(item.Entry.Launch),
                    ["name"] = item.Entry.Name,
                    ["detail"] = item.Entry.Detail,
                    ["launch"] = item.Entry.Launch
                });
                if (results.Count == 8) break;
            }
        }

        return new JsonObject
        {
            ["id"] = id,
            ["results"] = results,
            ["indexing"] = building,
            ["count"] = snapshot.Count
        };
    }

    private static int Rank(Entry entry, string query)
    {
        var name = entry.Name.ToLowerInvariant();
        var q = query.ToLowerInvariant();
        if (name == q) return 0;
        if (name.StartsWith(q, StringComparison.Ordinal)) return 1;
        foreach (var word in name.Split(new[] { ' ', '-', '_', '.', '(', ')', '[', ']' }, StringSplitOptions.RemoveEmptyEntries))
        {
            if (word.StartsWith(q, StringComparison.Ordinal)) return 2;
        }
        if (name.Contains(q, StringComparison.Ordinal)) return 3;
        if (entry.Detail.ToLowerInvariant().Contains(q, StringComparison.Ordinal)) return 4;
        return -1;
    }

    private static string KindOf(string launch)
    {
        try
        {
            return Directory.Exists(launch) ? "folder" : "file";
        }
        catch
        {
            return "file";
        }
    }

    private static void CollectApps(List<Entry> into)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        try
        {
            var manager = new PackageManager();
            foreach (var package in manager.FindPackagesForUser(string.Empty))
            {
                try
                {
                    if (package.IsFramework || package.IsResourcePackage) continue;
                    var apps = package.GetAppListEntriesAsync().GetAwaiter().GetResult();
                    foreach (var app in apps)
                    {
                        var name = app.DisplayInfo.DisplayName;
                        var aumid = app.AppUserModelId;
                        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(aumid)) continue;
                        if (!seen.Add(name)) continue;
                        into.Add(new Entry(name, "App", aumid, true));
                    }
                }
                catch (Exception ex)
                {
                    Protocol.Log($"app list failed: {ex.Message}");
                }
            }
        }
        catch (Exception ex)
        {
            Protocol.Log($"package manager unavailable: {ex.Message}");
        }

        foreach (var root in new[]
                 {
                     Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs"),
                     Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonStartMenu), "Programs")
                 })
        {
            try
            {
                if (!Directory.Exists(root)) continue;
                foreach (var file in Directory.EnumerateFiles(root, "*.lnk", WalkOptions))
                {
                    var name = Path.GetFileNameWithoutExtension(file);
                    if (string.IsNullOrWhiteSpace(name)) continue;
                    if (!seen.Add(name)) continue;
                    into.Add(new Entry(name, "App", file, true));
                }
            }
            catch (Exception ex)
            {
                Protocol.Log($"start menu scan failed: {ex.Message}");
            }
        }
    }

    private static void CollectFiles(List<Entry> into)
    {
        var roots = new List<string>();
        foreach (var (_, folder) in UserFolders)
        {
            var path = Environment.GetFolderPath(folder);
            if (!string.IsNullOrEmpty(path)) roots.Add(path);
        }
        roots.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads"));

        foreach (var root in roots.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            try
            {
                if (!Directory.Exists(root)) continue;
                foreach (var path in Directory.EnumerateFileSystemEntries(root, "*", WalkOptions))
                {
                    var name = Path.GetFileName(path);
                    if (string.IsNullOrWhiteSpace(name)) continue;
                    var detail = Path.GetDirectoryName(path) ?? string.Empty;
                    into.Add(new Entry(name, detail, path, false));
                }
            }
            catch (Exception ex)
            {
                Protocol.Log($"folder scan failed: {ex.Message}");
            }
        }
    }
}
