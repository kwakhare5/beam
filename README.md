# Beam

Beam is an offline Windows 11 floating capsule for media controls, a file shelf, a timer, and a calendar. No cloud, no accounts, no network.

## Get the app

Run the portable Windows exe — no installer, no admin:

```
release\Beam-0.1.0.exe
```

It is built with `npm run dist` (electron-builder, portable target, 137 MB) and carries `app.asar`, the `BeamBridge.exe` helper, and the tray icon in its resources. On a machine where a file scanner locks the freshly unpacked Electron inside the repo, point the output elsewhere: `npx electron-builder --win portable --config.directories.output=%TEMP%\beam-release`.

The exe is unsigned, so Windows SmartScreen shows "Windows protected your PC" on first launch — More info → Run anyway. Nothing is published yet: to ship it, run `gh release create v0.1.0 release\Beam-0.1.0.exe --title "Beam 0.1.0" --notes-file docs\release-notes.md`, then link that release from `site/src/content/site.ts` and deploy. Beam needs Windows 11; Windows 10 is untested.

To run from source instead: `npm install`, `npm run build`, then `npm start`.

## Current state (2026-11-15)

**Working**
- **Shell:** one 136×42 transparent window holding a content-hugged capsule — idle 78×30 with the star and label centered as one unit, files 80–88, music and paused 69–108, timer 122 with an always-visible 28px cancel, done 108 with `Done` and a 28px dismiss, drag 88, error 127, and a 26×26 quiet star after 10s idle (woken when the cursor comes within 37px). Music alone expands on hover or focus, snapping to 126×30 with four 24px controls: previous, play/pause, next, panel. The window is clipped with `setShape` to the pill plus a 6px halo. It uses `showInactive()`, never takes focus on show, drags with pointer capture, persists its position in `%APPDATA%\Beam\settings.json`, and hides on fullscreen. Tray: Settings, Reset Position, Hide, Quit; Quit confirms while the shelf holds files.
- **Files:** drop or Add files, per-row copy, drag-out to Explorer, missing badge, row remove with 5s Undo, armed Clear All, 50-entry in-memory cap.
- **Music:** live SMTC title, art, dot, the expanded hover row, and the Music tab with a real seek slider. Sessions are picked automatically; last-touched switching is proven by check 24.
- **Timer and Calendar:** 5/10/25/custom countdown on the tab and pill with a main-owned deadline, cancel and replace, done face with one chime and one Windows notification (fires while the pill is hidden), month grid with arrows and Today. The deadline and alert path are proven by checks 28–29; calendar locale/midnight cases are still unproven.
- **Glue and access:** a rest click opens the panel to what the pill shows (Music, Timer, Files, otherwise last-used), `Alt+Space` (fallback `Ctrl+Shift+Space`), keyboard pill control plus the hover row's four tab stops, one 2px focus ring, a live region, and Beam's own motion regardless of the OS reduced-motion flag.
- **Landing site:** live at `beamm.vercel.app`, running the real renderer as a browser demo.

**Built, with proof gaps**
- 2.4, 9.1, 9.3, 9.5, 9.6, 1.7, 1.8, 7.1, U1, U2, and timer 4.1–4.5 are proven and ticked by the green runs. 9.2, 9.4, 9.7, 9.8, and 9.9 still have partial or outside-suite proof; calendar midnight drift is now proven by check 25, while locale week start and year boundaries remain unproven.
- 2.5 has the no-art star fallback and a null-session debounce; paused and closed-player edge cases are unproven.

**Not built or incomplete**
- Multi-monitor restore and 100/150% scaling proof.
- Publishing: the portable exe is built and launches, but nothing is published — no GitHub release and no download link on the site.
- Windows 10 is untested; Windows 11 is the supported claim.

## Verification

`.\verify.ps1` has 30 checks. The last full green run is 2026-11-15 (30/30, no skips) against the capsule final: check 16 is a real Explorer→pill drag, check 17 retries the Explorer foreground, check 22 asserts the 126px hover pill with the 108px row of four 24px controls and the panel button, check 24 follows two live players, check 25 proves the panel routing (Files when the shelf has rows, last-used after Clear All), the calendar midnight drift, and the a11y surface, check 26 force-kills the helper, check 27 proves the 8s timeout, check 28 proves timer start/cancel/replace with one chime and banner, check 29 proves completion behind fullscreen, and check 30 proves the Settings controls and a persisted restart. Three assertions added after that run — locale week start, year-boundary navigation, and the Music transport geometry — are not yet in a green gate.

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

`npm run dist` only runs electron-builder, so publish the helper and run `npm run build` first. A portable `release/Beam-0.1.0.exe` (137.4 MB) was built and launched on 2026-11-15. The app uses software rendering to stay under the 130 MB private-byte gate; check 9 measures it every run — last 90.3 MB app, 9.8 MB helper, 0% CPU, 0 sockets.

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
