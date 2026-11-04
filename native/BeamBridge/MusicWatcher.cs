using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using Windows.Graphics.Imaging;
using Windows.Media.Control;
using Windows.Storage.Streams;

namespace BeamBridge;

internal sealed class MusicWatcher : IDisposable
{
    private static readonly string ArtDir = Path.Combine(Path.GetTempPath(), "Beam", "art");

    private readonly object gate = new();
    private GlobalSystemMediaTransportControlsSessionManager? manager;
    private GlobalSystemMediaTransportControlsSession? session;
    private string lastLine = string.Empty;
    private bool disposed;

    public async Task StartAsync()
    {
        ResetArtFolder();
        manager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
        manager.CurrentSessionChanged += OnManagerChanged;
        manager.SessionsChanged += OnSessionsChanged;
        Attach(Resolve());
        await PublishAsync();
    }

    public async Task<(bool Ok, string? Error)> CommandAsync(string cmd)
    {
        try
        {
            var current = Resolve();
            if (current is null)
            {
                return (false, "no active media session");
            }

            var ok = cmd switch
            {
                "music.toggle" => await current.TryTogglePlayPauseAsync(),
                "music.next" => await current.TrySkipNextAsync(),
                "music.prev" => await current.TrySkipPreviousAsync(),
                _ => false
            };
            return ok ? (true, null) : (false, "the player refused the command");
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
    }

    public async Task<JsonArray> SessionsAsync()
    {
        var list = new JsonArray();
        var mgr = manager;
        if (mgr is null) return list;

        var current = mgr.GetCurrentSession();
        foreach (var candidate in mgr.GetSessions())
        {
            try
            {
                var props = await candidate.TryGetMediaPropertiesAsync();
                list.Add(new JsonObject
                {
                    ["app"] = candidate.SourceAppUserModelId ?? string.Empty,
                    ["title"] = props?.Title ?? string.Empty,
                    ["playing"] = candidate.GetPlaybackInfo()?.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing,
                    ["current"] = current is not null && current.SourceAppUserModelId == candidate.SourceAppUserModelId
                });
            }
            catch (Exception ex)
            {
                Protocol.Log($"session list failed: {ex.Message}");
            }
        }
        return list;
    }

    public async Task<(bool Ok, string? Error)> PickAsync(string app)
    {
        var mgr = manager;
        if (mgr is null) return (false, "no media manager");

        var match = mgr.GetSessions()
            .FirstOrDefault(candidate => string.Equals(candidate.SourceAppUserModelId, app, StringComparison.OrdinalIgnoreCase));
        if (match is null) return (false, "no session for that app");

        try
        {
            var ok = await match.TryTogglePlayPauseAsync();
            return ok ? (true, null) : (false, "the player refused the command");
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
    }

    public void Dispose()
    {
        disposed = true;
        if (manager is not null)
        {
            manager.CurrentSessionChanged -= OnManagerChanged;
            manager.SessionsChanged -= OnSessionsChanged;
            manager = null;
        }
        Detach();
        ResetArtFolder();
    }

    private void OnManagerChanged(GlobalSystemMediaTransportControlsSessionManager sender, CurrentSessionChangedEventArgs args)
    {
        if (disposed) return;
        Attach(Resolve());
        _ = PublishAsync();
    }

    private void OnSessionsChanged(GlobalSystemMediaTransportControlsSessionManager sender, SessionsChangedEventArgs args)
    {
        if (disposed) return;
        Attach(Resolve());
        _ = PublishAsync();
    }

    private void OnSessionChanged(GlobalSystemMediaTransportControlsSession sender, object args)
    {
        if (disposed) return;
        _ = PublishAsync();
    }

    // Windows marks a session current when the user touches its player, and the media flyout
    // switches it the same way. When no session is current the pill would go blank even though
    // another player is still running, so the newest playing session stands in.
    private GlobalSystemMediaTransportControlsSession? Resolve()
    {
        var mgr = manager;
        if (mgr is null) return session;

        var current = mgr.GetCurrentSession();
        if (current is not null) return current;

        return MostRecentPlaying(mgr);
    }

    private static GlobalSystemMediaTransportControlsSession? MostRecentPlaying(GlobalSystemMediaTransportControlsSessionManager mgr)
    {
        GlobalSystemMediaTransportControlsSession? best = null;
        var newest = DateTimeOffset.MinValue;

        foreach (var candidate in mgr.GetSessions())
        {
            try
            {
                if (candidate.GetPlaybackInfo()?.PlaybackStatus != GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing)
                {
                    continue;
                }

                var stamp = candidate.GetTimelineProperties().LastUpdatedTime;
                if (best is null || stamp > newest)
                {
                    best = candidate;
                    newest = stamp;
                }
            }
            catch (Exception ex)
            {
                Protocol.Log($"session probe failed: {ex.Message}");
            }
        }

        return best;
    }

    private void Attach(GlobalSystemMediaTransportControlsSession? next)
    {
        Detach();
        session = next;
        if (session is not null)
        {
            session.MediaPropertiesChanged += OnSessionChanged;
            session.PlaybackInfoChanged += OnSessionChanged;
        }
    }

    private void Detach()
    {
        if (session is null) return;
        try
        {
            session.MediaPropertiesChanged -= OnSessionChanged;
            session.PlaybackInfoChanged -= OnSessionChanged;
        }
        catch (Exception ex)
        {
            Protocol.Log($"unsubscribe failed: {ex.Message}");
        }
        session = null;
    }

    private async Task PublishAsync()
    {
        try
        {
            var current = Resolve();
            JsonObject line;

            if (current is null)
            {
                line = new JsonObject { ["evt"] = "music.changed", ["payload"] = null };
            }
            else
            {
                var props = await current.TryGetMediaPropertiesAsync();
                var playback = current.GetPlaybackInfo();
                GlobalSystemMediaTransportControlsSessionTimelineProperties? timeline = null;
                try
                {
                    timeline = current.GetTimelineProperties();
                }
                catch (Exception ex)
                {
                    Protocol.Log($"timeline unavailable: {ex.Message}");
                }

                string? artPath = null;
                if (props?.Thumbnail is not null)
                {
                    artPath = await SaveArtAsync(
                        props.Thumbnail,
                        Hash(current.SourceAppUserModelId, props.Title, props.Artist));
                }

                line = new JsonObject
                {
                    ["evt"] = "music.changed",
                    ["payload"] = new JsonObject
                    {
                        ["app"] = current.SourceAppUserModelId ?? string.Empty,
                        ["title"] = props?.Title ?? string.Empty,
                        ["artist"] = props?.Artist ?? string.Empty,
                        ["album"] = props?.AlbumTitle ?? string.Empty,
                        ["artPath"] = artPath,
                        ["playing"] = playback?.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing,
                        ["positionMs"] = timeline is null ? 0 : (long)timeline.Position.TotalMilliseconds,
                        ["durationMs"] = timeline is null ? 0 : (long)timeline.EndTime.TotalMilliseconds
                    }
                };
            }

            var json = line.ToJsonString();
            lock (gate)
            {
                if (disposed || json == lastLine) return;
                lastLine = json;
            }
            Protocol.Emit(line);
        }
        catch (Exception ex)
        {
            Protocol.Log($"music read failed: {ex.Message}");
        }
    }

    private static async Task<string?> SaveArtAsync(IRandomAccessStreamReference thumbnail, string hash)
    {
        try
        {
            using var source = await thumbnail.OpenReadAsync();
            using var raw = new InMemoryRandomAccessStream();
            await RandomAccessStream.CopyAsync(source, raw);
            raw.Seek(0);

            var decoder = await BitmapDecoder.CreateAsync(raw);
            using var bitmap = await decoder.GetSoftwareBitmapAsync();

            using var png = new InMemoryRandomAccessStream();
            var encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId, png);
            encoder.SetSoftwareBitmap(bitmap);
            await encoder.FlushAsync();

            png.Seek(0);
            var bytes = new byte[(int)png.Size];
            using (var reader = new DataReader(png.GetInputStreamAt(0)))
            {
                await reader.LoadAsync((uint)png.Size);
                reader.ReadBytes(bytes);
            }

            Directory.CreateDirectory(ArtDir);
            var path = Path.Combine(ArtDir, hash + ".png");
            await File.WriteAllBytesAsync(path, bytes);
            return path;
        }
        catch (Exception ex)
        {
            Protocol.Log($"artwork failed: {ex.Message}");
            return null;
        }
    }

    private static string Hash(params string?[] parts)
    {
        var text = string.Join("|", parts.Select(part => part ?? string.Empty));
        var digest = SHA1.HashData(Encoding.UTF8.GetBytes(text));
        return Convert.ToHexString(digest)[..16].ToLowerInvariant();
    }

    private static void ResetArtFolder()
    {
        try
        {
            if (Directory.Exists(ArtDir)) Directory.Delete(ArtDir, true);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            Protocol.Log($"art wipe failed: {ex.Message}");
        }
    }
}
