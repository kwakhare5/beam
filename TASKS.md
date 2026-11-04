# TASKS.md — Active Implementation Checklist

**Rules:** one task at a time, top unchecked box in the order below. Run the verification. Only tick `[x]` when it exits 0. Log the result in JOURNAL.md.

**Milestone:** a floating pill that reads Spotify, holds files, runs a timer, and passes `.\verify.ps1` with exit code 0.

**Sequence rule (2026-10-29):** every step may only depend on steps above it. 0.4c was replaced by 3.4 — a drag-out needs a shelf that holds files first, and the helper OLE drag spun at 100% CPU without dropping anything, so its code was deleted. Drag-out now goes through Electron's `webContents.startDrag`.

**Done before the order:** 0.1 scaffold, 0.2 budget (90 MB / 0.035% CPU), 0.3 helper ping (6.3 MB), 0.4a live SMTC + PNG art, 0.4b CF_HDROP clipboard. Plus UI work outside the phase order: the app UI system, the canonical preview, the focus/cleanup pass (cards 21–35), the 2026-10-28 cleanup (card 43), the segmented-tab redesign (cards 44–54), the 100/136 capsule pass (cards 55–56), the 2026-10-29 audit fix pass (card 64), and the 6% capsule scale to 94×30 / 128×30 in a 136×42 window (card 67).

## I. UI trust pass (approved 2026-11-04)

These run before the phase tasks, as previous UI passes did. The canonical preview keeps every state; the app only shows what works. 2.4/2.5 proof is part of 9.9.

- [ ] **9.1 Honest surfaces** — *Depends on: 2.3.*
  - Hide Timer, Calendar, Settings, and the pill timer/done actions in the app until their engines land. Keep them in `showcase/app-preview.html`. No dead tab or dead control in the app.
- [ ] **9.2 Add files picker** — *Depends on: 3.1.*
  - Native `dialog.showOpenDialog` through preload/main; add picked paths to the same shelf; empty state and action row both work. A drop while the panel is open refreshes the Files list.
- [ ] **9.3 Panel flow** — *Depends on: 1.3.*
  - Esc resets main's panel state; the panel animates out over 150ms; the 16px margin dismisses; opening picks Files, Music, or the last tab from the pill state. No stuck reopen.
- [ ] **9.4 Feedback and safety** — *Depends on: 3.3, 3.5.*
  - Visible status for copy/add/remove failures; 5s Undo after a row remove; confirm Quit when the shelf is non-empty; a `Connection lost` pill state when the helper dies; tray Hide.
- [ ] **9.5 Quiet idle and chevron** — *Depends on: 1.5, 2.2.*
  - 30×30 star-only quiet after 20s idle; 94×30 on hover; 2s return; idle-only. A 16px chevron in the music hover row opens the panel.
- [ ] **9.6 Hit area** — *Depends on: 9.5.*
  - Shape the window to the visible pill with a 6px shadow halo so the transparent margins click through. Re-test drag, hover, panel, and the real-mouse checks.
- [ ] **9.7 Files and Music layout** — *Depends on: 3.3, 2.3.*
  - Files rows start at the top with actions pinned bottom. More breathing room around the Music progress block.
- [ ] **9.8 Keyboard and accessibility** — *Depends on: 1.6.*
  - Pill role, name, Enter, focus ring, live region; focus restoration on panel close; Settings tab inside the tablist; calendar focus style. Pull 1.8 forward.
- [ ] **9.9 Proof** — *Depends on: 9.1–9.8.*
  - Add runtime checks for the quiet state, chevron, auto-pick, Esc/reopen, margin click-through, Add files, Undo, and quit confirm. Prove 2.4 and 2.5. `.\verify.ps1` exits 0.

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
  - Title and artwork thumbnail. Empty state when nothing plays. Artist stays panel-only: DESIGN's pill has one 46px title slot.
  - _Verify (proved 2026-11-01): check 21 matches the live SMTC title, playing/paused state, dot, and art in 9–29ms; a real Spotify track change moved the pill in 15ms. While a track is active, verify prints SKIP for the idle, drop-count, and clear pill labels and asserts their data elsewhere._
- [x] **2.2 Hover controls** — *Depends on: 2.1.*
  - Play/Pause, Prev, Next fade in on hover. Fixed window size.
  - _Verify (proved 2026-11-02): check 22 hovers the live pill, asserts the transport overlay at opacity 1 with the title at 0, and clicks each button with injected mouse input; play/pause flipped playing true→false, Next moved `Allah Maaf Kare`→`Naah`, and Previous moved it back. Check 12 now presses the pill's left padding because the hover transports cover the center._
- [x] **2.3 Music tab** — *Depends on: 1.3, 2.1.*
  - 148px square art, full metadata, read-only position bar with elapsed/total, same controls. No seek control (out of scope).
  - _Verify (proved 2026-11-02): check 23 opens the Music tab on the live Chrome track 'Pyar Ki' and asserts 148×148 art from a data URL, title and artist, a read-only DIV progressbar with no slider or tab stop, elapsed/total labels, and all three transports; the bar read 1s/228s and advanced 3s in 3s, and the tab play/pause flipped and restored real playback. CDP `Network.enable` saw 0 http(s) requests._
- [ ] **2.4 Session picking** — *Depends on: 2.1.*
  - Two players at once → last-touched wins; switching apps in the media popup switches Beam.
  - _Verify:_ Spotify + browser tab, toggle foreground, pill follows.
  - _Built 2026-11-02, unticked._ The helper resolves one session per read (current, else newest playing), listens for `SessionsChanged`, and answers `music.sessions` / `music.pick` under `BEAM_MUSIC_SESSIONS_TEST=1`; check 24 switches a real player both ways. Not ticked: `.\verify.ps1` stopped at check 17, where the real Ctrl+V into Explorer lost the foreground to Freebuff.
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
