# AGENTS.md — Beam
# MANDATORY: You must ALWAYS read and follow the global master rules at C:\Users\kwakh\.agents\AGENTS.md before doing anything.
# NOTE FOR AI: Treat this file as AGENTS.md + RULES.md combined. It defines project-specific facts and invariants.

## 1. What this is
Beam is an offline Windows 11 floating pill that opens 1-click to media controls, a file drop shelf, a countdown timer, and a month calendar. No cloud, no accounts, no network. It runs one 136×42 window and owns a live `BeamBridge.exe` child over stdio JSON lines. Settings live in `%APPDATA%\Beam\settings.json`; the shelf is paths-only in memory.

**Capsule (2026-11-11 final):** every state hugs its content with equal 8px padding and the star + label centered as one unit; idle 78×30, files 80–88, music/paused 69–108, timer 122 with an always-visible 28px cancel, done 108 with `Done` plus the same ×, drag 88, error 127, quiet 26×26. Music alone snaps to 126×30 on hover/focus with four 24px controls (prev, play/pause, next, panel); the art and title fade, the row overlays, nothing else grows. A rest click opens the panel to what the pill shows: Timer while it runs or is done, Music while a session exists, Files when the shelf has rows, otherwise the last-used tab. Long titles marquee after 1.4s and pause on hover. Quiet shrinks after 10s idle; a cursor within 37px wakes it and it quiets 2s after leaving. Fullscreen hides the pill; the tray restores it.

**Panel:** 452×316 (420×284 body) opens with a ~150ms grow and closes on Esc, outside click, tray click, or the 16px margin. Five tabs: Music (148px art, right-column player with a real seek slider), Files (drop/picker, stat rows, copy, drag-out, remove/Undo, Clear All), Timer (presets/custom, main-owned deadline, chime + notification), Calendar (month nav, Today), and Settings (theme, chime volume, startup, hotkey rebind, reset) as a compact icon button beside four equal content tabs. The panel re-renders from main-owned state; last-used is the idle fallback.

**Main/services:** `src/main/index.ts` (lifecycle/wiring), `geometry.ts` (window/panel math), `tray.ts`, `bridge.ts`, `settings.ts`, `settings-ipc.ts`, `startup.ts`, `shelf.ts`, `panel.ts`, `music.ts`, `hotkey.ts`, `timer.ts`; `dev/harness.ts` owns every `BEAM_*` probe and is excluded from packaging. The renderer is sandboxed vanilla TypeScript with shared UI modules; `src/renderer/core/` is shared with the site demo. `src/shared/ipc.ts` owns the 29 channel names and payload types.

**Helper:** `native/BeamBridge/` is a windowless C# .NET 10 self-contained single-file helper behind stdio JSON lines; it owns SMTC, clipboard CF_HDROP, and fullscreen detection, and never prints non-protocol lines to stdout. Main restarts it after an unexpected exit (3 times per 60s), rejects a request without a reply after 8s, and caps stdout at 16M chars.

**Site:** `site/` is the public Next static export at beamm.vercel.app; the hero iframes the real renderer demo built from `src/renderer/ui` and `src/renderer/styles.css`. No release is published; the site says the Windows build is not published and sends people to the live demo and source. Windows 11 only (10 unproven).

**Current work (2026-11-11):** the capsule final, the site demo first-click fix, V1's verify/harness rework, the docs cleanup, and the read-only audit are in the working tree, not committed. The verify gate has not completed 30/30 since the capsule final, and verification is paused on request. The open queue lives in `TASKS.md` (V1, 9.x, 2.5, 5.x, 8.x, R7–R9, release); evidence cards 132–139 live in `JOURNAL.md`.

## 2. Stack
- Electron + TypeScript + Vite, exact-pinned. Renderer sandboxed, contextIsolation on, nodeIntegration off. The renderer is vanilla TypeScript with shadcn-style tokens and Lucide; no React or Tailwind.
- `native/BeamBridge/` — windowless C# .NET 10 helper, self-contained single-file publish. Owns SMTC, clipboard, and fullscreen detection (all built; fullscreen is proved by verify check 14 with a real borderless window). Drag-out is app-owned and built at 3.4: the renderer's `dragstart` on a Files row goes to main, which calls `webContents.startDrag` with the real paths.
- No database, no server, no TCP ports. Main ⇄ helper is stdio JSON lines only.
- Settings live in `%APPDATA%\Beam\settings.json`.

## 3. Project Commands & Self-Verification
- Install: `npm install`
- Build: `npm run build` (tsc emits main and shared, then Vite bundles the preload alone — a sandboxed preload cannot `require` a relative file — then builds the renderer)
- Run: `npm start`
- Helper build: `dotnet publish native/BeamBridge/BeamBridge.csproj -c Release -o native/BeamBridge/dist` (the csproj already sets win-x64, self-contained, single file)
- Typecheck: `npm run typecheck` (two tsconfigs)
- Verification runner: `.\verify.ps1` (created at 0.1; run via `powershell.exe` from Git Bash)
- Done check = `.\verify.ps1` exits 0 with pasted raw terminal output.

## 4. Hard Rules & Invariants (What the AI must ALWAYS do)
- One task at a time from `TASKS.md`, top unchecked box, in the order of its blocks A–H. Never start a task whose `Depends on` line is not done.
- **Built and gated (2026-11-11):** every Block A/B/C item, all five tabs, Settings, helper reliability, and the capsule final are built. The suite proves real clipboard copy, a real Explorer drop and drag-out, fullscreen hide/restore, timer completion while hidden, session picking, and the Music tab's 148px art, real seek, and 0 network requests. Check 22 hovers the pill and asserts the 126px shell, the 108px row of four 24×24 controls (prev, toggle, next, panel), and that the panel button opens Music. The capsule final is newer than the last 30/30 gate; verification is paused on request, so no task may be ticked on a partial or skipped run.
- Keep the renderer untrusted. Everything touching Win32 goes through the helper.
- Read `ARCHITECTURE.md` before touching the window, IPC, or helper seams.
- Follow `DESIGN.md` tokens exactly. No invented colors, radii, or shadows.
- Review app UI in `showcase/app-preview.html` only. Every phase adds its states to that same file. Never create a second preview file, a new mock, or a per-session HTML file — extend the canonical one. Open it with `npm run ui`; it imports the shared UI from `src/renderer/ui/`, so it must be served, not opened from disk.
- The preview and the app always change together in the same task, at the same measured sizes. A UI change that lands in one and not the other is a bug, not a follow-up.
- Append a 4-line work card (Problem / Change / Proof / Still broken) to `JOURNAL.md` for every task.

## 5. What the AI must NEVER do
- Never open a TCP port or make a network request from the app.
- Never store secrets, tokens, or API keys (there are none; Beam is offline).
- Never let the helper print anything except protocol lines to stdout (logs go to stderr).
- Never weaken or delete a verification check to get a green run.
- Never duplicate files on disk for the shelf. Paths only, in memory.
- Never ship anything from `showcase/`.

## 6. Design Source of Truth
- UI style skills: `svg-logo-designer` and `illustration-style`, loaded only for mascot or vector work.
- Design tokens & vibe: follow `DESIGN.md`.

## 7. Folder Map
- `src/main/`: lifecycle and wiring (`index.ts`), window/panel geometry (`geometry.ts`), tray (`tray.ts`), helper client (`bridge.ts`), settings (`settings.ts`), settings IPC (`settings-ipc.ts`), startup registry (`startup.ts`), and one module per service — `shelf.ts`, `panel.ts`, `music.ts`, `hotkey.ts`, `timer.ts`. `dev/harness.ts` owns every `BEAM_*` flag, its scheduling, and every probe, and is excluded from packaged files.
- `src/preload/`: the only bridge exposed to the renderer.
- `src/renderer/`: `renderer.ts` (pill rendering, panel wiring, pointer gestures), `files.ts` (shelf rows, undo, status, drop target), `music.ts` (music view, null hold, tick, seek), `quiet.ts` (quiet timer), `settings.ts` (settings state and rebind); `core/` (tab pick, timer view, calendar shift, undo slot — shared with the site demo), `ui/capsule/` (one capsule), `ui/panel/` (shell + tab nav), `ui/panel/tabs/` (one module per tab), `ui/shared/` (icons, escaping, formatting); `styles/` is one file per component (`capsule.css`, `panel/`, `controls/`, `tabs/`).
- `src/shared/`: `ipc.ts` owns the 29 IPC channel names and the payload types shared by main, preload, and renderer.
- `native/BeamBridge/`: C# helper. No UI.
- `assets/mascot/`: one locked Puffy Chubby Star file, `beam-mascot.svg`.
- `showcase/`: brand lab plus the canonical app preview, never shipped.

## 8. Gotchas & Known Traps
- `Alt+Space` is the default hotkey (1.8, rebindable) and steals the system window menu while Beam runs. Accepted by the user; fall back to `Ctrl+Shift+Space` if registration fails.
- Global hotkey and tray depend on the window never taking foreground on show.
- Timer counts from a deadline timestamp, never by decrementing. Sleep must not break it.
- Shelf is wiped on quit by design, and must warn while non-empty.
- Fullscreen hide needs the helper alive; the hotkey is main-owned. Helper restart logic is max 3 times in 60s.
- With a track active or a foreign session live, verify prints SKIP for idle dim, the clear/restart pill labels, and the quiet phase start; those facts are asserted from `[files]` logs and `capsule.css` instead. Check 22 skips by name when a foreign player is playing because Windows can hand the session over mid-toggle; check 25 does the same when a foreign session blocks the idle pill. A real Chrome tab running the site demo publishes a session, so close it before a strict gate run. Check 22 pauses/plays real tracks and check 23 toggles playback twice from the Music tab, so a run disturbs playback. The artwork travels as base64 inside `music.changed`, so there is no temp art file; no art in the session shows the 48px star face.
- CDP `Input.dispatchDragEvent` is broken with Electron 45: every type arrives as a `dragenter` (measured 9 enters, 0 dragover, 0 drop across three dispatches), so check 16 cannot land a synthetic drop and the UI probe fills the shelf through `window.beam.addFiles`. A real OS drag is the honest replacement. `.pill` is pinned to 30px because Windows hands the window a 44 DIP content height; without the pin it rendered 32.
- The window is clipped to the pill plus a 6px halo with `setShape`, so margin clicks reach the desktop instead of opening the panel; check 25 holds the hit test.
- Move the window with `setBounds` and a pinned width/height. `setPosition` let Windows re-round the transparent window's height on every pointer move (42 grew to 141 during the first 1.4 test). The window's settled outer bounds are 136×45 at 125%, with a 136×44 content rect; keep that size while dragging.
- The saved position is the window's outer top-left. Restore only when that rect still intersects a current display; otherwise anchor on the primary display. Multi-monitor and 100/150% scaling remain unproven.
- Electron RAM is the top project risk. Idle at 136×42 with the panel and tray installed (2026-10-29): 99 MB private summed across 5 processes — main 33.4, renderer 28.1, gpu-process 15.0, utility 11.7, helper 10.8 — and 0.2% CPU, under the 130 MB gate. The helper is also gated separately at 60 MB.

## 9. Do Not Touch
- `assets/mascot/` — finalized brand assets.
- Closed decisions in `ARCHITECTURE.md` section 7. Reopen only with explicit user approval.
- `showcase/` — reference only.

Global master rules: read C:\Users\kwakh\.agents\AGENTS.md
