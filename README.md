# Beam

Beam is an offline Windows 11 floating capsule for media controls, a file shelf, a timer, and a calendar. No cloud, no accounts, no network.

## Current state

- **App:** one 136×42 transparent window holding a 94×30 idle capsule, a tray icon, and a panel that opens to 452×316 (420×284 body) with a ~150ms transform. It uses `showInactive()` and never takes focus. The capsule drags anywhere on its body; the position persists in `%APPDATA%\Beam\settings.json`, survives restarts, and Reset Position returns it to the taskbar anchor.
- **Built:** the shared UI system (7 capsule states, 5 panels) in `showcase/app-preview.html`, the panel shell with five tabs rendering placeholder data, window drag with saved position and a real-mouse check in `verify.ps1`, and the `BeamBridge` helper — `ping`, the live media session with artwork PNG, and the `CF_HDROP` clipboard at ~11 MB private idle.
- **Not built:** the shelf, the live music/timer/calendar wiring, hover actions, hotkey, settings screen, startup toggle, fullscreen hide, and the chime. Next task is 0.5; see `TASKS.md`.

## Commands

```powershell
npm install
npm run build
dotnet publish native/BeamBridge/BeamBridge.csproj -c Release -o native/BeamBridge/dist
npm start
npm run typecheck
.\verify.ps1
npm run measure
```

The app uses software rendering (`disableHardwareAcceleration`) to stay under the 130 MB private-byte gate. Measured 2026-10-29 at 136×42 with the panel and tray installed: 99 MB private across 5 processes and 0.2% CPU idle. BUDGET PASSED.

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

`AGENTS.md` holds the project rules; the global rules live at `C:\Users\kwakh\.agents\AGENTS.md`.
