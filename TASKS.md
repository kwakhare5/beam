# TASKS.md — Active Implementation Checklist

**Rules:** one task at a time. Pick the top unchecked box. Run the verification. Only tick `[x]` when it exits 0. Log the result in JOURNAL.md.

**Milestone:** a floating pill that reads Spotify, holds files, runs a timer, and passes `.\verify.ps1` with exit code 0.

---

## Phase 0 — Prove the scary seams (no UI)

- [ ] **0.1 Scaffold the shell**
  - Electron + TypeScript + Vite. Empty 800×60 frameless transparent window, always on top. Exact-pin versions in `package.json`. Single-instance lock: a second launch wakes the existing pill and exits. Create `verify.ps1` here with only the checks that exist today; each later phase adds its own.
  - _Verify:_ `.\verify.ps1` exits 0; `npm run build` exits 0; `npm start` shows a blank bar; launching twice leaves one process.
- [x] **0.2 Measure the budget** *(gate — stop here if it fails)*
  - Script sums private bytes and samples CPU over 60s on the empty window. Run this before any helper or UI code exists. Measures the Electron processes only; the helper gets its own 60 MB cap at task 0.3.
  - _Verify:_ prints RSS total and avg CPU. Electron under 130 MB and 0.5% → continue. Over 130 MB → stop, report the numbers, and move to the WinUI fallback before writing more code.
- [ ] **0.3 Helper says hello**
  - C# project at `native/BeamBridge/`. Reads one JSON line, answers `{"id":1,"pong":true}`. Prove it as a standalone console app first, then wire it into Electron.
  - _Verify:_ `dotnet publish -r win-x64 --self-contained` exits 0 and produces a single exe; the app console prints `pong`; the helper's private bytes print under 60 MB while idle.
- [ ] **0.4a Read Spotify**
  - Helper reports `music.changed` with title, artist, app, and an art file path. Artwork is written to `%TEMP%\Beam\art\`, overwritten per track, folder wiped on quit. Play something first.
  - _Verify:_ terminal prints the exact track title showing in Spotify; the art path exists while playing and the folder is empty after quit.
- [ ] **0.4b Copy files as files**
  - Helper puts `CF_HDROP` on the clipboard for 3 real paths.
  - _Verify:_ `Get-Clipboard -Format FileDropList` returns exactly 3 paths.
- [ ] **0.4c Drag out multiple files**
  - Helper runs `DoDragDrop` with `FileDrop` for 3 paths.
  - _Verify:_ manual drag into Explorer lands 3 files. If it fights, record it and fall back to copy-only.
- [ ] **0.5 Fullscreen detection**
  - WinEventHook on foreground change plus `EVENT_OBJECT_LOCATIONCHANGE` on the foreground window, rect compared to monitor bounds, with a 1s fallback poll.
  - _Verify:_ entering a fullscreen video logs `active: true`, leaving logs `false`; a video made fullscreen inside an already-focused window also flips it, with no foreground change.

---

## Phase 1 — Pill shell

- [ ] **1.1 Anchor above the taskbar**
  - Read `workArea`, not screen size. Sit 12px above its bottom edge, horizontally centered on the primary monitor. Dragging to another monitor is allowed and persisted; if that monitor is gone at launch, fall back to primary.
  - _Verify:_ taskbar at 40px vs double height → pill stays 12px above it. Drag to second monitor, restart → same spot. Unplug the second monitor → pill returns to primary, on screen. At 100%, 125%, and 150% display scaling the pill keeps its size and stays sharp.
- [ ] **1.2 Never steal focus**
  - Pill does not take foreground on show. Panel closes without activating another app wrongly.
  - _Verify:_ click a text field in Notepad, hover the pill, typing still goes to Notepad.
- [ ] **1.3 Expand and collapse**
  - 150ms slide upward to panel height. Esc, outside click, and tray click all collapse it.
  - _Verify:_ measured animation duration 130–170ms; all three close paths work.
- [ ] **1.4 Drag and persist**
  - Drag anywhere on the pill. Saved to `settings.json`. Restart restores it. Tray → Reset Position returns to taskbar anchor.
  - _Verify:_ drag, restart, position identical. Reset returns to center.
- [ ] **1.5 Idle dim**
  - No music, no timer → pill at 55% opacity, mascot asleep.
  - _Verify:_ screenshot diff between active and idle states is visible; opacity value in computed style.
- [ ] **1.6 Tray**
  - Icon near clock. Menu: Settings, Reset Position, Quit. Quit exits the process cleanly, helper included.
  - _Verify:_ all three items act; `Get-Process Beam` empty after Quit.
- [ ] **1.7 Startup toggle**
  - `setLoginItemSettings` wired to a settings flag.
  - _Verify:_ toggle on → registry Run entry exists; toggle off → gone.
- [ ] **1.8 Global hotkey**
  - `Alt+Space` registers; on failure try `Ctrl+Shift+Space` and tell the user. Rebindable in settings.
  - _Verify:_ hotkey toggles the panel from inside a maximized app.
- [ ] **1.9 Hide on fullscreen**
  - `fullscreen.changed` hides the window; hotkey or tray brings it back.
  - _Verify:_ fullscreen video hides it, hotkey restores it.

---

## Phase 2 — Music

- [ ] **2.1 Live state on the pill**
  - Title, artist, artwork thumbnail. Empty state when nothing plays.
  - _Verify:_ changing track in Spotify updates the pill within 1s.
- [ ] **2.2 Hover controls**
  - Play/Pause, Prev, Next fade in on hover. Fixed window size.
  - _Verify:_ all three buttons change Spotify's real playback state.
- [ ] **2.3 Music tab**
  - Large art, full metadata, same controls. No seek bar (out of scope).
  - _Verify:_ art renders with no network requests in DevTools.
- [ ] **2.4 Session picking**
  - Two players at once → last-touched wins; switching apps in the media popup switches Beam.
  - _Verify:_ Spotify + browser tab, toggle foreground, pill follows.
- [ ] **2.5 Degrade gracefully**
  - Player with no artwork, paused player, player closed mid-track.
  - _Verify:_ no crash, no blank frame, placeholder shown.

---

## Phase 3 — File shelf

- [ ] **3.1 Drop in**
  - Drag files onto the pill → paths held in memory, count badge, 50-entry cap with a clear message.
  - _Verify:_ drop 3 files → badge reads "3 files"; drop 51 → capped at 50 with notice.
- [ ] **3.2 Missing-file badge**
  - Existence rechecked on panel open.
  - _Verify:_ delete a dropped file, reopen → row shows "File moved or deleted" and drag is disabled.
- [ ] **3.3 Copy one / Copy All**
  - Button per row plus Copy All. Goes through the helper.
  - _Verify:_ Ctrl+V in Explorer pastes the real files.
- [ ] **3.4 Drag out**
  - Drag a row to Explorer or an email client.
  - _Verify:_ file lands in the target with the same name and size.
- [ ] **3.5 Clear All**
  - Wipes the shelf. Restarting the app also wipes it. While the shelf holds files, it shows a one-line warning that quitting clears it.
  - _Verify:_ Clear All empties the list; restart starts empty; warning row visible with 3 files and gone at 0.

---

## Phase 4 — Timer

- [ ] **4.1 Presets and custom**
  - 5 / 10 / 25 min plus a custom minutes field, 1–999.
  - _Verify:_ each preset starts a timer with the right remaining time.
- [ ] **4.2 Live countdown on the pill**
  - `mm:ss` under 60 min, `h:mm:ss` above. Main owns the deadline and pushes `beam:timer:tick`; the renderer only displays it. Never a decrementing counter.
  - _Verify:_ sleep the machine 2 minutes → countdown is still correct.
- [ ] **4.3 Done state**
  - Chime plays once, Windows banner fires, pill pulses, mascot switches to done.
  - _Verify:_ timer reaches 0 → audible chime + visible banner, exactly one of each.
- [ ] **4.4 Cancel and replace**
  - Cancel stops it. Starting a new one replaces the running one.
  - _Verify:_ start 5m, start 10m → only 10m runs, pill shows 10:00.
- [ ] **4.5 Fires while hidden**
  - Fullscreen game active when the timer ends.
  - _Verify:_ chime and banner still fire with the pill hidden.

---

## Phase 5 — Calendar

- [ ] **5.1 Month grid**
  - Current month, correct weekday offset, local clock only.
  - _Verify:_ matches Windows calendar for the current month.
- [ ] **5.2 Today highlighted**
  - _Verify:_ today's cell has a visibly distinct style.
- [ ] **5.3 Month drift**
  - Leave the app open past midnight / month end.
  - _Verify:_ date rolls without a restart.

---

## Phase 6 — Contextual tabs

- [ ] **6.1 Auto-pick on open**
  - Timer running → Timer. Else music playing → Music. Else last-used tab. The renderer decides from the state it already holds; main sends no tab commands.
  - _Verify:_ three scenarios produce three correct tabs.
- [ ] **6.2 Priority**
  - Both running → Timer wins.
  - _Verify:_ start music and a timer, open panel → Timer tab.

---

## Phase 7 — Settings

- [ ] **7.1 Settings screen**
  - Startup toggle, hotkey rebind, chime volume with a test button, and a light/dark theme switch.
  - _Verify:_ each control saves, survives restart, and takes effect immediately.

---

## Phase 8 — Proof

- [ ] **8.1 `verify.ps1` full suite**
  - Typecheck, build, helper build, launch, window exists at correct height, hotkey registered, timer counts down, clipboard holds 3 files and still pastes after a forced helper restart, no outbound TCP from the app's PID, Electron under 130 MB, helper under 60 MB, total printed, CPU within budget.
  - _Verify:_ `.\verify.ps1` exits 0 and prints each check.
- [ ] **8.2 Packaged build**
  - Installer or portable exe launches on a clean profile.
  - _Verify:_ installed app passes the manual PRD checklist.

---

## Backlog (do not touch this milestone)

- App launcher / switcher
- File search by name or content
- Clipboard history
- Seek bar
- Light theme
- Volume / brightness sliders
- Bundled custom font
- Marketing website
