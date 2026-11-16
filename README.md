# Beam

Beam is an offline Windows 11 floating capsule for media controls, a file shelf, a timer, and a calendar. No cloud, no accounts, no network.

## Get the app

Download `Beam-Setup-0.1.1.exe` from the [v0.1.1 release](https://github.com/kwakhare5/beam/releases/tag/v0.1.1) or from [beamm.vercel.app](https://beamm.vercel.app). It is a one-click installer — no admin prompt — that adds Beam to your Start Menu and desktop.

The installer is unsigned, so Windows SmartScreen shows "Windows protected your PC" on first launch — More info → Run anyway. Beam needs Windows 11; Windows 10 is untested.

To build it yourself: `npm install`, `npm run build`, publish the helper, then `npm run dist` (electron-builder, per-user one-click NSIS installer). `Beam-Setup-<version>.exe` lands in `release\` and carries `app.asar`, `BeamBridge.exe`, and the tray icon; installing creates Start Menu and desktop shortcuts and an entry in Windows Apps. On a machine where a file scanner locks the freshly unpacked Electron inside the repo, point the output elsewhere: `npx electron-builder --config.directories.output=%TEMP%\beam-release`.

To run from source instead: `npm install`, `npm run build`, then `npm start`.

## Current state (2026-11-15)

**Working**
- **Shell:** one 136×42 transparent window holding a content-hugged capsule — idle 78×30 with the star and label centered as one unit, files 80–88, music and paused 69–108, timer 122 with an always-visible 28px cancel, done 108 with `Done` and a 28px dismiss, drag 88, error 127, and a 26×26 quiet star after 10s idle (woken when the cursor comes within 37px). Music alone expands on hover or focus, snapping to 126×30 with four 24px controls: previous, play/pause, next, panel. The window is clipped with `setShape` to the pill plus a 6px halo. It uses `showInactive()`, never takes focus on show, drags with pointer capture, persists its position in `%APPDATA%\Beam\settings.json`, and hides on fullscreen. Tray: Settings, Reset Position, Hide, Quit; Quit confirms while the shelf holds files.
- **Files:** drop or Add files, per-row copy, drag-out to Explorer, missing badge, row remove with 5s Undo, armed Clear All, 50-entry in-memory cap.
- **Music:** live SMTC title, art, dot, the expanded hover row, and the Music tab with a real seek slider. Sessions are picked automatically; last-touched switching is proven by check 24.
- **Timer and Calendar:** 5/10/25/custom countdown on the tab and pill with a main-owned deadline, cancel and replace, done face with one chime and one Windows notification (fires while the pill is hidden), month grid with arrows and Today. The deadline and alert path are proven by checks 28–29; calendar locale/midnight cases are still unproven.
- **Glue and access:** a rest click opens the panel to what the pill shows (Music, Timer, Files, otherwise last-used), `Alt+Space` (fallback `Ctrl+Shift+Space`), keyboard pill control plus the hover row's four tab stops, one 2px focus ring, a live region, and Beam's own motion regardless of the OS reduced-motion flag.
- **Landing site:** live at `beamm.vercel.app`, running the real renderer as a browser demo.

**Proof gaps**
- 9.2 Add files picker: built; one manual click still needed to confirm the native dialog opens.
- 9.4 native quit-confirm and the copy/add/remove failure text: built; not yet driven.
- 9.9 follows 9.2 and 9.4.
- R7 multi-monitor restore, 100/150% scaling, and Windows 10: hardware-blocked.
- A memory journey is not yet in the verification skill; the budget and the last measurement are in AGENTS.md.

## Verification

`.agents/skills/verify-beam/` drives the real app through a small CDP helper. Read its `SKILL.md`, run the doctor, and drive only the feature you changed. The last full suite run (2026-11-15) was green at 30/30 with no skips and is recorded in JOURNAL 151; the old single-file runner is retired. The skill's feature map covers the capsule, panel and tabs, Files, Music, Timer, and Settings. OS seams — Explorer drops, clipboard, tray, hotkey, fullscreen, native dialogs — use real Windows input, not CDP.

## Commands

```powershell
npm install
npm run build
dotnet publish native/BeamBridge/BeamBridge.csproj -c Release -o native/BeamBridge/dist
npm start
npm run typecheck
node .agents\skills\verify-beam\helpers\beam.mjs doctor
node .agents\skills\verify-beam\helpers\beam.mjs launch
```

`npm run dist` only runs electron-builder, so publish the helper and run `npm run build` first. `v0.1.0` was built and launched on 2026-11-15. The app uses software rendering to stay under the 130 MB private-byte budget; last measured 90.3 MB app, 9.8 MB helper, 0% CPU, 0 sockets.

## Preview

```powershell
npm run ui
```

Open the URL Vite prints, then `/showcase/app-preview.html`. The root `/` has no `index.html` and will 404. The preview is the canonical UI: Showcase Board (default), Compare, Capsule, Panels, Rules.

## Docs

- `PRD.md` — product scope
- `DESIGN.md` — visual system and §3–6 app UI spec
- `ARCHITECTURE.md` — parts, seams, decisions
- `TASKS.md` — ordered checklist
- `GLOSSARY.md` — UI vocabulary
- `JOURNAL.md` — work cards and verification evidence
- `docs/adr/` — decision records
- `.agents/skills/verify-beam/` — local verification skill and feature map

`AGENTS.md` holds the project rules; the global rules live at `C:\Users\kwakh\.agents\AGENTS.md`.
