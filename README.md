# Beam

Beam is an offline Windows 11 floating capsule for media controls, a file shelf, a timer, and a calendar. No cloud, no accounts, no network.

## Current state

- **App:** one 136×42 transparent window holding a 94×30 capsule (a 30×30 quiet star after 20s idle), clipped with `setShape` to the pill plus a 6px halo so margin clicks reach the desktop. It uses `showInactive()` and never takes focus on show. The capsule drags anywhere on its body; the position persists in `%APPDATA%\Beam\settings.json`, survives restarts, and Reset Position returns it to the taskbar anchor.
- **Live:** SMTC music (title, art, green/amber dot, hover Prev / play-pause / Next plus a chevron that opens the panel), the file shelf (drop or Add files, per-row copy, drag-out to Explorer, missing badge, 5s Undo, Clear All, quit guard), and the panel's Music and Files tabs at 452×316 (420×284 body) with auto-pick and Esc / margin / tray dismissal. Timer, Calendar, and Settings stay in the canonical preview until they work.
- **Not built:** the timer, the hotkey, a settings screen, the startup toggle, the chime, the helper restart policy, the trust-pass verify checks (9.9), and packaging (`electron-builder.yml` ships neither the helper exe nor the tray icon). Next task is 9.8; see `TASKS.md`.

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
