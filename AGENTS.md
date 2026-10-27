# AGENTS.md — Beam
# MANDATORY: You must ALWAYS read and follow the global master rules at C:\Users\kwakh\.agents\AGENTS.md before doing anything.
# NOTE FOR AI: Treat this file as AGENTS.md + RULES.md combined. It defines project-specific facts and invariants.

## 1. What this is
Beam is an offline Windows 11 floating pill that gives 1-click media controls, a file drop shelf, a countdown timer, and a month calendar. No cloud, no accounts, no network.

**Current (2026-10-27):** the app runs a 184×44 window with the idle capsule only; the panel exists in `showcase/app-preview.html`. Next is task 0.3.

## 2. Stack
- Electron + TypeScript + Vite, exact-pinned. Renderer sandboxed, contextIsolation on, nodeIntegration off. The renderer is vanilla TypeScript with shadcn-style tokens and Lucide; no React or Tailwind.
- `native/BeamBridge/` — windowless C# .NET 10 helper (planned), self-contained single-file publish. Owns SMTC, clipboard, drag-out, fullscreen detection.
- No database, no server, no TCP ports. Main ⇄ helper is stdio JSON lines only.
- Settings live in `%APPDATA%\Beam\settings.json`.

## 3. Project Commands & Self-Verification
- Install: `npm install`
- Build: `npm run build`
- Run: `npm start`
- Helper build: `dotnet publish native/BeamBridge -r win-x64 --self-contained`
- Typecheck: `npm run typecheck` (two tsconfigs)
- Verification runner: `.\verify.ps1` (created at 0.1; run via `powershell.exe` from Git Bash)
- Done check = `.\verify.ps1` exits 0 with pasted raw terminal output.

## 4. Hard Rules & Invariants (What the AI must ALWAYS do)
- One task at a time from `TASKS.md`, top unchecked box. Do not skip the Phase 0 order.
- 0.2 is done and passed (81.8 MB steady / 84 MB peak / 0.011% CPU). The UI exists; the next task is 0.3 (helper hello).
- Keep the renderer untrusted. Everything touching Win32 goes through the helper.
- Read `ARCHITECTURE.md` before touching the window, IPC, or helper seams.
- Follow `DESIGN.md` tokens exactly. No invented colors, radii, or shadows.
- Review app UI in `showcase/app-preview.html` only. Every phase adds its states to that same file. Never create a second preview file, a new mock, or a per-session HTML file — extend the canonical one. Open it with `npm run ui`; it imports the shared UI from `src/renderer/ui/`, so it must be served, not opened from disk.
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
- `src/main/`: app lifecycle, window geometry, tray, hotkey, settings, helper client.
- `src/preload/`: the only bridge exposed to the renderer.
- `src/renderer/`: `ui/` components (one capsule, one panel shell, per-tab bodies), `styles/` split CSS entry, all visuals.
- `src/shared/` (planned): IPC channel names, payload types, helper protocol types.
- `native/BeamBridge/`: C# helper. No UI.
- `assets/mascot/`: locked Puffy Chubby Star SVG suite.
- `showcase/`: brand lab, never shipped.

## 8. Gotchas & Known Traps
- `Alt+Space` is registered as the hotkey and steals the system window menu while Beam runs. Accepted by the user; fall back to `Ctrl+Shift+Space` if registration fails.
- Global hotkey and tray depend on the window never taking foreground on show.
- Timer counts from a deadline timestamp, never by decrementing. Sleep must not break it.
- Shelf is wiped on quit by design, and must warn while non-empty.
- `Alt+Space` and fullscreen hide both need the helper alive; restart logic is max 3 times in 60s.
- Electron RAM is the top project risk; latest idle measurement is 81.8 MB steady / 84 MB peak / 0.011% CPU at 184×44. The helper cap is still unmeasured.

## 9. Do Not Touch
- `assets/mascot/` — finalized brand assets.
- Closed decisions in `ARCHITECTURE.md` section 7. Reopen only with explicit user approval.
- `showcase/` — reference only.

Global master rules: read C:\Users\kwakh\.agents\AGENTS.md
