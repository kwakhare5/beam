# Beam release notes

## Beam 0.1.1 — the installed app (2026-11-16)

Same app as 0.1.0, now delivered like a normal Windows app.

- **One-click installer:** `Beam-Setup-0.1.1.exe` installs per-user with no admin prompt, adds Start Menu and desktop shortcuts, and an entry in Windows Apps → Installed apps for uninstall. Settings in `%APPDATA%\Beam` survive an uninstall unless you delete the folder yourself.
- **First launch opens the panel once**, so a new install shows the whole app instead of just the bar.
- **English-only build** cuts about 50 MB of installed size. Download is about 141 MB; installed about 423 MB. Beam's own code is under 1 MB — the rest is the browser engine and the Windows helper runtime.
- **Website copy:** every Download button downloads, every page shares one header and footer, and the FAQ answers uninstall and size.

Measured on the reference machine (125% scaling, Windows 11): helper 48.2 MB working set, app ~101 MB, 0% CPU idle, 0 TCP sockets. Unsigned, so SmartScreen asks once: More info → Run anyway. Windows 11 only; Windows 10 untested.

---

# Beam 0.1.0 — early preview

A small floating bar for Windows 11 that holds media controls, a file shelf, a timer, and a month calendar. One click opens the panel; everything stays on your machine.

## What's in it

- **One capsule, five states:** idle, files, music, timer, done. It hugs its content and stays out of the way.
- **Music:** sees the player you're already using (Spotify, browsers, anything with Windows media controls). Hover shows prev / play-pause / next / panel. The tab has full art, title, and a real seek bar.
- **Files:** drop files on the bar or add them from the panel. Copy one or all to the clipboard as real files, drag them back out, remove with Undo. Paths only, never copies.
- **Timer:** 5 / 10 / 25 minutes or custom, owned by the app so it finishes even behind a fullscreen game. Chime and a Windows notification.
- **Calendar:** month grid, Today, arrow navigation.
- **Settings:** startup, hotkey rebind (default Alt+Space), chime volume, theme, reset position.

## Offline by design

No account, no server, no TCP ports, no network requests. Settings live in `%APPDATA%\Beam\settings.json`.

## Install

Download `Beam-0.1.0.exe` and run it. It's portable — no installer, nothing written outside your AppData settings.

The exe is unsigned, so Windows SmartScreen shows "Windows protected your PC" on first launch. Choose More info → Run anyway. Signing needs a certificate; this build doesn't have one.

## Known limits

- Windows 11 only. Windows 10 is untested.
- One monitor at 100–150% scaling is proven. Multi-monitor restore and other scales are untested.
- The shelf clears when Beam quits, by design.

## Built and measured

- Verification: 30 checks, last full run green at 30/30 with no skips. It drove real Explorer drags, real clipboard copies and pastes, a real SMTC player, a real fullscreen window, and a real timer. The single-file suite is now retired in favour of the local `.agents/skills/verify-beam/` skill.
- Idle cost on the reference machine: 90.3 MB across the app, 9.8 MB for the helper, 0% CPU, 0 sockets.
- Portable exe: 137.4 MB.

Source: https://github.com/kwakhare5/beam
