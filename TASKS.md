# TASKS.md — Active Implementation Checklist

**Rules:** one task at a time, top unchecked box in the order below. Run the verification. Only tick `[x]` when it exits 0. Log the result in JOURNAL.md.

**Milestone:** a floating pill that reads Spotify, holds files, runs a timer, and passes `.\verify.ps1` with exit code 0.

**Sequence rule (2026-10-29):** every step may only depend on steps above it. 0.4c was replaced by 3.4 — a drag-out needs a shelf that holds files first, and the helper OLE drag spun at 100% CPU without dropping anything, so its code was deleted. Drag-out now goes through Electron's `webContents.startDrag`.

**Done before the order:** 0.1 scaffold, 0.2 budget (90 MB / 0.035% CPU), 0.3 helper ping (6.3 MB), 0.4a live SMTC + PNG art, 0.4b CF_HDROP clipboard. Plus UI work outside the phase order: the app UI system, the canonical preview, the focus/cleanup pass (cards 21–35), the 2026-10-28 cleanup (card 43), the segmented-tab redesign (cards 44–54), the 100/136 capsule pass (cards 55–56), the 2026-10-29 audit fix pass (card 64), and the 6% capsule scale to 94×30 / 128×30 in a 136×42 window (card 67).

---

## A. Shell that feels right

- [x] **1.1 Anchor above the taskbar** — *Depends on: nothing.*
  - Read `workArea`, not screen size. The pill sits 12px above its bottom edge, horizontally centered on the primary monitor.
  - _Verify (proved 2026-10-29 at 125%): the settled content rect keeps the pill 12px above the work area and centered, and the native window rect matches; check 6 in `verify.ps1`. Multi-monitor restore and 100/150% scaling are unproven and belong to 1.4 and 8.1.
- [x] **1.2 Never steal focus** — *Depends on: 1.1.*
  - Pill does not take foreground on show. Panel closes without activating another app wrongly.
  - _Verify (proved 2026-10-29): the foreground window handle is unchanged ~1s after launch and Beam's own handle never becomes foreground; this replaced the Notepad typing test, which the Store Notepad could not run from a script.
- [x] **1.6 Tray** — *Depends on: 1.1.*
  - Icon near clock. Menu: Settings, Reset Position, Quit. Quit exits the process cleanly, helper included. Built; Settings stays disabled until the Settings screen lands at 7.1, and Reset needs a moved window from 1.4.
  - _Verify (proved 2026-10-29): Quit exits the app and the helper. Settings is disabled until 7.1, and Reset Position is wired but unproven until 1.4 gives the window a moved position to reset from.
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

- [ ] **0.5 Fullscreen detection** — *Depends on: 0.3.*
  - WinEventHook on foreground change plus `EVENT_OBJECT_LOCATIONCHANGE` on the foreground window, rect compared to monitor bounds, with a 1s fallback poll.
  - _Verify:_ entering a fullscreen video logs `active: true`, leaving logs `false`; a video made fullscreen inside an already-focused window also flips it, with no foreground change.
- [ ] **1.9 Hide on fullscreen** — *Depends on: 0.5, 1.6.*
  - `fullscreen.changed` hides the window; hotkey or tray brings it back.
  - _Verify:_ fullscreen video hides it, tray restores it.

## C. Shelf — the pill holds files

- [ ] **3.1 Drop in** — *Depends on: 1.1.*
  - Drag files onto the pill → paths held in memory, count on the pill, 50-entry cap with a clear message. Renderer reads paths with `webUtils.getPathForFile` (Electron 45 removed `File.path`).
  - _Verify:_ drop 3 files → pill reads "3 files"; drop 51 → capped at 50 with notice.
- [ ] **3.3 Copy one / Copy All** — *Depends on: 3.1, 1.3.*
  - Copy button per row (hover or focus, 24px) plus Copy All. Goes through the helper's proven `files.copy`.
  - _Verify:_ Ctrl+V in Explorer pastes the real files.
- [ ] **3.4 Drag out** — *Depends on: 3.1.*
  - Drag a row, or the pill while it holds files, to Explorer or an email client. Electron's `webContents.startDrag` with the real paths; the target decides copy vs move (Ctrl/Shift override). Replaces 0.4c.
  - _Verify:_ manual drag into Explorer lands the files with the same names and sizes; a missing file cannot start a drag.
- [ ] **3.2 Missing-file badge** — *Depends on: 3.1.*
  - Existence rechecked on panel open.
  - _Verify:_ delete a dropped file, reopen → row shows "File moved or deleted" and drag is disabled.
- [ ] **3.5 Clear All** — *Depends on: 3.1, 1.6.*
  - Wipes the shelf. Restarting the app also wipes it. While the shelf holds files, it shows a one-line warning that quitting clears it.
  - _Verify:_ Clear All empties the list; restart starts empty; warning row visible with 3 files and gone at 0.

## D. Music

- [ ] **2.1 Live state on the pill** — *Depends on: 0.4a.*
  - Title, artist, artwork thumbnail. Empty state when nothing plays.
  - _Verify:_ changing track in Spotify updates the pill within 1s.
- [ ] **2.2 Hover controls** — *Depends on: 2.1.*
  - Play/Pause, Prev, Next fade in on hover. Fixed window size.
  - _Verify:_ all three buttons change Spotify's real playback state.
- [ ] **2.3 Music tab** — *Depends on: 1.3, 2.1.*
  - 148px square art, full metadata, read-only position bar with elapsed/total, same controls. No seek control (out of scope).
  - _Verify:_ art renders with no network requests in DevTools; the position bar matches SMTC and cannot be dragged.
- [ ] **2.4 Session picking** — *Depends on: 2.1.*
  - Two players at once → last-touched wins; switching apps in the media popup switches Beam.
  - _Verify:_ Spotify + browser tab, toggle foreground, pill follows.
- [ ] **2.5 Degrade gracefully** — *Depends on: 2.3.*
  - Player with no artwork, paused player, player closed mid-track.
  - _Verify:_ no crash, no blank frame, placeholder shown.

## E. Timer

- [ ] **4.1 Presets and custom** — *Depends on: 1.3.*
  - 5 / 10 / 25 min plus an inline custom minutes field, 1–999.
  - _Verify:_ each preset starts a timer with the right remaining time.
- [ ] **4.2 Live countdown on the pill** — *Depends on: 4.1.*
  - `mm:ss` under 60 min, `h:mm:ss` above. Main owns the deadline and pushes `beam:timer:tick`; the renderer only displays it. Never a decrementing counter.
  - _Verify:_ sleep the machine 2 minutes → countdown is still correct.
- [ ] **4.3 Done state** — *Depends on: 4.2.*
  - Chime plays once, Windows banner fires; the pill reads Done with a gold check and gold border (no digits, no glow, no mascot swap).
  - _Verify:_ timer reaches 0 → audible chime + visible banner, exactly one of each; the capsule shows the check, not digits.
- [ ] **4.4 Cancel and replace** — *Depends on: 4.2.*
  - Cancel stops it. Starting a new one replaces the running one.
  - _Verify:_ start 5m, start 10m → only 10m runs, pill shows 10:00.
- [ ] **4.5 Fires while hidden** — *Depends on: 4.3, 1.9.*
  - Fullscreen game active when the timer ends.
  - _Verify:_ chime and banner still fire with the pill hidden.

## F. Calendar

- [ ] **5.1 Month grid** — *Depends on: 1.3.*
  - Current month, correct weekday offset, local clock only. First day of the week follows the Windows locale, Sunday as fallback.
  - _Verify:_ matches Windows calendar for the current month and week start.
- [ ] **5.2 Today highlighted** — *Depends on: 5.1.*
  - _Verify:_ today's cell has a visibly distinct style.
- [ ] **5.3 Month drift** — *Depends on: 5.1.*
  - Leave the app open past midnight / month end.
  - _Verify:_ date rolls without a restart.
- [ ] **5.4 Month navigation** — *Depends on: 5.1.*
  - Chevrons move one month; Today returns to the current month. Today stays highlighted only in its own month.
  - _Verify:_ arrows cross a year boundary correctly; Today restores after several months.

## G. Glue and settings

- [ ] **6.1 Auto-pick on open** — *Depends on: 2.3, 4.2.*
  - Timer running → Timer. Else music playing → Music. Else last-used tab. The renderer decides from the state it already holds; main sends no tab commands.
  - _Verify:_ three scenarios produce three correct tabs.
- [ ] **6.2 Priority** — *Depends on: 6.1.*
  - Both running → Timer wins.
  - _Verify:_ start music and a timer, open panel → Timer tab.
- [ ] **1.8 Global hotkey** — *Depends on: 1.6.*
  - `Alt+Space` registers; on failure try `Ctrl+Shift+Space` and tell the user. Rebindable in settings.
  - _Verify:_ hotkey toggles the panel from inside a maximized app.
- [ ] **1.7 Startup toggle** — *Depends on: 1.4.*
  - `setLoginItemSettings` wired to one settings flag. Three surfaces, one flag: a one-time first-run ask in the panel (Turn on / Not now), the Settings switch, and a tray checkbox. Nothing is written to the registry until the user answers; default is off until then.
  - _Verify:_ Turn on → registry Run entry exists; Turn off → gone; Not now leaves no entry; tray checkbox and Settings stay in sync; choice survives restart.
- [ ] **7.1 Settings screen** — *Depends on: 1.7, 1.8, 1.6.*
  - Five rows: startup toggle, hotkey rebind, chime volume with −/+ and a test button, Dark theme switch, and Reset position.
  - _Verify:_ each control saves, survives restart, and takes effect immediately.

## H. Proof

- [ ] **8.1 `verify.ps1` full suite** — *Depends on: every task above.*
  - Typecheck, build, helper build, launch, window exists at correct height, hotkey registered, timer counts down, clipboard holds 3 files and still pastes after a forced helper restart, no outbound TCP from the app's PID, Electron under 130 MB, helper under 60 MB, total printed, CPU within budget.
  - _Verify:_ `.\verify.ps1` exits 0 and prints each check.
- [ ] **8.2 Packaged build** — *Depends on: 8.1.*
  - Installer or portable exe launches on a clean profile.
  - _Verify:_ installed app passes the manual PRD checklist.

---

## Replaced

- ~~**0.4c Drag out multiple files**~~ — replaced by **3.4**. The helper's OLE `DoDragDrop` could not take the mouse capture from Chromium, spun at 100% CPU, and never dropped; the code was deleted on 2026-10-29.

## Backlog (do not touch this milestone)

- App launcher / switcher
- File search by name or content
- Clipboard history
- Seek bar
- Volume / brightness sliders
- Bundled custom font
- Marketing website
