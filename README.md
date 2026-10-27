# Beam

Beam is an offline Windows 11 floating capsule for media controls, a file shelf, a timer, and a calendar. No cloud, no accounts, no network.

## Current state

- **App:** one 184×44 transparent window showing the **idle capsule only**. The capsule is 104×32 idle, 128×32 on hover, 176×32 playing/paused, 132 timer/done, 140 missing; the idle is centered. It uses `showInactive()`.
- **Preview-only:** the 420×300 panel, the 428×308 open window, the 150ms grow, all tab bodies, transport buttons, and theme switching. They exist in `showcase/app-preview.html`, not in the app.
- **Not built:** panel wiring, hotkey, tray, settings, helper/`BeamBridge`, SMTC, timer, shelf, fullscreen, IPC, and automated UI tests. Next is task 0.3 (helper hello), then 1.x (pill shell), 4.1 (timer).

## Commands

```powershell
npm install
npm run build
npm start
npm run typecheck
.\verify.ps1
npm run measure
```

The app uses software rendering (`disableHardwareAcceleration`) to stay under the 130 MB private-byte gate. Latest measured run: 81.8 MB steady / 84 MB peak / 0.011% CPU, BUDGET PASSED.

## Preview

```powershell
npm run ui
```

Open the URL Vite prints, then `/showcase/app-preview.html`. The root `/` has no `index.html` and will 404. The preview is the canonical UI: Compare (default), Capsule, Panels, Rules.

## Docs

- `PRD.md` — product scope
- `DESIGN.md` — visual system and §7 app UI spec
- `ARCHITECTURE.md` — parts, seams, decisions
- `TASKS.md` — ordered checklist
- `GLOSSARY.md` — UI vocabulary
- `JOURNAL.md` — work cards and verification evidence
- `docs/adr/` — decision records

`AGENTS.md` holds the project rules; the global rules live at `C:\Users\kwakh\.agents\AGENTS.md`.
