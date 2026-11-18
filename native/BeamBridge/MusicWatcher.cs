using System.Text.Json.Nodes;
using Windows.Graphics.Imaging;
using Windows.Media.Control;
using Windows.Storage.Streams;

namespace BeamBridge;

internal sealed class MusicWatcher : IDisposable
{
    private readonly object gate = new();
    private readonly SemaphoreSlim publishGate = new(1, 1);
    private GlobalSystemMediaTransportControlsSessionManager? manager;
    private GlobalSystemMediaTransportControlsSession? session;
    private string lastLine = string.Empty;
    private bool disposed;

    // Windows publishes any tab audio as a media session, so a YouTube video would otherwise
    // own the bar. Browsers and PWAs publish different AUMIDs, so match by keyword. A browser
    // session counts as music only when it reports both artist and album; video tabs leave the
    // album empty (proved 2026-11-18: Spotify Web had an album, a YouTube video did not).
    private static readonly string[] BrowserApps =
    {
        "chrome", "chromium", "msedge", "edge", "firefox", "brave", "opera", "vivaldi"
    };

    private static readonly string[] AlwaysBlockedApps = { "instagram", "tiktok", "youtube", "facebook" };

    private static bool MatchesAny(string? app, string[] terms)
    {
        if (string.IsNullOrEmpty(app)) return false;
        var id = app.ToLowerInvariant();
        foreach (var term in terms)
        {
            if (id.Contains(term, StringComparison.Ordinal)) return true;
        }
        return false;
    }

    private static async Task<bool> IsIgnoredAsync(GlobalSystemMediaTransportControlsSession candidate)
    {
        var app = candidate.SourceAppUserModelId;
        if (MatchesAny(app, AlwaysBlockedApps)) return true;
        if (!MatchesAny(app, BrowserApps)) return false;

        try
        {
            var props = await candidate.TryGetMediaPropertiesAsync();
            return string.IsNullOrWhiteSpace(props?.Artist) || string.IsNullOrWhiteSpace(props?.AlbumTitle);
        }
        catch (Exception ex)
        {
            Protocol.Log($"session metadata check failed: {ex.Message}");
            return true;
        }
    }

    public async Task StartAsync()
    {
        manager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
        manager.CurrentSessionChanged += OnManagerChanged;
        manager.SessionsChanged += OnSessionsChanged;
        Attach(await ResolveAsync());
        await PublishAsync();
    }

    public async Task<(bool Ok, string? Error)> CommandAsync(string cmd)
    {
        try
        {
            var current = await ResolveAsync();
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

    public async Task<(bool Ok, string? Error)> SeekAsync(long positionMs)
    {
        try
        {
            var current = await ResolveAsync();
            if (current is null)
            {
                return (false, "no active media session");
            }

            var timeline = current.GetTimelineProperties();
            var start = (long)timeline.StartTime.TotalMilliseconds;
            var end = (long)timeline.EndTime.TotalMilliseconds;
            var target = Math.Clamp(positionMs, Math.Max(0, start), Math.Max(start, end));
            var ok = await current.TryChangePlaybackPositionAsync(TimeSpan.FromMilliseconds(target).Ticks);
            return ok ? (true, null) : (false, "the player refused the seek");
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
        var index = 0;
        foreach (var candidate in mgr.GetSessions())
        {
            try
            {
                var props = await candidate.TryGetMediaPropertiesAsync();
                var playback = candidate.GetPlaybackInfo();
                list.Add(new JsonObject
                {
                    ["index"] = index,
                    ["app"] = candidate.SourceAppUserModelId ?? string.Empty,
                    ["title"] = props?.Title ?? string.Empty,
                    ["artist"] = props?.Artist ?? string.Empty,
                    ["album"] = props?.AlbumTitle ?? string.Empty,
                    ["type"] = playback?.PlaybackType?.ToString() ?? string.Empty,
                    ["playing"] = playback?.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing,
                    ["current"] = current is not null && current.SourceAppUserModelId == candidate.SourceAppUserModelId,
                    ["blocked"] = await IsIgnoredAsync(candidate)
                });
            }
            catch (Exception ex)
            {
                Protocol.Log($"session list failed: {ex.Message}");
            }
            index++;
        }
        return list;
    }

    public async Task<(bool Ok, string? Error)> PickAsync(string app, string? title, int? index)
    {
        var mgr = manager;
        if (mgr is null) return (false, "no media manager");

        var sessions = mgr.GetSessions();
        GlobalSystemMediaTransportControlsSession? match = null;
        if (!string.IsNullOrWhiteSpace(title))
        {
            foreach (var candidate in sessions)
            {
                try
                {
                    var props = await candidate.TryGetMediaPropertiesAsync();
                    if (string.Equals(props?.Title, title, StringComparison.Ordinal))
                    {
                        match = candidate;
                        break;
                    }
                }
                catch (Exception ex)
                {
                    Protocol.Log($"session title check failed: {ex.Message}");
                }
            }
        }
        else if (index is not null)
        {
            if (index < 0 || index >= sessions.Count) return (false, "index out of range");
            match = sessions[index.Value];
        }
        else
        {
            match = sessions.FirstOrDefault(candidate => string.Equals(candidate.SourceAppUserModelId, app, StringComparison.OrdinalIgnoreCase));
        }
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
    }

    private void OnManagerChanged(GlobalSystemMediaTransportControlsSessionManager sender, CurrentSessionChangedEventArgs args)
    {
        if (disposed) return;
        _ = ReattachAsync();
        _ = PublishAsync();
    }

    private void OnSessionsChanged(GlobalSystemMediaTransportControlsSessionManager sender, SessionsChangedEventArgs args)
    {
        if (disposed) return;
        _ = ReattachAsync();
        _ = PublishAsync();
    }

    private async Task ReattachAsync()
    {
        try
        {
            Attach(await ResolveAsync());
        }
        catch (Exception ex)
        {
            Protocol.Log($"session attach failed: {ex.Message}");
        }
    }

    private void OnSessionChanged(GlobalSystemMediaTransportControlsSession sender, object args)
    {
        if (disposed) return;
        _ = PublishAsync();
    }

    // Windows marks a session current when the user touches its player, and the media flyout
    // switches it the same way. When no session is current the pill would go blank even though
    // another player is still running, so the newest playing session stands in. An ignored
    // current session falls through the same way instead of owning the bar.
    private async Task<GlobalSystemMediaTransportControlsSession?> ResolveAsync()
    {
        var mgr = manager;
        if (mgr is null) return session;

        var current = mgr.GetCurrentSession();
        if (current is not null && !await IsIgnoredAsync(current)) return current;

        return await MostRecentPlayingAsync(mgr);
    }

    private static async Task<GlobalSystemMediaTransportControlsSession?> MostRecentPlayingAsync(
        GlobalSystemMediaTransportControlsSessionManager mgr)
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

                if (await IsIgnoredAsync(candidate))
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
        await publishGate.WaitAsync();
        try
        {
            var current = await ResolveAsync();
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

                string? art = null;
                if (props?.Thumbnail is not null)
                {
                    art = await ReadArtAsync(props.Thumbnail);
                }

                line = new JsonObject
                {
                    ["evt"] = "music.changed",
                    ["payload"] = new JsonObject
                    {
                        ["app"] = current.SourceAppUserModelId ?? string.Empty,
                        ["title"] = props?.Title ?? string.Empty,
                        ["artist"] = props?.Artist ?? string.Empty,
                        ["art"] = art,
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
        finally
        {
            publishGate.Release();
        }
    }

    private static async Task<string?> ReadArtAsync(IRandomAccessStreamReference thumbnail)
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

            return Convert.ToBase64String(bytes);
        }
        catch (Exception ex)
        {
            Protocol.Log($"artwork failed: {ex.Message}");
            return null;
        }
    }
}
