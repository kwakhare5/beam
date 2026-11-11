# TASKS.md — Active Implementation Checklist

**Rules:** one task at a time, top unchecked box in the order below. Run the verification. Only tick `[x]` when it exits 0. Log the result in JOURNAL.md.

**Milestone:** a floating pill that reads Spotify, holds files, runs a timer, and passes `.\verify.ps1` with exit code 0.

**Sequence rule (2026-10-29):** every step may only depend on steps above it. 0.4c was replaced by 3.4 — a drag-out needs a shelf that holds files first, and the helper OLE drag spun at 100% CPU without dropping anything, so its code was deleted. Drag-out now goes through Electron's `webContents.startDrag`.

**Done before the order:** 0.1 scaffold, 0.2 budget (90 MB / 0.035% CPU), 0.3 helper ping (6.3 MB), 0.4a live SMTC + PNG art, 0.4b CF_HDROP clipboard. Plus UI work outside the phase order: the app UI system, the canonical preview, the focus/cleanup pass (cards 21–35), the 2026-10-28 cleanup (card 43), the segmented-tab redesign (cards 44–54), the 100/136 capsule pass (cards 55–56), the 2026-10-29 audit fix pass (card 64), the 6% capsule scale to 94×30 / 128×30 in a 136×42 window (card 67), and the 2026-11-11 capsule final — content-hugged rest with a centered star+label and a 126px music hover row (cards 133–134, verify sync pending as V1).

## Audit snapshot — 2026-11-11

The capsule changed after the last green gate (work card 128). Rest is content-hugged with the star + label centered as one unit (idle 78, files 80–88, music 69–108, timer 122, done 108, drag 88, error 127, quiet 26×26); music alone expands on hover/focus to 126×30 with four 24px controls (prev, play/pause, next, panel); the timer/done × is always visible; a rest click opens the panel to what the pill shows. Preview and demo are synced and measured. `.\verify.ps1` has not been run since; check 22 and the capsule static checks still describe the old row and must be reworked first (V1).

## Audit snapshot — 2026-11-10

The boxes reflect the 2026-11-10 code and gate. Read this with the notes on each task.

- **Done and previously proven:** 1.1, 1.2, 1.3, 1.4 (single display), 1.5, 1.6, 0.5, 1.9, 3.1 (historical run), 3.2, 3.3, 3.4, 3.5, 2.1, 2.2, 2.3.
- **Built and still unchecked:** 9.2, 9.4, 9.7, 9.8, and 9.9. 9.1 is retired as superseded. 2.4, 9.3, 9.5, 9.6, and 6.1 are ticked; 1.7, 1.8, and 7.1 are ticked by R6; timer 4.1–4.5 and 9.1 are closed.
- **Partial:** 2.5 has a no-art fallback and null-session debounce; paused/closed-player states are unproven. 9.2's picker, 9.4's quit confirm, and 9.7/9.8/9.9 have outside-suite or partial proof.
- **Not built:** 5.3 midnight drift and a complete packaged build; V1 and R7–R9 remain.
- **Gate history:** before R1, check 16 was red (synthetic CDP drag), 17 depended on Explorer keeping the foreground, 24 needed two live players, and 25 could not cover quiet and chevron in one run. R1 resolved all four; see the result line above.
- **Doc conflict:** resolved 2026-11-07 by R6: 6.2 is retired and ADR-0012 last-used wins in the code.
- **R1 result (2026-11-07):** `.\verify.ps1` exits 0, 25/25, no SKIPs. 2.4, 9.3, 9.5, and 9.6 are ticked. The real drop exposed a pill title DOM-churn bug (fixed); checks 11 and 20 were stale (quit moved to main; the 5s Undo status precedes the warning) and are corrected.
- **R2 result (2026-11-07):** `.\verify.ps1` exits 0, 27/27, no SKIPs (checks 26–27). R3 result (same day): exits 0, 29/29; 4.1–4.5 are ticked by checks 25, 28, and 29. The timer deadline, chime, notification, and hidden completion are no longer missing.
- **Audit cleanup (2026-11-10):** removed dead payload fields and exports, simplified the panel data and settings defaults, fixed the fullscreen-at-launch, tray-Settings, panel-reopen, seek-cancel, and file-action error paths, and corrected the stale docs. `.\verify.ps1` exits 0, 30/30, `SKIP summary: none`, `ALL CHECKS PASSED`; typecheck, app build, helper build, and site build pass.

## R. Codebase repair (approved 2026-11-07)

**Rule:** these run before blocks I and A–H. One item at a time, one commit per item, and the full `.\verify.ps1` once per item before its commit — or every two rounds on a long item (agreed 2026-11-07). Between rounds, run only cheap checks: typecheck, build, or one targeted check. A box is ticked only by a green full run. No feature work inside a health item and no cleanup inside a feature item. Order differs from the grill only where a product fix would otherwise be moved twice: the helper and timer land before the split.

- [x] **R1 Gate hardening** — *Depends on: nothing.*
  - Harden, do not weaken. Check 16 becomes a real Explorer→pill mouse drag using the check-18 harness; check 17 forces and verifies Explorer foreground before Ctrl+V with one retry; check 24 switches two real players with real playback instead of forced picks; check 25 splits into a no-session run (quiet) and a live-session run (chevron). Two failed attempts at the real drop stop the item and ask. Full suite exits 0; tick only what the checks prove.
  - _Proved 2026-11-07:_ `.\verify.ps1` exit 0, 25/25, no SKIPs. Check 16 is a real Explorer→pill drag (3 files, then 51 capped at 50); 17 pasted on the first foreground attempt; 20 proved row remove → 5s Undo status → warning return; 24 followed MSEdge in 107ms and Chrome in 106ms; 25 ran a no-media quiet phase (30x30 quiet + wake) and a live-media chevron phase. The real drop exposed a real bug: the pill replaced its title DOM node on every drag move, turning every `dragover` into a fresh `dragenter`; the title now updates in place.
- [x] **R2 Helper reliability** — *Depends on: R1.*
  - Bridge request timeout, stdout buffer cap, restart max 3 in 60s, spawn-error child reset; helper disposal, `RegisterClassEx` check, and uncaught `Attach` gaps; atomic settings write. Add a forced-kill check and a hung-request check.
  - _Proved 2026-11-07:_ `.\verify.ps1` exit 0, 27/27, no SKIPs. Check 26 force-killed the helper and got pid 32444 → 31076 plus a second pong; check 27 rejected a hung ping after 8010ms. Requests reject at 8s, the stdout buffer caps at 16M chars, restarts cap at 3/60s, settings write via temp + rename, and the helper now checks `RegisterClassEx`, disposes its ready event, and catches `Attach` failures.
- [x] **R3 Timer completion** — *Depends on: R2.*
  - Move the deadline to main; push ticks; exactly-once completion; generate and bundle one chime WAV; Electron `Notification` with tray balloon fallback; prove hidden/fullscreen completion, done face, cancel/replace. Ticks 4.1–4.5 when proven.
  - _Proved 2026-11-07:_ `.\verify.ps1` exit 0, 29/29, no SKIPs. `BeamTimer` owns the deadline and pushes `beam:timer:state` only when the displayed second changes; completion fires once from the cleared ticker. Check 28: the UI started and cancelled a 5-minute timer, then a 1-minute timer replaced a running 5-minute one and finished in 1092ms with the done face, `Dismiss` returning idle, and exactly one chime + one notification line. Check 29: the helper hid the pill for a real fullscreen form, the 4-minute timer finished with `hidden=true`, chime `ok=true` once, notification once, and the pill returned on the done face. Chime is a generated 79KB WAV (`npm run generate:chime`); the renderer acks `play()` over `beam:timer:chimed`; main uses `Notification` (`com.beam.app` AUMID) with `tray.displayBalloon` fallback.
- [x] **R4 Main/renderer/demo refactor** — *Depends on: R3.*
  - Extract main services (window/shape, shelf, panel, music, timer, hotkey) and move the `BEAM_*` harness to `src/main/dev`, excluded from packaged files. Extract renderer core (tab pick, timer, calendar, file actions/undo) and wire `renderer.ts` to it. Demo imports the same core with a browser adapter; delete duplicated behavior. Remove the dead guard, unused `displayId`, uncleared intervals/listeners, and CSS glitches. Re-run verify and `npm --prefix site run build`.
  - _Proved 2026-11-07 (shared gate with R5):_ `.\verify.ps1` exit 0, 29/29, 3 music-active SKIPs, `ALL CHECKS PASSED`. Main is split into `geometry.ts`, `shelf.ts`, `panel.ts`, `music.ts`, `hotkey.ts`, `timer.ts` and `dev/harness.ts` (excluded from packaged files by `electron-builder.yml`); the renderer's tab pick, timer view, calendar shift, and undo slot live in `src/renderer/core/` and the site demo imports the same modules. `displayId` and the dead music guard are gone; `npm run typecheck`, `npm run build`, and `npm --prefix site run build` pass. The run also proved title-addressed session picks (helper `music.pick` by title/index) against a real third Chrome session.
- [x] **R5 Verify harness refactor** — *Depends on: R4.*
  - Extract shared PowerShell helpers for launch/stop/CDP/wait/assert, remove duplicated drag/shutdown blocks, make skips explicit and cleanup `finally`-safe. Keep 27 checks and re-run.
  - _Proved 2026-11-07 (shared gate with R4):_ `.\verify.ps1` exit 0, 29/29, `ALL CHECKS PASSED`. `Wait-BeamLog`, `Start-BeamApp`, `Stop-BeamApp`, `Stop-BeamAll`, `Get-LeftoverHelper`, and `Write-BeamSkip` replace 14 duplicated launch/shutdown/catch blocks (186 insertions, 315 deletions at extraction); the run ends with an explicit `SKIP summary (N)`. Check 12's press is state-aware (7 DIP padding with live music, centre otherwise, one retry), checks 22/23 skip by name when a foreign player is live, and 24 addresses its own sessions by title/index. No assertion was removed.
- [x] **R6 Settings, startup, hotkey rebind** — *Depends on: R5.*
  - Wire 7.1's five rows, tray Settings, startup toggle, hotkey capture plus fallback notice, theme switch. Persist and prove save/restart, registry entry and cleanup, hotkey toggle. Ticks 1.7, 1.8, 7.1; retires 6.2 against ADR-0012.
  - _Proved 2026-11-07:_ `.\verify.ps1` exit 0, 30/30, 5 music-active SKIPs, `ALL CHECKS PASSED`. Check 30 clicks the real controls: the theme switch logs `[settings] test theme {"ok":true,"theme":"light","applied":"light"}`, two + clicks reach 80%, the keycaps capture Ctrl+Alt+B and it opens the panel with real keystrokes, the startup switch writes and removes the HKCU `Run\Beam` value, and a restart loads `theme=light volume=80 shortcut=Ctrl+Alt+B startup=false` with `[hotkey] Ctrl+Alt+B`. Settings rows are live; tray Settings opens the tab. Two bugs found by the check are fixed: the delayed post-show re-anchor overwrote `pillPosition` with the panel rect when it fired after the panel opened (now skipped while the panel is open or dragging), and `rebinding` was not copied into the rendered settings data, so `Press keys…` never showed.
- [x] **U1 Pill scale, near wake, audit fixes** — *Depends on: R6.*
  - Pill: 20px mark/art, music/paused rest 108, quiet 26×26 with an 18px star. Near: main polls the real cursor at 4Hz, wakes quiet within 37px, and returns it 2s after the cursor leaves; near never reveals actions. Audit: light red `#a61b12`, `--primary-text` for the bar fill and thin gold strokes, one 2px focus ring with a 2px offset, 8px control radii, a compact Settings button beside four equal content tabs, sentence-case buttons, DESIGN truth pass. Prove with the full gate.
  - _Proved 2026-11-08:_ `.\verify.ps1` exit 0, 30/30, no skips, `ALL CHECKS PASSED`. Check 25 measured `quiet {"ok":true,"state":"quiet","w":26,"h":26}`, a real cursor move to 32px from the centre woke it (`near {"ok":true,"state":"idle","w":94}`), it returned to quiet 2s after the cursor left (`nearleave ... "ms":2109`), and the hover wake still worked. Typecheck and build pass; preview measured 94 idle, 108 music rest, 128 hover, 26 quiet, four labeled tabs plus the compact Settings button with no overflow.
- [x] **U2 Music panel layout and seeking** — *Depends on: U1.*
  - Right-column player (148px art left; name, artist with the status pip, seek slider, and transports right). Real seek through the helper (`TryChangePlaybackPositionAsync`), drag/click/arrow keys, silent snap-back on refusal. Prove the helper against a real session before UI binding; full gate; docs.
  - _Proved 2026-11-08:_ `.\verify.ps1` exit 0, 30/30, no skips, `ALL CHECKS PASSED`: `PASS music tab ('Beam verify chrome beam-a.wav' art 148x148, slider seek 70% -> bar 420s / player 420s of 600s, bar advancing 3 s in 3s, controls prev/toggle/next, tab play/pause changed and restored, 0 network requests)`. The seek click moves both the rendered bar and the real SMTC player to 70%; the refusal repaint path is wired but no real player refused during the run. The first gate attempt failed check 8 at 174ms with the preview server and headless Chrome open; the clean rerun passed at 149ms with the check unchanged.
- [x] **C1 Full codebase cleanup** — *Depends on: U2.*
  - Remove unused `PILL_HEIGHT`, two unused harness params, the `activateTab` export, and the duplicate `Theme`; move all 20 `BEAM_*` hooks and scheduling into `dev/harness.ts`; extract settings IPC/snapshot from `index.ts`; split `renderer.ts` by concern (settings, music, quiet, drag, files); consolidate the 66 static UI spec checks with a helper while keeping every assertion; restore `site/next-env.d.ts`; docs truth; full gate.
  - _Proved 2026-11-08:_ `.\verify.ps1` exit 0, 30/30, no skips, `ALL CHECKS PASSED`. `index.ts` has no `BEAM_*` reads; `dev/harness.ts` owns `readHooks`, `scheduleReady`, `afterShow`, `onMusicPayload`, and `onFullscreen`. Settings IPC moved to `settings-ipc.ts`. The renderer split into `files.ts`, `music.ts`, `quiet.ts`, and `settings.ts`; the pill's own pointer drag stays in `renderer.ts` because it shares `suppressClick`, hover, and size reporting with the pill, so moving it would add callback plumbing without deleting code. All 71 static UI checks now call `Assert-UI` with every condition and message kept (the first run caught the helper testing the pass condition, not the failure condition; fixed before the green run). Dead code removed: `shelf.list`, three unused type exports, the `middleTruncate` re-export, and four unused imports/params. Typecheck and build pass; `site/next-env.d.ts` is unchanged.
## V. Capsule final verify sync (2026-11-11)

- [ ] **V1 Verify rework and green gate** — *Depends on: C1.*
  - Rework check 22 to the 4×24 hover row (prev, play/pause, next, panel), including the panel button opening the panel and the rest body click; replace every static capsule check that references `.controls`, `.action-slot`, `has-controls`, `panel-open`, `done-label`, the old widths (94/118/128), or the done check; update the `BEAM_MUSIC_CMD_TEST` harness hover probe to the new selectors. Do not weaken or delete a check: the hover-transport assertions stay, aimed at the new row. Then run the full `.\verify.ps1` until exit 0.

- [ ] **R7 Remaining proofs** — *Depends on: C1.*
  - Calendar midnight drift (5.3), locale week start and year boundaries, multi-monitor and 100/150% if hardware allows (otherwise mark blocked, do not tick). Windows 10 stays unproven.
- [ ] **R8 Packaging** — *Depends on: R7.*
  - `npm run dist` builds main, preload, renderer, and helper; outputs to `release` (electron-builder.yml); verify asserts `app.asar`, helper, icon, and a portable launch. No publish until auth and a clean-profile checklist.
- [ ] **R9 Docs and final gate** — *Depends on: R8.*
  - Update ARCHITECTURE/PRD/DESIGN/AGENTS/README to code truth; add superseded banners to stale ADRs; retire timer-priority language; fix site copy claims; final `.\verify.ps1` exit 0 and site build.

## I. UI trust pass (approved 2026-11-04)

These run before the phase tasks, as previous UI passes did. The canonical preview keeps every state; the app only shows what works. 2.4/2.5 proof is part of 9.9.

- [x] **9.1 Honest surfaces** — *Depends on: 2.3.*
  - Hide Timer, Calendar, Settings, and the pill timer/done actions in the app until their engines land. Keep them in `showcase/app-preview.html`. No dead tab or dead control in the app.
  - _Superseded 2026-11-04 by ADR-0012; all five tabs are now live and Settings landed at 7.1._
- [ ] **9.2 Add files picker** — *Depends on: 3.1.*
  - Native `dialog.showOpenDialog` through preload/main; add picked paths to the same shelf; empty state and action row both work. A drop while the panel is open refreshes the Files list.
- [x] **9.3 Panel flow** — *Depends on: 1.3.*
  - Esc resets main's panel state; the panel animates out over 150ms; the 16px margin dismisses; opening picks Files, Music, or the last tab from the pill state. No stuck reopen.
  - _Proved 2026-11-07:_ check 25 asserts files auto-pick, Esc/reopen, last-used, and the margin dismissal.
- [ ] **9.4 Feedback and safety** — *Depends on: 3.3, 3.5.*
  - Visible status for copy/add/remove failures; 5s Undo after a row remove; confirm Quit when the shelf is non-empty; a `Connection lost` pill state when the helper dies; tray Hide.
- [x] **9.5 Quiet idle and chevron** — *Depends on: 1.5, 2.2.*
  - 26×26 star-only quiet after 10s idle; 78×30 on near or hover; 2s return; idle-only. The music hover row carries a 24px panel button beside the three transports.
  - _Proved 2026-11-08 (U1):_ check 25 read 26×26 quiet, woke it from a real cursor at 32px, measured a 2109ms return, and the chevron phase opened the panel with live music.
  - _2026-11-11: the open pill is now 78px at idle, and the chevron is a 24px panel button inside the four-control row; the quiet behavior is unchanged. Check 25's width and chevron assertions move to V1._
- [x] **9.6 Hit area** — *Depends on: 9.5.*
  - Shape the window to the visible pill with a 6px shadow halo so the transparent margins click through. Re-test drag, hover, panel, and the real-mouse checks.
  - _Proved 2026-11-07:_ check 25's `WindowFromPoint` hit test: pill center belongs to Beam, the 16px margin does not; drag, hover, and panel checks stayed green.
- [ ] **9.7 Files and Music layout** — *Depends on: 3.3, 2.3.*
  - Files rows start at the top with actions pinned bottom. More breathing room around the Music progress block.
- [ ] **9.8 Keyboard and accessibility** — *Depends on: 1.6.*
  - Pill role, name, Enter, focus ring, live region; focus restoration on panel close; Settings tab inside the tablist; calendar focus style. Pull 1.8 forward.
  - _Audit 2026-11-07: built and proven outside the suite; Settings is now a compact fifth button (7.1). Checks 25/30 cover the focus path._
- [ ] **9.9 Proof** — *Depends on: 9.1–9.8.*
  - Add runtime checks for the quiet state, chevron, auto-pick, Esc/reopen, margin click-through, Add files, Undo, and quit confirm. Prove 2.4 and 2.5. `.\verify.ps1` exits 0.
  - _Built 2026-11-04:_ check 25 runs a `BEAM_UI_TEST` app and asserts the resting pill (then 94×30; 78×30 after V1), shelf add/undo, files auto-pick, last-used reopen, centered 5-minute timer, calendar nav, Esc, chevron, 26×26 quiet + wake, Clear All, and a real `WindowFromPoint` margin hit test. _2026-11-08: the suite is green and both media states are covered (quiet phase and chevron phase); timer completion, chime, and banner are covered by checks 28–29. Quit confirm and the native Add files dialog remain uncovered._

---

## A. Shell that feels right

- [x] **1.1 Anchor above the taskbar** — *Depends on: nothing.*
  - Read `workArea`, not screen size. The pill sits 12px above its bottom edge, horizontally centered on the primary monitor.
  - _Verify (proved 2026-10-29 at 125%): the settled content rect keeps the pill 12px above the work area and centered, and the native window rect matches; check 6 in `verify.ps1`. Multi-monitor restore and 100/150% scaling are unproven and belong to 1.4 and 8.1.
- [x] **1.2 Never steal focus** — *Depends on: 1.1.*
  - Pill does not take foreground on show. Panel closes without activating another app wrongly.
  - _Verify (proved 2026-10-29): the foreground window handle is unchanged ~1s after launch and Beam's own handle never becomes foreground; this replaced the Notepad typing test, which the Store Notepad could not run from a script.
- [x] **1.6 Tray** — *Depends on: 1.1.*
  - Icon near clock. Menu: Settings, Reset Position, Hide, Quit. Quit exits the process cleanly, helper included; Settings opens the live Settings tab.
  - _Verify (proved 2026-10-29): Quit exits the app and the helper. Check 12 proves Reset Position returns the pill to the anchor; check 30 drives the Settings tab.
- [x] **1.3 Expand and collapse** — *Depends on: 1.6.*
  - 150ms screen-aware expand to the 452×316 window (420×284 panel, 16px shadow margin). Esc, outside click, and tray click all collapse it.
  - _Verify:_ measured animation duration 130–170ms; all three close paths work.
- [x] **1.4 Drag and persist** — *Depends on: 1.3.*
  - Drag anywhere on the pill. Saved to `settings.json`. Restart restores it; if the saved monitor is gone at launch, fall back to the primary anchor. Tray → Reset Position returns to the taskbar anchor.
  - _Verify (proved 2026-10-31): a real mouse drag moves the window and writes `position` to `%APPDATA%\Beam\settings.json`; a relaunch restores the same bounds and native rect; the reset function the tray calls returns it to the primary anchor and clears the saved position. All three run in `verify.ps1` check 11. The tray menu click itself and the monitor-gone fallback are unproven (one display in this session)._
- [x] **1.5 Idle dim** — *Depends on: 1.1.*
  - No music, no timer → idle capsule. The approved design dims the star and label to 70% and keeps the solid shell opaque (the older "pill at 70% opacity" wording is superseded by the solid-shell decision).
  - _Verify (proved 2026-10-31): the running app reports `{state:"idle", markOpacity:"0.7", shellOpacity:"1", label:"Beam", markMaster:true}` from `getComputedStyle`; verify check 7 asserts it. The canonical preview's idle and playing-rest frames differ in 895 of 5712 pixels (15.7%); captures `.scratch/idle-idle.png` and `.scratch/idle-playing.png`. Hover restore is CSS-only and still checked by the UI spec._

## B. Fullscreen seam

- [x] **0.5 Fullscreen detection** — *Depends on: 0.3.*
  - WinEventHook on foreground change plus `EVENT_OBJECT_LOCATIONCHANGE` on the foreground window, rect compared to monitor bounds, with a 1s fallback poll.
  - _Verify (proved 2026-10-31): a real borderless window grown from 600×400 to the 1920×1080 monitor bounds emits `fullscreen.changed {active:true}` in under a second, and shrinking emits `active:false`; the same foreground handle (1966838) held at every stage, so the flip came from the location change, not a focus switch. A maximized console at 1920×1020 stays false (maximized windows are excluded), and `fullscreen.get` replies `{"id":2,"active":false,"rect":...}`. Verify check 14 runs this. A video player was not used — the detector only sees window geometry, and this harness window exercises the same rect-vs-monitor path._
- [x] **1.9 Hide on fullscreen** — *Depends on: 0.5, 1.6.*
  - `fullscreen.changed` hides the window; hotkey or tray brings it back.
  - _Verify (proved 2026-10-31): with the real borderless harness window covering the monitor the app logged `[fullscreen] hidden` and no Electron window had a main handle; 1.5s later the exact function bound to the tray click ran (`BEAM_FULLSCREEN_TEST=1`) and logged `[fullscreen] shown (tray)` with the window visible again; after the harness shrank the pill stayed visible and had hidden exactly once. Verify check 15 runs this on a fresh app instance. The real tray icon click and the hotkey are unproven (hotkey is 1.8); a real video player was not used._

## C. Shelf — the pill holds files

- [x] **3.1 Drop in** — *Depends on: 1.1.*
  - Drag files onto the pill → paths held in memory, count on the pill, 50-entry cap with a clear message. Renderer reads paths with `webUtils.getPathForFile` (Electron 45 removed `File.path`).
  - _Verify (proved 2026-10-31): check 16 dispatches real Chromium drag events with 3 real files; the renderer read each path through `webUtils.getPathForFile`, main logged `[files] add=3 accepted=3 count=3 truncated=false`, and the pill read `3 files`. A second drop of 51 real files logged `add=51 accepted=47 count=50 truncated=true`, the pill read `Max 50`, and 2.6s later `50 files`. The `+N files` drag-over state exists in both the app and the preview but is not asserted by verify._
  - _Audit 2026-11-07: check 16 is now a real Explorer→pill mouse drag and passes; the historical CDP note is superseded._
- [x] **3.3 Copy one / Copy All** — *Depends on: 3.1, 1.3.*
  - Copy button per row (hover or focus, 24px) plus Copy All. Goes through the helper's proven `files.copy`. Built: the panel open event carries the live shelf stat'd in main, both buttons send `{ paths, source }` and main accepts only shelf paths; `Copied` feedback lasts 1.5s/1.8s.
  - _Verify (proved 2026-10-31): verify check 17 drops 3 real files, asserts the Files tab shows `alpha.txt,beta.txt,gamma.txt` at `7 B`, row copy leaves exactly `alpha.txt` on the clipboard, Copy All leaves all 3, and Ctrl+V into a real Explorer folder lands all 3 with matching sizes. `.\verify.ps1` exit 0, 17/17 PASS._
- [x] **3.4 Drag out** — *Depends on: 3.1.*
  - Drag a Files row to Explorer or an email client. Electron's `webContents.startDrag` with the real path; the target decides copy vs move (Ctrl/Shift override). Replaces 0.4c. Scope note (2026-10-31, Karan): the capsule keeps its window-move gesture, so drag-out lives on rows only.
  - _Verify (proved 2026-10-31): verify check 18 drags alpha.txt with the real mouse from its row into a real Explorer folder, which receives the file at 7 bytes; deleting beta.txt marks its row `Missing` and removes its drag attributes; a direct drag call with an off-shelf path is rejected. `.\verify.ps1` exit 0, 18/18 PASS._
- [x] **3.2 Missing-file badge** — *Depends on: 3.1.*
  - Existence rechecked on panel open. Built: a failed stat marks the row red `Missing` (tooltip `File moved or deleted`), drops its copy button and drag, and gives the pill its red danger pip; a healthy reopen removes the pip.
  - _Verify (proved 2026-10-31): verify check 19 drops 3 files (`[missing] start pip=false rows=3`), deletes `beta.txt`, reopens the panel, and asserts `[missing] end badge=Missing title=File moved or deleted copies=0 drags=2 pip=true`. `.\verify.ps1` exit 0, 19/19 PASS._
- [x] **3.5 Clear All** — *Depends on: 3.1, 1.6.*
  - Wipes the shelf. Restarting the app also wipes it. While the shelf holds files, it shows a one-line warning that quitting clears it. Built: row × removes its own path, the armed Clear All empties main's shelf, and an 11px `Files clear on quit` note sits at the left of the actions row only while rows exist. The pill returns to `Beam` and the tab shows the drop well at zero.
  - _Verify (proved 2026-10-31): verify check 20 drops 3 files (`[clear] three rows=3 note=Files clear on quit ... title=3 files`), removes one (`[files] remove=0 count=2`, `rows=2 ... title=2 files`), confirms Clear All twice (`[files] clear=2`, `rows=0 note= well=true state=idle title=Beam`), then relaunches and asserts `[empty] rows=0 well=true state=idle title=Beam`. `.\verify.ps1` exit 0, 20/20 PASS._

## D. Music

- [x] **2.1 Live state on the pill** — *Depends on: 0.4a.*
  - Title and artwork thumbnail. Empty state when nothing plays. Artist stays panel-only: DESIGN's pill has one 62px title slot.
  - _Verify (proved 2026-11-01): check 21 matches the live SMTC title, playing/paused state, dot, and art in 9–29ms; a real Spotify track change moved the pill in 15ms. While a track is active, verify prints SKIP for the idle, drop-count, and clear pill labels and asserts their data elsewhere._
- [x] **2.2 Hover controls** — *Depends on: 2.1.*
  - Play/Pause, Prev, Next, and Panel appear in one row on hover; the pill expands once from its hugged width to 126×30 and never resizes the window.
  - _Verify (proved 2026-11-02, prior row): check 22 hovers the live pill, asserts the transport overlay at opacity 1 with the title at 0, and clicks each button with injected mouse input; play/pause flipped playing true→false, Next moved `Allah Maaf Kare`→`Naah`, and Previous moved it back._
  - _2026-11-11: the row is now four 24px peers including a panel button, and the expansion snaps. Check 22 must be reworked to this row by V1 before the next green run; the feature itself is measured in the preview and demo (JOURNAL 134)._
- [x] **2.3 Music tab** — *Depends on: 1.3, 2.1.*
  - 148px square art, full metadata, real seek slider with elapsed/total, and the same controls. Pointer drag/click, ←/→ 5s, Home/End.
  - _Verify (proved 2026-11-08): check 23 opens the Music tab and asserts 148×148 art from a data URL, title and artist, the seek slider, elapsed/total labels, and all three transports; clicking 70% moved the bar and the real player to 420s of 600s, the bar advanced 3s in 3s, tab play/pause changed and restored playback, and CDP `Network.enable` saw 0 http(s) requests._
- [x] **2.4 Session picking** — *Depends on: 2.1.*
  - Two players at once → last-touched wins; switching apps in the media popup switches Beam.
  - _Verify:_ Spotify + browser tab, toggle foreground, pill follows.
  - _Proved 2026-11-07:_ check 24 followed MSEdge in 107ms and back to Chrome in 106ms with two real sessions and no blank pill. The Windows media flyout itself is not automated; it sets the same OS current session the helper reads.
- [ ] **2.5 Degrade gracefully** — *Depends on: 2.3.*
  - Player with no artwork, paused player, player closed mid-track.
  - _Verify:_ no crash, no blank frame, placeholder shown.
  - _Audit 2026-11-07: the no-art star fallback and null-session debounce exist; paused/closed-player states are unproven._

## E. Timer

- [x] **4.1 Presets and custom** — *Depends on: 1.3.*
  - 5 / 10 / 25 min plus an inline custom minutes field, 1–999.
  - _Verify:_ each preset starts a timer with the right remaining time.
  - _Proved 2026-11-07:_ check 25 starts the 5-minute preset through a real click; check 28 starts the same preset through the panel and reads `0:05` at the test scale.
- [x] **4.2 Live countdown on the pill** — *Depends on: 4.1.*
  - `mm:ss` under 60 min, `h:mm:ss` above. Main owns the deadline and pushes `beam:timer:state`; the renderer only displays it. Never a decrementing counter.
  - _Proved 2026-11-07 (R3): the earlier renderer deadline was replaced by `BeamTimer` in main; it reads the deadline on every 200ms tick, pushes only when the ceiling second changes, and check 29 completes while the window is hidden. Sleep-across-the-machine is still unproven._
- [x] **4.3 Done state** — *Depends on: 4.2.*
  - Chime plays once, Windows banner fires; the pill reads `Done` with a gold border and a 28px dismiss (no digits, no glow, no mascot swap).
  - _Audit 2026-11-07: the done face is built; no chime or `Notification` code exists yet._
  - _Proved 2026-11-07 (R3): checks 28 and 29 assert one `[timer] chime … ok=true` and one `[timer] notify shown=notification` per completion, the done face with no digits, and a single `[timer] done` line. Audibility and the visible toast are asserted by the code path and play() promise, not recorded by verify._
- [x] **4.4 Cancel and replace** — *Depends on: 4.2.*
  - Cancel stops it. Starting a new one replaces the running one.
  - _Audit 2026-11-07: cancel and replace are built; verify coverage is still pending._
  - _Proved 2026-11-07 (R3): check 28 clicks Cancel through the panel and asserts the pill leaves the timer state; it then starts 5 and immediately starts 1 through `window.beam.startTimer`, and only the replacement completes (1092ms, one done line). The UI exposes Cancel, not a second Start, while running._
- [x] **4.5 Fires while hidden** — *Depends on: 4.3, 1.9.*
  - Fullscreen game active when the timer ends.
  - _Audit 2026-11-07: not built; the deadline is renderer-owned and there is no alert path._
  - _Proved 2026-11-07 (R3): check 29 grows a real borderless form to fullscreen, the helper hides the pill, the 4-minute timer finishes with `hidden=true`, one chime and one banner fire, and the pill returns on the done face._

## F. Calendar

- [ ] **5.1 Month grid** — *Depends on: 1.3.*
  - Current month, correct weekday offset, local clock only. First day of the week follows the Windows locale, Sunday as fallback.
  - _Audit 2026-11-07: built; Windows-locale week start and year-boundary cases are not covered by verify._
  - _Verify:_ matches Windows calendar for the current month and week start.
- [ ] **5.2 Today highlighted** — *Depends on: 5.1.*
  - _Verify:_ today's cell has a visibly distinct style.
- [ ] **5.3 Month drift** — *Depends on: 5.1.*
  - Leave the app open past midnight / month end.
  - _Audit 2026-11-07: not built; today refreshes only when the panel renders, so midnight drift is not handled._
  - _Verify:_ date rolls without a restart.
- [ ] **5.4 Month navigation** — *Depends on: 5.1.*
  - Chevrons move one month; Today returns to the current month. Today stays highlighted only in its own month.
  - _Audit 2026-11-07: built; year-boundary navigation is not covered._
  - _Verify:_ arrows cross a year boundary correctly; Today restores after several months.

## G. Glue and settings

- [x] **6.1 Auto-pick on open** — *Depends on: 2.3, 4.2.*
  - Last-used tab first, then music → files → music. The renderer decides from the state it already holds; main sends no tab commands.
  - _Proved 2026-11-07:_ check 25 asserts files auto-pick, last-used reopen, and the live-music chevron phase. ADR-0012 replaced the old timer-priority rule.
- [x] **1.8 Global hotkey** — *Depends on: 1.6.*
  - `Alt+Space` registers; on failure try `Ctrl+Shift+Space` and tell the user. Rebindable in settings.
  - _Built and proved 2026-11-07 (R6):_ default `Alt+Space`, `Ctrl+Shift+Space` fallback logged and shown as the active chord in Settings. A click on the keycaps captures the next chord, rejects chords without a modifier or with no key, registers it, and rolls back to the old chord with `In use` if Windows refuses. Check 30 clicked the keycaps, captured Ctrl+Alt+B, pressed it with real keystrokes, and the restart registered the saved chord.
  - _Verify (proved):_ check 30's `^%b` opened the panel; the saved chord survives restart.
- [x] **1.7 Startup toggle** — *Depends on: 1.4.*
  - One settings flag owns the Windows login entry: HKCU `Software\Microsoft\Windows\CurrentVersion\Run` value `Beam`, written by the Settings switch and removed on toggle-off. The boot reads the registry as truth; the flag is persisted in settings.json. The switch lives in the Settings row and the tray opens that tab; the original first-run ask and tray checkbox are not built.
  - _Proved 2026-11-07 (R6):_ check 30 turned startup on (Run entry present with a quoted command), turned it off (entry gone), and a restart loaded `startup=false`; the prior value is restored after the check and the dev entry is never left behind.
- [x] **7.1 Settings screen** — *Depends on: 1.7, 1.8, 1.6.*
  - Five rows: startup toggle, hotkey rebind, chime volume with −/+ and a test button, Dark theme switch, and Reset position.
  - _Built and proved 2026-11-07 (R6):_ all five rows are live. Check 30 clicks the theme switch, the + stepper twice (60→80), the keycaps, and the startup switch, then restarts and reads the saved values back; check 12 proves Reset returns the pill to 700,768. The chime test button calls the local chime but no check clicks it.

## H. Proof

- [ ] **8.1 `verify.ps1` full suite** — *Depends on: every task above.*
  - Typecheck, build, helper build, launch, anchor, panel, files, music, timer, Settings, helper restart, and UI states. The suite has 30 checks.
  - _Audit 2026-11-10: still missing a paste-after-helper-restart proof, an outbound-TCP assertion, Electron/total/CPU budget checks, calendar midnight drift, and multi-monitor/100–150% scaling._
  - _2026-11-11: the capsule change makes check 22 and the capsule static checks stale until V1; the suite cannot go green before that rework._
  - _Verify:_ `.\verify.ps1` exits 0 and prints each check.
- [ ] **8.2 Packaged build** — *Depends on: 8.1.*
  - Installer or portable exe launches on a clean profile.
  - _Audit 2026-11-07: `npm run dist` only calls electron-builder; `release/win-unpacked` has no `app.asar`, helper, or icon. Nothing is publishable._
  - _Verify:_ installed app passes the manual PRD checklist.

---

## Replaced

- ~~**0.4c Drag out multiple files**~~ — replaced by **3.4**. The helper's OLE `DoDragDrop` could not take the mouse capture from Chromium, spun at 100% CPU, and never dropped; the code was deleted on 2026-10-29.

## Backlog (do not touch this milestone)

- App launcher / switcher
- File search by name or content
- Clipboard history
- Volume / brightness sliders
