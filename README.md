# Beam

Beam is an offline Windows 11 floating capsule for media controls, a file shelf, a timer, and a calendar. No cloud, no accounts, no network.

## Current state (2026-11-07)

**Working**
- **Shell:** one 136×42 transparent window holding a 94×30 capsule (30×30 quiet star after 20s idle), clipped with `setShape` to the pill plus a 6px halo. It uses `showInactive()`, never takes focus on show, drags with pointer capture, persists its position in `%APPDATA%\Beam\settings.json`, and hides on fullscreen. Tray: Hide, Reset Position, Quit; Quit confirms while the shelf holds files.
- **Files:** drop or Add files, per-row copy, drag-out to Explorer, missing badge, row remove with 5s Undo, armed Clear All, 50-entry in-memory cap.
- **Music:** live SMTC title, art, dot, hover Prev / play-pause / Next, chevron, and the Music tab with a read-only position bar. Sessions are picked automatically; last-touched switching is built but not proven.
- **Timer and Calendar:** 5/10/25/custom countdown on the tab and pill with a main-owned deadline, cancel and replace, done face with one chime and one Windows notification (fires while the pill is hidden), month grid with arrows and Today. The deadline and alert path are proven by checks 28–29; calendar locale/midnight cases are still unproven.
- **Glue and access:** last-used tab on open, `Alt+Space` (fallback `Ctrl+Shift+Space`), keyboard pill control, focus ring, live region, reduced-motion support.
- **Landing site:** live at `beamm.vercel.app`, running the real renderer as a browser demo.

**Built, with proof gaps**
- 2.4, 9.3, 9.5, 9.6, and timer 4.1–4.5 are proven and ticked by the 2026-11-07 green runs. 9.1, 9.2, 9.4, 9.7, 9.8, and 9.9 still have partial or outside-suite proof; the calendar engine and hotkey are built but their full checks are pending.
- 2.5 has the no-art star fallback and a null-session debounce; paused and closed-player edge cases are unproven.

**Not built or incomplete**
- Settings screen (7.1), startup toggle (1.7), hotkey rebinding, and the light/dark switch.
- Multi-monitor restore and 100/150% scaling proof.
- Packaging: `electron-builder.yml` carries the helper and tray icon via `extraResources`, but `npm run dist` only runs electron-builder; no package has been built and no exe is published.
- Windows 10 is untested; Windows 11 is the supported claim.

## Verification

`.\verify.ps1` has 29 checks. The 2026-11-07 run exits 0 with 29/29 and no skips: check 16 is a real Explorer→pill drag, check 17 retries the Explorer foreground, check 24 follows two live players, check 25 runs separate quiet and chevron phases, check 26 force-kills the helper and proves a new pid plus a second pong, check 27 proves a hung request times out after 8s, check 28 proves timer start/cancel/replace with one chime, one banner, and the done face, and check 29 proves completion behind a real fullscreen window. Work card 114 in `JOURNAL.md` records the pre-fix audit; card 116 records the first green run; card 117 records the helper-reliability pass; card 118 records timer completion.

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

Packaging still needs the helper publish and app build before `npm run dist`. The app uses software rendering to stay under the 130 MB private-byte gate; measured 2026-10-29 at 136×42 with the panel and tray installed: 99 MB private across 5 processes and 0.2% CPU idle.

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
