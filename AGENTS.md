# AGENTS.md — Beam
# MANDATORY: You must ALWAYS read and follow the global master rules at C:\Users\kwakh\.agents\AGENTS.md before doing anything.
# NOTE FOR AI: Treat this file as AGENTS.md + RULES.md combined. It defines project-specific facts and invariants.

## 1. What this is
Beam is an offline Windows 11 floating pill that gives 1-click media controls, a file drop shelf, a countdown timer, and a month calendar. No cloud, no accounts, no network.

**Current (2026-10-31):** the app runs one 136×42 window holding a 94×30 capsule (24px star at 70% opacity when idle) and owns a live `BeamBridge.exe` child over stdio JSON lines. The helper reports the system's current media session (`music.changed`: app, title, artist, album, playing, position, duration), writes the artwork as a PNG to `%TEMP%\Beam\art\`, puts real file paths on the clipboard as `CF_HDROP`, and watches the foreground window for fullscreen (`fullscreen.changed { active }`, plus a `fullscreen.get` probe); main logs the music so far, hides the pill while a fullscreen window owns the monitor, and the tray click shows it again. Files dropped on the pill are read with `webUtils.getPathForFile`, held as paths in main memory (deduped, 50 cap), and the pill reads `N files` (or `Max 50` after an overflowing drop). Opening the panel pushes each shelf path's stat row (name, size, folder/file, missing) to the renderer, so the Files tab renders the real list; Copy All and each row's copy button call `beam:files:copy`, main accepts only shelf paths, and the helper writes them as `CF_HDROP`. Music, timer, and done will rest at 94 and grow to 128 on hover inside the same window, while idle and files stay 94. Built: 1.1 anchor, 1.2 no focus, 1.6 tray, 1.3 panel, 1.4 drag, 1.5 idle dim, 0.5 fullscreen detection, 1.9 hide on fullscreen, 3.1 drop shelf, 3.3 copy. The panel opens at 452×316 (420×284 body) with a ~150ms transform, grows up from the bottom, and closes on Esc, outside click, and tray click; the Files tab is live and the other four tabs still render placeholder data. The capsule drags with pointer capture, clamps inside the display work area, saves its position to `%APPDATA%\Beam\settings.json`, restores it at launch when that monitor still exists, and tray Reset Position clears it and re-anchors above the primary taskbar. The idle star (0.7) and shell (1) are asserted from `getComputedStyle` in verify. All seven capsule states and five panels exist in `showcase/app-preview.html`. Next is 3.4, then 3.2 and 3.5.

## 2. Stack
- Electron + TypeScript + Vite, exact-pinned. Renderer sandboxed, contextIsolation on, nodeIntegration off. The renderer is vanilla TypeScript with shadcn-style tokens and Lucide; no React or Tailwind.
- `native/BeamBridge/` — windowless C# .NET 10 helper, self-contained single-file publish. Owns SMTC, clipboard, and fullscreen detection (all built; fullscreen is proved by verify check 14 with a real borderless window). Drag-out is app-owned (task 3.4, not built): the renderer's `dragstart` gesture goes to main, which calls `webContents.startDrag`.
- No database, no server, no TCP ports. Main ⇄ helper is stdio JSON lines only.
- Settings live in `%APPDATA%\Beam\settings.json`.

## 3. Project Commands & Self-Verification
- Install: `npm install`
- Build: `npm run build`
- Run: `npm start`
- Helper build: `dotnet publish native/BeamBridge/BeamBridge.csproj -c Release -o native/BeamBridge/dist` (the csproj already sets win-x64, self-contained, single file)
- Typecheck: `npm run typecheck` (two tsconfigs)
- Verification runner: `.\verify.ps1` (created at 0.1; run via `powershell.exe` from Git Bash)
- Done check = `.\verify.ps1` exits 0 with pasted raw terminal output.

## 4. Hard Rules & Invariants (What the AI must ALWAYS do)
- One task at a time from `TASKS.md`, top unchecked box, in the order of its blocks A–H. Never start a task whose `Depends on` line is not done.
- 0.4b is done: `files.copy` puts 3 real paths on the clipboard as `CF_HDROP`, survives helper exit, and verify checks it. 0.4a reads the live SMTC session; 0.3 answers ping. 0.4c is replaced by 3.4 (Electron drag). 1.4 is done (drag, saved position, restart restore, Reset Position, real-mouse verify), 1.5 is done (idle star 0.7 from computed style), 0.5 is done (helper fullscreen hooks + poll, `fullscreen.changed`/`fullscreen.get`, verify check 14), 1.9 is done (main hides the pill on fullscreen, tray click restores; verify check 15), 3.1 is done (drops add real paths to an in-memory shelf, 50 cap with a `Max 50` notice, pill count; verify check 16), and 3.3 is done (live Files rows on panel open, row copy and Copy All through `beam:files:copy`, `Copied` feedback, Explorer paste; verify check 17). The next task is 3.4, then 3.2 and 3.5.
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
- `src/main/`: lifecycle, window geometry (`index.ts`), tray (`tray.ts`), helper client (`bridge.ts`). Hotkey and settings persistence are planned.
- `src/preload/`: the only bridge exposed to the renderer.
- `src/renderer/`: `ui/capsule/` (one capsule), `ui/panel/` (shell + tab nav), `ui/panel/tabs/` (one module per tab), `ui/shared/` (icons, escaping, formatting); `styles/` is one file per component (`capsule.css`, `panel/`, `controls/`, `tabs/`).
- `src/shared/` (planned): IPC channel names, payload types, helper protocol types.
- `native/BeamBridge/`: C# helper. No UI.
- `assets/mascot/`: one locked Puffy Chubby Star file, `beam-mascot.svg`.
- `showcase/`: brand lab plus the canonical app preview, never shipped.

## 8. Gotchas & Known Traps
- `Alt+Space` is the planned hotkey (task 1.8) and will steal the system window menu while Beam runs. Accepted by the user; fall back to `Ctrl+Shift+Space` if registration fails.
- Global hotkey and tray depend on the window never taking foreground on show.
- Timer counts from a deadline timestamp, never by decrementing. Sleep must not break it.
- Shelf is wiped on quit by design, and must warn while non-empty.
- Fullscreen hide needs the helper alive; the hotkey is main-owned. Helper restart logic is max 3 times in 60s.
- Every state rests at 94 inside the 136 window, so 21px of transparent margin on each side receives clicks (hover states leave 4px). This is still unfixed: a click in that margin opens the panel instead of reaching the window underneath. No task owns it yet.
- Move the window with `setBounds` and a pinned width/height. `setPosition` let Windows re-round the transparent window's height on every pointer move (42 grew to 141 during the first 1.4 test). The window's settled outer bounds are 136×45 at 125%, with a 136×44 content rect; keep that size while dragging.
- The saved position is the window's outer top-left plus `displayId`. Restore only when that rect still intersects a current display; otherwise anchor on the primary display. Multi-monitor and 100/150% scaling remain unproven.
- Electron RAM is the top project risk. Idle at 136×42 with the panel and tray installed (2026-10-29): 99 MB private summed across 5 processes — main 33.4, renderer 28.1, gpu-process 15.0, utility 11.7, helper 10.8 — and 0.2% CPU, under the 130 MB gate. The helper is also gated separately at 60 MB.

## 9. Do Not Touch
- `assets/mascot/` — finalized brand assets.
- Closed decisions in `ARCHITECTURE.md` section 7. Reopen only with explicit user approval.
- `showcase/` — reference only.

Global master rules: read C:\Users\kwakh\.agents\AGENTS.md
