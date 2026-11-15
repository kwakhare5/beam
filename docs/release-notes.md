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

- Headless verification suite: 30 checks, last full run green at 30/30 with no skips. It drives real Explorer drags, real clipboard copies and pastes, a real SMTC player, a real fullscreen window, and a real timer.
- Idle cost on the reference machine: 90.3 MB across the app, 9.8 MB for the helper, 0% CPU, 0 sockets.
- Portable exe: 137.4 MB.

Source: https://github.com/kwakhare5/beam
