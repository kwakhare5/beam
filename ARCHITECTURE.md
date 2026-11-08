# ARCHITECTURE.md — Technical Blueprint

**Load when:** starting a task that touches the helper, the window, or IPC. Not every session.
**Update when:** a seam changes, a new part appears, or a decision is reversed.

---

## 1. System Overview

```
                    ┌─────────────────────────────────────┐
                    │        Electron Main Process        │
                    │  window · tray · hotkey · settings  │
                    └───────┬─────────────────────┬───────┘
                            │ IPC (typed, preload)│ stdio: 1 JSON line each way
                            │                     │
                    ┌───────▼────────┐   ┌────────▼─────────────┐
                    │  Renderer (UI) │   │  BeamBridge.exe      │
                    │  pill + 5 tabs │   │  C# .NET, no window  │
                    └────────────────┘   └────────┬─────────────┘
                                                  │ Win32 / WinRT
                                        ┌─────────▼──────────┐
                                        │ Windows: SMTC,     │
                                        │ clipboard, WinEvent│
                                        └────────────────────┘
```

No network. No database. No server. Four parts, three seams.

### Current vs target (2026-10-29)

Implemented: Electron shell with single-instance lock, the 136×42 window anchored above the taskbar with a 94×30 idle capsule (music and paused rest at 108×30, quiet at 26×26), tray, panel open/collapse at 452×316 with a ~150ms transform, pointer-captured window drag with a saved position (`settings.ts`), the idle star dim asserted from computed style, a 4Hz cursor poll that wakes the quiet nub within 37px of the pill centre and returns it 2s after the cursor leaves, hide-on-fullscreen with tray restore, a file drop shelf (paths only, deduped, 50 cap, pill count), live Files rows with copy and drag-out, the live music pill with prev / play-pause / next transports, a live Music tab with 148px art and a read-only position bar, a main-owned timer (`timer.ts`) with a one-shot chime and Windows notification, the live Timer and Calendar tabs, the live Settings tab (startup, shortcut, volume, theme, reset) as a labeled fifth tab with the tray opening it, a registry-backed startup toggle (`startup.ts`), hotkey rebinding with rollback (`hotkey.ts`), split UI modules/styles, the canonical preview, thirty `verify.ps1` checks (including a real-mouse window drag → restart → reset, a real copy paste and a real row drag-out into Explorer, a real borderless fullscreen window, timer completion while hidden, and a real-click Settings pass through a restart), and `measure.ps1`.

Built in the helper: stdio client, SMTC read with PNG artwork, CF_HDROP clipboard, fullscreen detection, ping, and test-only session listing plus title/index picks (`music.sessions` / `music.pick`, behind the sessions test flag).

Landed 2026-11-07 by R4: main is split into `geometry.ts`, `shelf.ts`, `panel.ts`, `music.ts`, `hotkey.ts`, `timer.ts`, and `dev/harness.ts` (excluded from packaged files); the renderer's shared core lives in `src/renderer/core/` and the site demo imports the same modules. R6 added `startup.ts` and filled the Settings screen. Still target: the packaged build (R8).

---

## 2. Parts & Responsibilities

| Part | Runs as | Owns | Never does |
|---|---|---|---|
| Electron main | Node process | Window geometry, tray, global hotkey, settings file, helper lifecycle, the shelf | Draw UI, touch Win32 directly |
| Renderer | Chromium window | Pill, 5 tabs, all visuals | Read files from disk, call Win32, keep the shelf |
| Shelf (main memory) | Array in the main process | Dropped paths, deduped case-insensitively, capped at 50 | Copy or move files, touch disk, survive a restart |
| BeamBridge.exe | Windowless C# child | SMTC read + commands, clipboard, fullscreen detection | Draw anything, own state long-term, run drag-out (app-owned) |
| settings.json | File in `%APPDATA%\Beam\` | Position, hotkey, startup flag, chime volume, theme, schema `version` | Store temp data |

Renderer is untrusted by design: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. It gets one narrow preload API and nothing else.

---

## 3. Target File Tree

```
D:\Beam
├── package.json              exact-pinned deps
├── tsconfig.json
├── tsconfig.renderer.json
├── vite.config.mts
├── vite.preview.mts
├── electron-builder.yml
├── verify.ps1                the one proof command
├── measure.ps1               memory/CPU proof
├── README.md
├── GLOSSARY.md               UI vocabulary
├── docs/adr/                 0001–0010 UI decisions
├── PRD.md  DESIGN.md  ARCHITECTURE.md  TASKS.md  AGENTS.md  JOURNAL.md
├── scripts/generate-icons.mjs
├── src/
│   ├── main/
│   │   ├── index.ts          app lifecycle, single-instance lock, wiring
│   │   ├── geometry.ts       pill/panel sizes, anchoring, saved-bounds restore, clamping
│   │   ├── shelf.ts          MAX_SHELF + Shelf (add, canonical, remove, clear, rows)
│   │   ├── panel.ts          PanelController (show/hide/collapse/blur/reset + shape)
│   │   ├── music.ts          MusicService (current payload, last-session forwarding)
│   │   ├── tray.ts           tray icon + menu (Settings, Reset Position, Hide, Quit)
│   │   ├── hotkey.ts         default/fallback registration, chord validation, rebind with rollback
│   │   ├── settings.ts       read/write settings.json, defaults, versioned shape
│   │   ├── startup.ts        HKCU Run value read/write for Start with Windows
│   │   ├── timer.ts          deadline, 200ms ticker, one-shot completion
│   │   ├── dev/harness.ts    every BEAM_* probe (excluded from packaged files)
│   │   └── bridge.ts         spawn helper + JSON-lines client (8s request timeout, 3/60s restart policy, 16M buffer cap)
│   ├── preload/index.ts      contextBridge surface (the only door)
│   ├── renderer/
│   │   ├── core/             tabs, timer view, calendar shift, undo slot (shared with the site demo)
│   │   ├── ui/
│   │   │   ├── index.ts      public view API
│   │   │   ├── capsule/
│   │   │   │   └── pill.ts   one capsule, state data
│   │   │   ├── panel/
│   │   │   │   ├── panel.ts  shell + tab host
│   │   │   │   ├── panel-body.ts tabpanel wrapper
│   │   │   │   ├── tab-nav.ts    tab click + keyboard behavior
│   │   │   │   ├── tab-meta.ts   Tab type + tab registry
│   │   │   │   └── tabs/     music, files, timer, calendar, settings
│   │   │   ├── shared/
│   │   │   │   ├── icons.ts  Lucide sprite + icon()
│   │   │   │   ├── icons.generated.ts
│   │   │   │   ├── mascots.ts
│   │   │   │   ├── html.ts
│   │   │   │   └── format.ts
│   │   │   └── index.ts      public component API
│   │   ├── styles.css        CSS entry (@import)
│   │   ├── styles/           tokens, base, capsule
│   │   │   ├── panel/        shell, body
│   │   │   ├── controls/     buttons, fields, indicators
│   │   │   └── tabs/         music, files, timer, calendar, settings
│   │   ├── renderer.ts
│   │   └── assets.d.ts       .svg/.woff2 module declarations
│   └── shared/               (planned)
│       ├── ipc.ts            channel names + payload types
│       └── bridge.ts         helper command/event types
├── native/BeamBridge/        built at 0.3–0.4b: .NET 10 console, stdio JSON lines, ping, SMTC music events + PNG art, CF_HDROP clipboard, 10.8 MB private idle (2026-10-29)
├── assets/
│   ├── mascot/*.svg          shipped
│   ├── fonts/                InterVariable.woff2 + OFL.txt
│   ├── tray.ico              shipped (16/20/24/32 PNG entries)
│   └── chime.wav             (planned) generated, committed
└── showcase/                 brand lab, never shipped
```

---

## 4. Seam A — Main ⇄ Helper (stdio)

Main spawns `BeamBridge.exe` once at startup and keeps it alive. One JSON object per line.

**Why stdio and not a local port:** a listening TCP port looks like an open network surface and would fail the "zero external network" check. stdio cannot be reached from outside the process tree.

Requests (main → helper), each with an `id`:

| cmd | payload | returns |
|---|---|---|
| `music.get` | — | current session or `null` |
| `music.toggle` | — | ok / error |
| `music.next` / `music.prev` | — | ok / error |
| `music.sessions` | — | `{ sessions: [{ app, title, playing, current }] }`; only when `BEAM_MUSIC_SESSIONS_TEST=1` |
| `music.pick` | `app: string` | ok / error; sends a real play/pause to that player so Windows marks it current; only when `BEAM_MUSIC_SESSIONS_TEST=1` |
| `files.copy` | `paths: string[]` | ok / error |
| `fullscreen.get` | — | `{ active, rect }` |
| `ping` | — | `{ pong, version }` |

Events (helper → main), unsolicited, no `id`:

| evt | payload |
|---|---|
| `music.changed` | `{ app, title, artist, album, art, playing, positionMs, durationMs }` or `null`; `art` is a base64 PNG or null; players that publish no timeline may omit the last two |
| `fullscreen.changed` | `{ active }` |

Rules: helper never prints anything else to stdout (stderr is for logs). Any malformed line is dropped and logged. A request without a reply rejects after 8s; the stdout buffer is capped at 16M chars. Main restarts the helper after an unexpected exit, max 3 times in 60s with a 500ms delay, then logs and stops (no tray warning yet); the restarted helper is pinged, and a spawn error resets the child before the next attempt. The helper exits on stdin EOF, so a killed main cannot orphan it; on quit, main closes stdin and waits up to 1.5s for that exit before killing. Settings are written to a temp file and renamed, so a crash cannot leave a half-written JSON file. Music commands (built 2026-11-02) ask the manager for the live session, call `TryTogglePlayPauseAsync` / `TrySkipNextAsync` / `TrySkipPreviousAsync`, and reply `{ ok, error }`; a missing session or a refusal is an error, never a crash. Session picking (built 2026-11-02) resolves one session per read through `Resolve()` — Windows' current session, else the newest playing session by timeline `LastUpdatedTime` — subscribes `SessionsChanged`, and re-resolves on every publish and every command, so a player that vanishes cannot leave a stale handle.

**Drag-out never goes through the helper.** 0.4c tried `DoDragDrop` on a dedicated STA thread: Windows kept the mouse capture with Chromium's window, so the drag loop spun at 100% CPU and never dropped. The code was deleted 2026-10-29. The renderer starts the drag from its own `dragstart` gesture and main calls `webContents.startDrag({ file, files, icon })`, which uses Chromium's native drag source and accepts multiple paths. Built 2026-10-31 for Files rows only: a row is draggable when its path is on the shelf and still exists; `beam:files:drag` re-checks both in main and ignores anything else. The capsule keeps moving the window (DESIGN Pointer Drag) — one pointer gesture cannot do both. The old `BEAM_DRAG_TEST` hook was removed.

**Artwork:** the helper saves the current thumbnail to `%TEMP%\Beam\art\<hash>.png`, overwrites it per track, and wipes the folder on start and quit. This is the one allowed disk write; the file shelf stays paths-only in memory.

**Clipboard:** Windows keeps `CF_HDROP` alive only while the owning process lives. The helper owns the clipboard, so a helper crash breaks paste until it restarts. Accepted; covered by a restart test in task 8.1. Built at 0.4b: `DROPFILES` + double-null UTF-16 paths in moveable global memory, five clipboard-open retries; data is rendered immediately, so it survives the helper exiting.

**Fullscreen:** detection listens to foreground changes, `EVENT_OBJECT_LOCATIONCHANGE` on the foreground window, and a 1s fallback poll. Foreground events alone miss a video that goes fullscreen inside an already-focused window. Built at 0.5 in `native/BeamBridge/FullscreenWatcher.cs` on its own message-loop thread: both hooks are out-of-context, the foreground window's DWM frame bounds are compared to its monitor with a 2px tolerance, and maximized, cloaked, shell, and own-process windows are ignored so a maximized window never counts. It emits `fullscreen.changed { active }` on a flip only, and answers `fullscreen.get` from a live probe. Proved 2026-10-31 with a real borderless window grown from 600×400 to 1920×1080 and back: `active:true` then `false` with the same foreground handle throughout (verify check 14).

---

## 5. Seam B — Main ⇄ Renderer (IPC)

All channels prefixed `beam:`. Renderer can call, main can push. The 27 channel names and payload types (`ShelfFile`, `AddResult`, `CopyResult`, `FileChange`, `MusicState`, `HelperState`, `TimerSnapshot`, `SettingsSnapshot`, `SettingsPatch`, `SettingsResult`) live in `src/shared/ipc.ts`; `main/index.ts`, `preload/index.ts`, and the renderer import them, so a channel rename fails the typecheck instead of drifting.

| Direction | Channel | Purpose | State |
|---|---|---|---|
| renderer → main | `beam:panel:request-open` | open the panel from a pill click | built |
| renderer → main | `beam:panel:collapsed` | panel finished closing; window returns to 136×42 | built |
| renderer → main | `beam:panel:timing` | measured open duration + reduced-motion flag | built |
| renderer → main | `beam:window:drag-start` / `drag-move` / `drag-end` | pointer-captured window drag; main moves the window with `setBounds`, clamps it to the display work area, and saves the position | built |
| main → renderer | `beam:panel:open` | start the open animation, carrying the shelf rows stat'd from disk and an optional `settings` tab (tray Settings) | built |
| main → renderer | `beam:panel:dismiss` | close on blur or tray toggle | built |
| renderer → main | `beam:music:command` | toggle / next / prev; main validates the sender and command, calls the helper, and replies `{ ok, error }` | built |
| renderer → main | `beam:files:add` | paths from a drop; main dedupes, caps at 50, replies `{ count, accepted, truncated, limit }` | built |
| renderer → main | `beam:files:copy` | copy one or all; payload `{ paths, source }`, main accepts only paths already on the shelf and calls `files.copy` | built |
| renderer → main | `beam:files:drag` | start drag-out; payload `string[]`, main accepts only existing shelf paths and calls `startDrag` | built |
| renderer → main | `beam:files:remove` | remove one shelf path; replies `{ ok, files }` with fresh stat rows | built |
| renderer → main | `beam:files:clear` | wipe the shelf; replies `{ ok, files: [] }` | built |
| renderer → main | `beam:timer:start` / `cancel` / `dismiss` | start a timer (minutes 1–999), cancel a running one, clear the done face; main owns the deadline and replies `TimerSnapshot` | built |
| renderer → main | `beam:settings:get/set` | read the snapshot (`startup` read from the registry, current shortcut, volume, theme, optional `error`) and apply a validated patch; startup writes/removes the HKCU Run value, a shortcut change rebinds with rollback | built |
| renderer → main | `beam:settings:reset-position` | clear the saved position, re-anchor above the taskbar, close the panel first if open | built |
| main → renderer | `beam:settings:state` | pushed after every accepted or rejected patch and on `did-finish-load`, so the rows re-render from main's truth | built |
| main → renderer | `beam:music:state` | pushed on `music.changed` and again on `did-finish-load`; `{ title, artist, playing, positionMs, durationMs, art }` with `art` a PNG data URL or null | built |
| main → renderer | `beam:timer:state` | pushed on start/cancel/dismiss, on `did-finish-load`, and when the displayed second changes; `{ phase, minutes, remainingMs, deadline, id, alert }`; `alert` is true only in the one completion push | built |
| renderer → main | `beam:timer:chimed` | audio ack after the chime `play()` settles; `{ id, ok }`, logged by main | built |

Fullscreen hide is main-only: main calls `win.hide()` / `win.showInactive()` itself and never messages the renderer for it.

**Drops:** the renderer accepts file drops on the window, reads each real path with `webUtils.getPathForFile` (exposed through the preload; Electron 45 removed `File.path`), and sends the list over `beam:files:add`. Main owns the shelf as an in-memory string array: duplicates are skipped case-insensitively, the 50th entry is the cap, and the reply carries `{ count, accepted, truncated, limit }`. The renderer prints `N files` in the pill and shows `Max 50` for 2.4s when a drop was truncated. Nothing is copied or cached, and the shelf dies with the process. Check 16 drags real files from Explorer through the real-mouse harness; `BEAM_DROP_TEST=1` is only a passive drag-state probe now.

**Copy:** every panel open stats each shelf path in main (name, byte size, folder/file, missing after a failed stat) and sends the rows with `beam:panel:open`; the renderer re-renders the Files tab from that payload and formats sizes. A row's 24px copy button or Copy All sends `{ paths, source }` over `beam:files:copy`; main maps each path back to its exact shelf entry, rejecting anything else, and calls `files.copy`. The renderer flips the button to a check (`Copied` on Copy All) for ~1.5s. `BEAM_COPY_TEST=1` drops 3 real files, opens the Files tab, clicks the first row's copy then Copy All; verify check 17 reads `CF_HDROP` after each step and pastes with Ctrl+V into a real Explorer folder. A missing row keeps the red `Missing` text and `File moved or deleted` tooltip, loses copy and drag, and the open toggles the pill's danger pip; there is no filesystem watcher, so this refreshes only on the next panel open. A row's × sends `beam:files:remove`, and the armed Clear All sends `beam:files:clear`; both reply with fresh rows, so the renderer re-renders the tab and resets the pill from main's shelf rather than guessing. The list carries a quiet `Files clear on quit` line beside the actions while it holds anything; the empty state says the same in its subtitle.

---

## 6. Key Data Flows

**Music**
```
Spotify changes track
→ Windows raises SMTC event
→ helper fires music.changed {title, artist, art: base64 PNG}
→ main wraps the art as a data URL and sends beam:music:state { title, artist, playing, positionMs, durationMs, art: data URL }
→ renderer swaps pill title + 24px art + green/amber dot, and feeds the panel's Music tab
```

The sandboxed renderer cannot read `%TEMP%\Beam\art\`, so main converts the helper's PNG to a `data:image/png;base64` URL per change; a changed track drops any in-flight read. A null session is held for 500ms before the pill leaves the track, because Spotify publishes a null gap between songs. A missing shelf file's danger dot outranks the music dot.

The pill follows whichever player Windows marks current: `Resolve()` returns `GetCurrentSession()` and falls back to the newest playing session only when Windows reports none, so touching a player in the media flyout moves Beam without a second picker inside the app. Verify check 24 lists the live sessions, sends a real play/pause into a chosen player (which is what promotes it), and asserts the pill reaches that player's title and returns, with no idle frame between and under 3s each way; with one live session it prints SKIP and names the reason.

The Music tab (built 2026-11-02) renders 148×148 art on the left, title and artist with a status dot, a read-only position bar with elapsed/total, and the same three transports. The bar starts at the last SMTC `positionMs`, then advances on a local 1s tick from `performance.now()`; there is no seek and no helper poll. The tab makes no network requests because the art is already a data URL. Verify check 23 proves the 148px art, a non-interactive DIV progressbar, all three controls changing and restoring real playback, and zero http(s) requests under CDP `Network.enable`.

**Copy 3 files**
```
drop lands on pill → renderer collects paths → beam:files:add
→ main stores paths in memory only → shelf renders 3 rows
→ user clicks Copy All → main calls files.copy → helper puts CF_HDROP on clipboard
→ user hits Ctrl+V in Explorer → 3 real files land
```

**Drag and restore**
```
pointerdown on the capsule → 4px movement threshold → renderer sends screen coordinates
→ main sets bounds from the pointer delta with the size pinned, clamped to the display work area
→ drag-end writes { x, y, displayId } to %APPDATA%\Beam\settings.json
→ next launch restores it when the rect still intersects a current display, else the primary anchor
→ tray Reset Position clears the saved position and re-anchors above the primary taskbar
```

**Timer**
```
renderer sends beam:timer:start {minutes} → beam:timer:start sets deadline = now + minutes * 60000
→ a 200ms ticker reads the deadline and pushes beam:timer:state only when ceil(seconds left) changes
→ renderer patches the pill digits and the open Timer tab; it never owns a clock
→ at 0: the ticker clears itself, sets phase done, pushes one alert:true snapshot
→ the renderer plays assets/beam-chime.wav once per timer id and acks beam:timer:chimed
→ main logs the completion and fires an Electron Notification (tray balloon fallback)
→ hidden or fullscreen: same path, because the window does not own the clock
```
The 1-minute test scale (`BEAM_TIMER_SCALE_MS=1000`) exists only for checks 28–29.

**Fullscreen hide**
```
helper's WinEventHook sees a foreground change or the foreground window resize/move
→ compares window rect against monitor bounds → fullscreen.changed
→ a 1s poll catches fullscreen entries that fire no event
→ main hides the window (built 1.9); the tray click shows the pill again without
  opening the panel or taking focus; the hotkey (1.8) is not built
→ if Beam hid the window it shows it again on active:false, but not after a user show
```

---

## 7. Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-27 | Native C# helper process, not a pure-TS app | Electron has no SMTC access, no CF_HDROP, no foreign-window fullscreen detection |
| 2026-10-27 | Helper over stdio JSON lines | A local port would read as a network surface |
| 2026-10-27 | Hotkey is `Alt+Space`, rebindable | User choice; 2 keys, matches PRD |
| 2026-10-27 | Fallback `Ctrl+Shift+Space` if registration fails | `Alt+Space` is the Windows window-menu key and another app may own it |
| 2026-10-27 | Fixed-size window; the capsule grows 104→128 on hover (superseded 2026-10-28) | Visible growth inside the window; an OS resize flickers on Windows |
| 2026-10-28 | Capsule width is fixed per content state; no hover growth (superseded by the 176 row, then the two-width row) | User found the 104→128 hover growth inconsistent; hover now only brightens the shell and reveals controls inside the existing width |
| 2026-10-28 | One 176×32 capsule for every state; music hover swaps the title for transport (superseded by the two-width row below) | User rejected the five-width system and clipped titles; 176 is the maximum inside the 184 window, and swapping avoids squeezing the title |
| 2026-10-28 | Two capsule widths: 136×32 compact, 216×32 for music; window 144×44 or 224×44; width snaps on state change (superseded by the 100/136 row below) | A single 176 wasted space in five short states and still clipped long titles; music is the only state that needs room, and hover never resizes |
| 2026-10-28 | Music capsule rests at 100×32 and grows to 136×32 on hover/focus over 120ms; one 144×44 window for every state | User picked a compact resting pill and accepted hover growth; growing inside a fixed window avoids a Win32 resize during pointer movement |
| 2026-10-28 | (superseded 2026-10-29 by the 94×30 row) Every capsule state rests at 100×32 and shows one fact; music, timer, and done grow to 136×32 on hover/focus and reveal their actions; idle dims its star to 70%; files and idle never grow | User wants a quiet single-fact rest and full actions on hover; growing only where content exists avoids empty width and keeps the 144 window |
| 2026-10-29 | UI split into capsule, panel, per-tab, and shared modules; styles split one file per component; every fill is solid (`--control`, `--control-hover`, `--surface-hover`); file badges and status pips are gone | The 437-line tab stylesheet and 313-line controls stylesheet mixed unrelated components, and translucent chips and pips read as glass; solid opaque fills match the Apple-style shell |
| 2026-10-29 | Capsule is 94×30 at rest and 128×30 on hover inside a 136×42 window | Karan found 100×32 too heavy at 125% display scale; a 6% cut keeps the layout, type scale, and 8px edge padding while shrinking the surface and its margins |
| 2026-10-27 | Last-touched media session wins | Windows can expose Spotify and a browser at once |
| 2026-10-27 | Timer beats music when both are active | PRD's contextual rule needs one winner |
| 2026-10-27 | One timer at a time, no pause, cancel allowed, max 999 min | Smallest thing that satisfies the PRD |
| 2026-10-27 | Shelf cap 50 entries, folders allowed, wiped on quit | In-memory by design, matches PRD |
| 2026-10-27 | Multi-file drag-out is owned by the app, not the helper (revised 2026-10-29) | Electron's `startDrag` handles a `files` list, and Chromium owns the mouse gesture that starts it. A cross-process `DoDragDrop` inside the helper spun at 100% CPU without dropping |
| 2026-10-27 | Fonts: bundled Inter variable (decision changed 2026-10-28) | Segoe UI was the placeholder; Inter is vendored in `assets/fonts/` |
| 2026-10-27 | Chime is a generated 1.5s WAV (planned; not committed yet) | No network fetch, no license question |
| 2026-10-27 | Perf budget read as: under 0.5% avg CPU over 60s idle, under 130 MB private bytes summed across processes | "0% CPU" is not measurable as written |
| 2026-10-27 | RAM ceiling raised 100 → 130 MB, PRD amended | User accepted the Electron baseline; 100 MB was not realistic |
| 2026-10-27 | RAM gate runs immediately after scaffolding (task 0.2), before the helper | Failing the budget after the native spike would waste the hardest work; cheapest point to swap stacks is at the empty window |
| 2026-10-27 | Electron is confirmed, WinUI is the fallback if the gate fails | User chose Electron; no rewrite until the 60s measurement says otherwise |
| 2026-10-27 | Hardware acceleration is disabled at startup | GPU on measured 139.2 MB private, over the 130 MB gate; off measured 81.8 MB steady / 84 MB peak / 0.011% CPU at the 184×44 idle window (earlier 86.4–86.5 MB runs were on the 800×60 window). Re-measured 2026-10-28 at 144×44: 90 MB steady / 90.7 MB peak / 0.035% CPU, and 2026-10-29 at 136×42 with the panel and tray: 99 MB private / 0.2% CPU. Still off, still under the gate. |
| 2026-10-27 | Renderer UI is vanilla shadcn-style, not React shadcn/ui | Avoids React/Tailwind/Radix in a small always-on-top utility; keeps the Electron/TS stack. ADR-0004. |
| 2026-10-27 | `Alt+Space` stays the default despite stealing the system window menu | Explicit user choice |
| 2026-10-27 | Helper ships self-contained, no .NET prerequisite | Must run on a fresh Windows install |
| 2026-10-27 | Pill starts on the primary monitor, follows across monitors when dragged, snaps back to primary if that monitor disappears | Prevents an offscreen window |
| 2026-10-27 | Shelf stays in-memory; quitting drops contents; shelf shows a warning while non-empty | Matches PRD; silent loss would be worse |
| 2026-10-27 | Timer deadline is owned by main, not the renderer | Chromium throttles hidden windows; the alarm must fire while the pill is hidden. Implemented 2026-11-07 by R3 (`src/main/timer.ts`); checks 28–29 prove it. |
| 2026-10-27 | (superseded 2026-10-29: helper drag deleted) `files.drag` runs on a dedicated STA thread in the helper | A blocking `DoDragDrop` on the stdio loop would freeze SMTC reads for the whole drag |
| 2026-10-27 | Budget split: Electron ≤130 MB, helper ≤60 MB, total always reported | One combined number hides which side regressed |
| 2026-10-27 | Single instance: a second launch wakes the existing pill and exits | Two pills would fight over the hotkey, tray icon, and settings file |
| 2026-10-27 | settings.json carries `version: 1`; unknown keys are preserved | Migration needs something to compare against, and a downgrade must not wipe settings |
| 2026-10-27 | `verify.ps1` is created at task 0.1 and grows every phase | Phases 0–7 would otherwise have no runnable proof, which breaks the project's own done rule |
| 2026-10-27 | One window size in scaled units; Chromium handles DPI | Separate layouts per scale are work with no gain; verify at 100/125/150 instead |
| 2026-10-27 | Fullscreen detection = foreground change + `EVENT_OBJECT_LOCATIONCHANGE` + 1s poll | A video going fullscreen in an already-focused window fires no foreground event |
| 2026-10-27 | Artwork lives in `%TEMP%\Beam\art\`, overwritten per track, wiped on quit | The shelf rule bans file copies, not a thumbnail cache; leaving it unbounded is worse. **Superseded 2026-11-04: the PNG rides inside `music.changed` as base64 (ADR-0012).** |
| 2026-10-27 | Clipboard stays helper-owned; helper crash breaks paste until restart | Moving `CF_HDROP` ownership to main means reimplementing the same thing; test the restart instead. **Built 2026-11-07: the helper restarts (3/60s) and check 26 verifies a new pid plus a second pong; paste-after-restart is still unproven.** |
| 2026-10-27 | Renderer picks the contextual tab; `beam:tab:force` removed | The renderer already holds music and timer state; a second decider causes flicker |
| 2026-10-27 | App ships light and dark themes, toggled in settings | User request 2026-10-27; light palette is the Notion set, dark palette is the solid dark set |
| 2026-10-27 | Pill is a transparent CSS capsule, not Windows acrylic | Tested 2026-10-27: acrylic paints the window rectangle and ignores the CSS pill radius; at 32px tall the capsule shape matters more than blur |
| 2026-10-27 | Marketing website out of v1 | DESIGN.md specs one; PRD does not ask for one |
| 2026-10-28 | (superseded 2026-10-29 by the 316 row) Open window is 452×332; panel stays 420×300 with a 16px shadow margin | The old 428×308 left 4px, so the panel shadow clipped into a hard band |
| 2026-10-29 | Open window is 452×316 (420×284 panel) and every tab body centers its content | Karan saw too much empty space at the panel's bottom. Per-tab sizing was built and rejected as too variable; one fixed height that still fits playing music (284) removes 16px and centering splits the remaining slack instead of pooling it at the bottom |
| 2026-10-28 | Capsule state identity: done shows a gold check and gold border; paused shows a play glyph; shelf shows a count with a red pip when a file is missing | Running and done looked identical, paused was invisible at rest, and one missing filename could not represent several files (ADR-0009) |
| 2026-10-29 | Music states show the 24px album thumbnail (star fallback) and a green/amber dot; paused drops the play glyph. The music track and transport span the panel width, selected content tabs get a 2px gold underline, missing rows drop copy, the timer says Set, and done shows a check + Time’s up | The paused glyph stole 20px from the title, the gold pip read as brand, and the narrow music column squeezed the transport (ADR-0010) |
| 2026-10-28 | Capsule precedence is drag > timer > music > files > idle | Direct manipulation feedback wins for the moment it lasts; timer still beats music |
| 2026-10-28 | Music panel shows a read-only position bar, no seeking | Square art plus a position readout fills the panel; SMTC seeking stays out of scope |
| 2026-11-02 | The Music tab advances its read-only bar from the last SMTC position plus a local 1s tick; no helper poll, no network | SMTC publishes position only on session events, so a helper poll would add wakeups; local ticking matches the no-seek scope. Verified at check 23 (bar 1s/228s, +3s in 3s, 0 http(s) requests) |
| 2026-10-28 | Files rows expose copy and remove on hover; the empty state is a dashed drop well | Task 3.3 already promised per-row copy, and the core action needs a visible target |
| 2026-10-28 | Settings has five rows including Reset position, with real controls and dividers instead of a row gap | Read-only badges looked interactive; five 44px rows only fit 242px without the gap |
| 2026-10-28 | Type scale 11/12/13/15/40 and spacing 4/8/12/16 | Five label sizes and three body rhythms made the panel look assembled from different screens |
| 2026-10-31 | Window drag is renderer pointer capture plus main `setBounds` with the window size pinned | `setPosition` let Windows re-round the transparent window's height on every pointer move (42 grew to 141 in the first test); the renderer's 4px threshold keeps a plain click opening the panel |
| 2026-10-31 | The saved position is the outer top-left plus `displayId`, restored only when that rect still intersects a current display | A monitor that was unplugged must not leave the pill offscreen; the primary taskbar anchor is the fallback, and Reset Position clears the value |
| 2026-10-31 | Drag-out starts from Files rows only; the capsule keeps its window-move gesture | The capsule's pointer drag was locked to moving the window (ADR-0005), and one gesture cannot also hand files to Explorer; rows give drag-out a clear surface |
| 2026-10-31 | Pointer-down is ignored for 200ms after a panel starts closing | In the 160ms before the window shrinks, the capsule sits centered in the panel-sized window, so a click there could drag the window instead of landing on the panel |
| 2026-11-01 | Music art crosses the IPC seam as a base64 PNG data URL; a null session is held 500ms; a missing-file danger dot outranks the music dot | The sandbox cannot read the helper's temp PNG, Spotify emits a null gap between tracks that would blink the pill, and a deleted shelf file needs its warning even while music plays. Verified at check 21 (9–29ms) and by a real track change (15ms) |
| 2026-11-02 | Pill transports call `music.toggle` / `next` / `prev` through the helper; the renderer only sends the action; a refusal is logged, not shown | WinRT stays behind the helper seam like every other Win32 call, and a 94px pill has no room for an error surface. The helper asks the manager for the live session on every command so a stale handle cannot wedge playback |
| 2026-11-04 | Idle goes quiet (30×30 star) after 20s; the hover row gains a chevron; the window clips to the pill plus a 6px halo with `setShape`; the app renders only Music and Files | Idle distracted on an empty desktop, music hover hid every open target, and the 21px margins swallowed clicks meant for the window underneath. `setShape` is experimental, so one failure logs once and the window falls back to the full rect |
| 2026-11-04 | The app hides Timer, Calendar, and Settings until they work; the panel auto-picks Music, then Files, then the last tab; Add files uses the native picker and file actions report a status plus Undo | Dead tabs and dead buttons read as broken, and a silent remove or failed add left the user guessing |
| 2026-11-04 | The preload is bundled by Vite (`vite.preload.mts`) and imports the shared channel constants at build time | A sandboxed preload can only require `electron` and builtins, so the shared-IPC import failed at runtime and `window.beam` never loaded; bundling keeps one channel source without weakening the sandbox |
| 2026-11-04 | The panel opens to the last feature used this session — drop/picker, Files action, transport, timer, calendar, or tab visit — falling back to music → files → music | A state-based pick ignored what the user actually touched; session-only because the shelf and the live track do not survive quit |
| 2026-11-04 | The timer counts down from a deadline in the renderer and the calendar keeps a month offset; both tabs are live, and the preview shows the same four tabs (Settings deferred) | Neither needs the helper or a network, and dead tabs broke the app/preview sync rule. Timer half superseded 2026-11-07 by R3: the deadline moved to main; the calendar half stands |
| 2026-11-07 | The timer deadline, tick push, and completion move to main; the renderer only displays snapshots, plays the bundled chime once per timer id, and acks it over `beam:timer:chimed`; main fires an Electron Notification with a tray balloon fallback | Hidden windows throttle renderer timers and a completion must fire exactly once regardless of visibility. Checks 28–29 hold start/cancel/replace, the done face, one chime, one banner, and completion behind a fullscreen window |
| 2026-11-08 | The capsule mark/art shrink to 20px, music and paused rest at 108×30, quiet shrinks to a 26×26 nub; main polls the cursor at 4Hz and wakes quiet within 37px, returning it 2s after the cursor leaves; Settings becomes a labeled fifth tab | The 24px mark squeezed a 44px title slot into two characters, the 30px quiet nub still read as a surface, and moving the cursor to the nub only woke it on a true hover. Settings as a lone icon broke the tab bar's five-column rhythm. Near wakes the label but never reveals actions, so a passing cursor cannot trigger a transport. Check 25 moves the real cursor and measures the 2s return |

UI decisions: ADR-0001 (component boundaries), ADR-0002 (original mascot), ADR-0003 (window, capsule, and panel sizes), ADR-0004 (vanilla shadcn-style), ADR-0005 (capsule interaction), ADR-0006 (landscape panel), ADR-0007 (capsule-to-panel interaction), ADR-0008 (content dynamics), ADR-0009 (state identity, panel completeness, and scale), ADR-0010 (capsule artwork, dot language, and panel clarity), ADR-0011 (trust pass: quiet idle, chevron, shaped hit area, live tabs only).

## 8. Status

Last status audit: 2026-11-07, read-only against the code and `verify.ps1`. The task-by-task notes live in `TASKS.md` under “Audit snapshot — 2026-11-07”; the evidence card is JOURNAL 114.

**Built and previously proven:** shell anchor, no focus steal, tray, panel open/close, drag + position save/restore/reset (single display), idle dim, fullscreen detection and hide, single instance; the file shelf (drop, copy, drag-out, missing badge, remove, Clear All), music pill/transports/Music tab, and the Settings screen with startup, hotkey rebind, volume, theme, and reset.

**Built and working, not accepted by the gate:** 9.1, 9.2, 9.4, 9.7, 9.8, 9.9, the calendar engine, Undo, the Add files picker, keyboard access, and the landing site. 2.4, 9.3, 9.5, 9.6, timer 4.1–4.5, and 1.7/1.8/7.1 are accepted by the 2026-11-07 green runs.

**Partial:** 2.5 has a no-art fallback and null-session debounce; paused and closed-player cases are unproven. Quit confirm and the native Add files dialog have no verify check; the chime and toast are asserted by the audio ack and the main log path, not recorded; the Settings chime test button is wired but no check clicks it.

**Missing:** midnight calendar refresh (5.3), multi-monitor/100–150% proof, and a publishable package.

**Verification:** 30 checks. The 2026-11-07 R6 run exits 0, 30/30, with five music-active skips. Check 16 is a real Explorer→pill drag; 17 retries the Explorer foreground; 24 proves playback-driven session switching; 25 runs separate quiet and chevron phases; 26 force-kills the helper and asserts a new pid plus a second pong; 27 proves a hung request rejects after 8s; 28 proves timer start/cancel/replace, the done face, one chime, one banner, and dismiss; 29 proves completion behind fullscreen with the pill hidden; 30 clicks the real Settings controls, presses the captured chord with SendKeys, writes/removes the Run entry, and proves the values survive a restart.

**Packaging:** `extraResources` lists `BeamBridge.exe` and `tray.ico`, and `src/main/paths.ts` resolves them when packaged, but `npm run dist` only calls electron-builder and no package has been built. No exe or GitHub release is published.

**Open conflicts:** resolved 2026-11-07 by R6: TASKS 6.2 is retired and ADR-0012 last-used wins in the code. README and TASKS previously drifted from the code and now carry the 2026-11-07 audit notes.

## 9. Known Risks

| Risk | Honest read | Mitigation |
|---|---|---|
| RAM budget | Electron ≤130 MB, helper ≤60 MB. Measured 2026-10-29 at 136×42 with the panel and tray installed: 99 MB private summed across 5 processes (main 33.4, renderer 28.1, gpu 15.0, utility 11.7, helper 10.8), 0.2% CPU idle. | Both under cap. Re-measure after the shelf, timer, and fullscreen hooks land. Over either cap → stop and report before building more. |
| Rest margins | Fixed 2026-11-04: `setShape` clips the window to the visible pill plus a 6px halo, so margin clicks reach the desktop. | Keep the shape in sync with pill width/height whenever a state changes. |
| DOM churn during drag | Replacing the pill title node on every drag event turned each `dragover` into a fresh `dragenter`; real OS drops never fired. Fixed 2026-11-07 by updating the title in place. | Check 16 holds a real Explorer→pill drop; do not replace the node under the cursor during a drag. |
| `Alt+Space` steal | Registering it kills the system window menu for every app while Beam runs | Accepted by user 2026-10-27 |
| Multi-file drag-out | Solved 2026-10-29: helper OLE drag spun at 100% CPU; Electron's `webContents.startDrag` with a `files` array is the path | Prove with a real drop into Explorer at 3.4 |
| SMTC on some players | Some apps publish partial metadata, no artwork | Show text without art, never crash |
| Helper death | Fixed 2026-11-07: requests reject after 8s, a dead helper is restarted up to 3 times in 60s, and a spawn error resets the child. Paste after a restart is still unproven. | Checks 26 and 27 hold the restart and timeout; 8.1 still needs a paste-after-restart proof. |
| Timer ownership | Fixed 2026-11-07 (R3): the deadline, tick push, and one-shot completion live in `src/main/timer.ts`; the renderer only displays snapshots. Checks 28–29 prove replace, done face, chime, notification, and completion behind fullscreen. | Keep every new alert path behind that engine; never reintroduce a renderer clock. |
| Packaging | `npm run dist` skips prerequisite builds; the release folder is incomplete and no exe is published. | Build main, renderer, preload, and the helper first, verify `app.asar` + `extraResources`, test on a clean profile, then publish. |
| Doc drift | README/TASKS/ARCHITECTURE had stale claims about built features. | Keep the 2026-11-07 audit notes current; tick a box only after a green verify. |
