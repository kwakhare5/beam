# AGENTS.md - Beam

Global rules: read C:\Users\kwakh\.agents\AGENTS.md first. This file adds project-specific rules. It can make global limits stricter, never looser. Do not repeat global rules here.

## 1. What this is
- One-line promise: Beam is an offline Windows 11 floating pill that opens 1-click to media controls, a file drop shelf, a countdown timer, and a month calendar. No cloud, no accounts, no network.
- Capsule (2026-11-11 final): Every state hugs its content with equal 8px padding and the star + label centered as one unit; idle 78×30, files 80–88, music/paused 69–108, timer 122 with always-visible 28px cancel, done 108 with Done + ×, drag 88, error 127, quiet 26×26. Music snaps to 126×30 on hover/focus with four 24px controls (prev, play/pause, next, panel); art/title fade. Quiet shrinks after 10s idle; cursor within 37px wakes it, quiets 2s after leaving. Fullscreen hides pill; tray restores it.
- Panel: 452×316 (420×284 body) opens with ~150ms grow, closes on Esc, outside click, tray click, or 16px margin. Five tabs: Music (148px art, player with seek slider), Files (drop/picker, stat rows, copy, drag-out, remove/Undo, Clear All), Timer (presets/custom, main-owned deadline, chime + notification), Calendar (month nav, Today), and Settings (theme, chime volume, startup, hotkey rebind, reset). Search mode replaces the tabs with a focused field and one ranked list.
- Helper: `native/BeamBridge/` is a windowless C# .NET 10 self-contained single-file helper behind stdio JSON lines; owns SMTC, clipboard CF_HDROP, fullscreen detection, and the in-memory app/file search index.
- Site: `site/` is the public Next static export at beamm.vercel.app with the `v0.1.1` installer download live on GitHub; the release carries `SHA256SUMS.txt` (sha256 `b35d680fdc85a389202f31322668ad7e8ded62b947771e1765e356d6f9d4b27f`) and the FAQ, README, and release notes explain how to verify it. Deploys are automatic: a push to `main` deploys through the reconnected Vercel Git link (proven 2026-11-18, commit status pending → success); if a push does not deploy, run `vercel --prod --yes` from the repo root.
- What is out of scope: Cloud sync, user accounts, networking, TCP ports, Windows 10 multi-monitor unproven scaling.

## 2. Stack and commands
- Stack: Electron + TypeScript + Vite (exact-pinned). Renderer is sandboxed vanilla TypeScript with shadcn-style tokens and Lucide (no React, no Tailwind). `native/BeamBridge/` windowless C# .NET 10 helper (single-file self-contained). Next.js static export for `site/`.
- Install: `npm install`
- Dev server: `npm start`
- Test: Verification skill journeys in `.agents/skills/verify-beam/`
- Build: `npm run build` (tsc emits main and shared, then Vite bundles preload alone, then builds renderer)
- Helper build: `dotnet publish native/BeamBridge/BeamBridge.csproj -c Release -o native/BeamBridge/dist`
- Lint / typecheck: `npm run typecheck` (two tsconfigs)
- Database / seed: None. Settings in `%APPDATA%\Beam\settings.json`. Shelf is paths-only in memory.
- Environment variable names: None (offline). `BEAM_*` test harness flags owned in `src/main/dev/harness.ts`.

## 3. Project rules
- Data contract: Main ⇄ helper is stdio JSON lines only. `src/shared/ipc.ts` owns the 31 IPC channels and payload types.
- Invariants and gotchas:
  - Keep renderer untrusted: Context isolation on, nodeIntegration off. Everything touching Win32 goes through the helper.
  - Alt+Space default hotkey steals system window menu while Beam runs; fallback to Ctrl+Shift+Space on error.
  - Global hotkey and tray depend on window never taking foreground on show.
  - Timer counts from deadline timestamp, never by decrementing. Sleep must not break it.
  - Shelf wiped on quit by design; must warn while non-empty.
  - Fullscreen hide needs helper alive. Helper restarts max 3 times in 60s, rejects after 8s, caps stdout at 16M chars.
  - Track active or foreign session changes idle pill & quiet checks; artwork travels as base64 in `music.changed`.
  - Search is names and folder paths only; never read file contents or call Windows Search. `Alt+Space` is the only path into search mode.
  - Window clipped to pill + 6px halo with `setShape`. Window bounds settled outer: 136×45 at 125% with 136×44 content rect. Move with `setBounds`, never `setPosition`.
  - Saved position is outer top-left; restore only if intersecting current display, else anchor primary display.
  - RAM budget: helper ≤60 MB, app ≤130 MB, CPU <5%, zero TCP sockets.
- Strict types: Strict TypeScript, two tsconfigs, no `any` or loose casts.
- Never commit secrets, passwords or API keys (Beam is 100% offline).
- Never open a TCP port or make a network request from the app.
- Never let helper print anything except protocol lines to stdout (logs to stderr).
- Never duplicate files on disk for the shelf (paths only in memory).

## 4. UI rules (only for projects with a UI)
- Design source of truth: Follow `DESIGN.md` tokens exactly. No invented colors, radii, or shadows.
- UI style skills: `svg-logo-designer` and `illustration-style` loaded only for mascot or vector work.
- Review app UI in `showcase/app-preview.html` only (`npm run ui`). Every phase adds states there; never create separate mocks. Preview and app change together in the same task at the same measured sizes.
- Handle loading, empty and error states for every async call.

## 5. Surfaces and verification
- Screen map: Floating pill (capsule) + expandable 5-tab panel (Music, Files, Timer, Calendar, Settings) + hotkey search mode.
- Verification skill path: `.agents/skills/verify-beam/` (drives the live app via CDP).
- Done check: `npm run typecheck` + `npm run build` pass and the affected feature journey in `.agents/skills/verify-beam/` passes with pasted evidence.

## 6. Project-specific stops
- The phase checklist (Plan -> Scout -> Build -> Review -> Fix -> Verify -> Close) lives in TASKS.md, not here.
- Never make network requests. Never ship anything from `showcase/`. Never start a task whose dependencies in `TASKS.md` are not done.

## 7. Folder map
- `src/main/`: Lifecycle/wiring (`index.ts`), window geometry (`geometry.ts`), tray (`tray.ts`), helper bridge (`bridge.ts`), settings (`settings.ts`), IPC handlers, startup registry (`startup.ts`), service modules (`shelf.ts`, `panel.ts`, `music.ts`, `hotkey.ts`, `timer.ts`), `dev/harness.ts`.
- `src/preload/`: Secure bridge exposed to renderer.
- `src/renderer/`: UI renderer (`renderer.ts`, `panel-view.ts`, `timer-view.ts`, `files.ts`, `music.ts`, `search.ts`, `quiet.ts`, `settings.ts`, `core/`, `ui/`, `styles/`).
- `src/shared/`: Shared types and IPC definitions (`ipc.ts`).
- `native/BeamBridge/`: C# .NET 10 helper.
- `assets/mascot/`: Locked brand mascot file (`beam-mascot.svg`).
- `.agents/skills/verify-beam/`: Local verification skill and CDP helper.
- `showcase/`: Canonical app preview (`app-preview.html`).

## 8. Open decisions
- Queue R7: Hardware-blocked testing (multi-monitor, 100/150% scaling, Windows 10); the display journey was attempted 2026-11-17 and aborted because Windows reported one display.

## 9. Do not touch
- `assets/mascot/` — Finalized brand assets.
- Closed architecture decisions in `ARCHITECTURE.md` section 7.
- `showcase/` — Reference preview only, never packaged into installer.

## 10. Doc map
- `PRD.md`: Product specifications.
- `ARCHITECTURE.md`: Seam architecture and helper protocols.
- `DESIGN.md`: Design tokens and UI specifications.
- `TASKS.md`: Task plan and block dependencies.
- `JOURNAL.md`: Work log and measured performance evidence.
- `GLOSSARY.md`: Project terminology.
- `docs/release-notes.md`: Public release notes.
