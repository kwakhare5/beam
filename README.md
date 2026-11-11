# Beam

Beam is an offline Windows 11 floating capsule for media controls, a file shelf, a timer, and a calendar. No cloud, no accounts, no network.

## Current state (2026-11-11)

**Working**
- **Shell:** one 136×42 transparent window holding a content-hugged capsule — idle 78×30 with the star and label centered as one unit, files 80–88, music and paused 69–108, timer 122 with an always-visible 28px cancel, done 108 with `Done` and a 28px dismiss, drag 88, error 127, and a 26×26 quiet star after 10s idle (woken when the cursor comes within 37px). Music alone expands on hover or focus, snapping to 126×30 with four 24px controls: previous, play/pause, next, panel. The window is clipped with `setShape` to the pill plus a 6px halo. It uses `showInactive()`, never takes focus on show, drags with pointer capture, persists its position in `%APPDATA%\Beam\settings.json`, and hides on fullscreen. Tray: Settings, Reset Position, Hide, Quit; Quit confirms while the shelf holds files.
- **Files:** drop or Add files, per-row copy, drag-out to Explorer, missing badge, row remove with 5s Undo, armed Clear All, 50-entry in-memory cap.
- **Music:** live SMTC title, art, dot, the expanded hover row, and the Music tab with a real seek slider. Sessions are picked automatically; last-touched switching is proven by check 24.
- **Timer and Calendar:** 5/10/25/custom countdown on the tab and pill with a main-owned deadline, cancel and replace, done face with one chime and one Windows notification (fires while the pill is hidden), month grid with arrows and Today. The deadline and alert path are proven by checks 28–29; calendar locale/midnight cases are still unproven.
- **Glue and access:** a rest click opens the panel to what the pill shows (Music, Timer, Files, otherwise last-used), `Alt+Space` (fallback `Ctrl+Shift+Space`), keyboard pill control plus the hover row's four tab stops, one 2px focus ring, a live region, and Beam's own motion regardless of the OS reduced-motion flag.
- **Landing site:** live at `beamm.vercel.app`, running the real renderer as a browser demo.

**Built, with proof gaps**
- 2.4, 9.1, 9.3, 9.5, 9.6, 1.7, 1.8, 7.1, U1, U2, and timer 4.1–4.5 are proven and ticked by the green runs. 9.2, 9.4, 9.7, 9.8, and 9.9 still have partial or outside-suite proof; the calendar engine has no midnight or year-boundary check.
- 2.5 has the no-art star fallback and a null-session debounce; paused and closed-player edge cases are unproven.

**Not built or incomplete**
- Multi-monitor restore and 100/150% scaling proof.
- Packaging: `electron-builder.yml` carries the helper and tray icon via `extraResources`, but `npm run dist` only runs electron-builder; no package has been built and no exe is published.
- Windows 10 is untested; Windows 11 is the supported claim.

## Verification

`.\verify.ps1` has 30 checks. The last full green run is 30/30 with no skips (work card 128): check 16 is a real Explorer→pill drag, check 17 retries the Explorer foreground, check 24 follows two live players, check 25 runs a quiet phase and a live-media phase, check 26 force-kills the helper, check 27 proves the 8s timeout, check 28 proves timer start/cancel/replace with one chime and banner, check 29 proves completion behind fullscreen, and check 30 proves the Settings controls and a persisted restart. The capsule change landed after that run, so check 22 and the capsule static checks still describe the old hover row and must be reworked before the next green run.

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
