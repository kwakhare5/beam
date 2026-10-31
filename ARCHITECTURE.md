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

Implemented: Electron shell with single-instance lock, the 136×42 window anchored above the taskbar with the 94×30 idle capsule, tray, panel open/collapse at 452×316 with a ~150ms transform, pointer-captured window drag with a saved position (`settings.ts`), the idle star dim asserted from computed style, hide-on-fullscreen with tray restore, a file drop shelf (paths only, deduped, 50 cap, pill count), split UI modules/styles, the canonical preview, sixteen `verify.ps1` checks (including a real-mouse drag → restart → reset run and a real borderless fullscreen window), and `measure.ps1`.

Built in the helper: stdio client, SMTC read with PNG artwork, CF_HDROP clipboard, fullscreen detection, ping.

Still target: `window.ts` (geometry refactor), `hotkey.ts`, `src/shared/`, the timer owner, the shelf, the chime, and every tab's live wiring. Present-tense sections below describe that target until those tasks land.

---

## 2. Parts & Responsibilities

| Part | Runs as | Owns | Never does |
|---|---|---|---|
| Electron main | Node process | Window geometry, tray, global hotkey, settings file, helper lifecycle, the shelf | Draw UI, touch Win32 directly |
| Renderer | Chromium window | Pill, 5 tabs, all visuals | Read files from disk, call Win32, keep the shelf |
| Shelf (main memory) | Array in the main process | Dropped paths, deduped case-insensitively, capped at 50 | Copy or move files, touch disk, survive a restart |
| BeamBridge.exe | Windowless C# child | SMTC read, clipboard, fullscreen detection | Draw anything, own state long-term, run drag-out (app-owned) |
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
│   │   ├── index.ts          app lifecycle, single-instance lock, pill/panel geometry, window drag
│   │   ├── window.ts         (planned) geometry refactor: pill/panel geometry, anchoring, drag, close rules
│   │   ├── tray.ts           tray icon + menu (Settings stays disabled until 7.1)
│   │   ├── hotkey.ts         (planned) Alt+Space register, fallback, rebind
│   │   ├── settings.ts       read/write settings.json, defaults, versioned shape
│   │   └── bridge.ts         spawn helper + JSON-lines client (ping and files.copy built; music commands and restart policy pending)
│   ├── preload/index.ts      contextBridge surface (the only door)
│   ├── renderer/
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
| `music.toggle` | — | ok |
| `music.next` / `music.prev` | — | ok |
| `files.copy` | `paths: string[]` | ok / error |
| `fullscreen.get` | — | `{ active, rect }` |
| `ping` | — | `{ pong, version }` |

Events (helper → main), unsolicited, no `id`:

| evt | payload |
|---|---|
| `music.changed` | `{ app, title, artist, album, artPath, playing, positionMs, durationMs }` or `null`; players that publish no timeline may omit the last two |
| `fullscreen.changed` | `{ active }` |

Rules: helper never prints anything else to stdout (stderr is for logs). Any malformed line is dropped and logged. Main restarts the helper on exit, max 3 times in 60s, then shows a tray warning (not built yet). The helper exits on stdin EOF, so a killed main cannot orphan it; on quit, main closes stdin and waits up to 1.5s for that exit before killing, so the art folder is wiped.

**Drag-out never goes through the helper.** 0.4c tried `DoDragDrop` on a dedicated STA thread: Windows kept the mouse capture with Chromium's window, so the drag loop spun at 100% CPU and never dropped. The code was deleted 2026-10-29. The renderer starts the drag from its own `dragstart` gesture and main calls `webContents.startDrag({ file, files, icon })`, which uses Chromium's native drag source and accepts multiple paths.

**Artwork:** the helper saves the current thumbnail to `%TEMP%\Beam\art\<hash>.png`, overwrites it per track, and wipes the folder on start and quit. This is the one allowed disk write; the file shelf stays paths-only in memory.

**Clipboard:** Windows keeps `CF_HDROP` alive only while the owning process lives. The helper owns the clipboard, so a helper crash breaks paste until it restarts. Accepted; covered by a restart test in task 8.1. Built at 0.4b: `DROPFILES` + double-null UTF-16 paths in moveable global memory, five clipboard-open retries; data is rendered immediately, so it survives the helper exiting.

**Fullscreen:** detection listens to foreground changes, `EVENT_OBJECT_LOCATIONCHANGE` on the foreground window, and a 1s fallback poll. Foreground events alone miss a video that goes fullscreen inside an already-focused window. Built at 0.5 in `native/BeamBridge/FullscreenWatcher.cs` on its own message-loop thread: both hooks are out-of-context, the foreground window's DWM frame bounds are compared to its monitor with a 2px tolerance, and maximized, cloaked, shell, and own-process windows are ignored so a maximized window never counts. It emits `fullscreen.changed { active }` on a flip only, and answers `fullscreen.get` from a live probe. Proved 2026-10-31 with a real borderless window grown from 600×400 to 1920×1080 and back: `active:true` then `false` with the same foreground handle throughout (verify check 14).

---

## 5. Seam B — Main ⇄ Renderer (IPC)

All channels prefixed `beam:`. Renderer can call, main can push. Built channels are typed inline in `src/preload/index.ts`; `src/shared/ipc.ts` (planned) will own the types when the rest of the contract lands.

| Direction | Channel | Purpose | State |
|---|---|---|---|
| renderer → main | `beam:panel:request-open` | open the panel from a pill click | built |
| renderer → main | `beam:panel:collapsed` | panel finished closing; window returns to 136×42 | built |
| renderer → main | `beam:panel:timing` | measured open duration + reduced-motion flag | built |
| renderer → main | `beam:window:drag-start` / `drag-move` / `drag-end` | pointer-captured window drag; main moves the window with `setBounds`, clamps it to the display work area, and saves the position | built |
| main → renderer | `beam:panel:open` | start the open animation, carrying the shelf rows stat'd from disk | built |
| main → renderer | `beam:panel:dismiss` | close on blur or tray toggle | built |
| renderer → main | `beam:drag-test` / `beam:drag-test:enabled` | drag-gesture test hook (`BEAM_DRAG_TEST=1`) | built |
| renderer → main | `beam:music:command` | toggle / next / prev | planned |
| renderer → main | `beam:files:add` | paths from a drop; main dedupes, caps at 50, replies `{ count, accepted, truncated, limit }` | built |
| renderer → main | `beam:files:copy` | copy one or all; payload `{ paths, source }`, main accepts only paths already on the shelf and calls `files.copy` | built |
| renderer → main | `beam:files:drag` | start drag-out | planned |
| renderer → main | `beam:timer:start/stop` | presets or custom | planned |
| renderer → main | `beam:settings:get/set` | settings screen | planned |
| main → renderer | `beam:music:state` | pushed on `music.changed` | planned |
| main → renderer | `beam:timer:tick` | seconds left, pushed by main (the timer owner) | planned |

Fullscreen hide is main-only: main calls `win.hide()` / `win.showInactive()` itself and never messages the renderer for it.

**Drops:** the renderer accepts file drops on the window, reads each real path with `webUtils.getPathForFile` (exposed through the preload; Electron 45 removed `File.path`), and sends the list over `beam:files:add`. Main owns the shelf as an in-memory string array: duplicates are skipped case-insensitively, the 50th entry is the cap, and the reply carries `{ count, accepted, truncated, limit }`. The renderer prints `N files` in the pill and shows `Max 50` for 2.4s when a drop was truncated. Nothing is copied or cached, and the shelf dies with the process. `BEAM_DROP_TEST=1` drives real drags through the DevTools protocol from main.

**Copy:** every panel open stats each shelf path in main (name, byte size, folder/file, missing after a failed stat) and sends the rows with `beam:panel:open`; the renderer re-renders the Files tab from that payload and formats sizes. A row's 24px copy button or Copy All sends `{ paths, source }` over `beam:files:copy`; main maps each path back to its exact shelf entry, rejecting anything else, and calls `files.copy`. The renderer flips the button to a check (`Copied` on Copy All) for ~1.5s. `BEAM_COPY_TEST=1` drops 3 real files, opens the Files tab, clicks the first row's copy then Copy All; verify check 17 reads `CF_HDROP` after each step and pastes with Ctrl+V into a real Explorer folder.

---

## 6. Key Data Flows

**Music**
```
Spotify changes track
→ Windows raises SMTC event
→ helper fires music.changed {title, artist, artPath}
→ main forwards beam:music:state
→ renderer swaps pill text + art
```

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
renderer sends beam:timer:start {ms} → main stores deadline = now + ms
→ every 1s main pushes beam:timer:tick {secondsLeft} → renderer prints it
→ at 0: main plays chime.wav and fires the native Notification; the pill shows the done digits in gold
→ hidden or fullscreen: same path, because the renderer never owns the clock
```

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
| 2026-10-27 | Timer deadline is owned by main, not the renderer | Chromium throttles hidden windows; the alarm must fire while the pill is hidden |
| 2026-10-27 | (superseded 2026-10-29: helper drag deleted) `files.drag` runs on a dedicated STA thread in the helper | A blocking `DoDragDrop` on the stdio loop would freeze SMTC reads for the whole drag |
| 2026-10-27 | Budget split: Electron ≤130 MB, helper ≤60 MB, total always reported | One combined number hides which side regressed |
| 2026-10-27 | Single instance: a second launch wakes the existing pill and exits | Two pills would fight over the hotkey, tray icon, and settings file |
| 2026-10-27 | settings.json carries `version: 1`; unknown keys are preserved | Migration needs something to compare against, and a downgrade must not wipe settings |
| 2026-10-27 | `verify.ps1` is created at task 0.1 and grows every phase | Phases 0–7 would otherwise have no runnable proof, which breaks the project's own done rule |
| 2026-10-27 | One window size in scaled units; Chromium handles DPI | Separate layouts per scale are work with no gain; verify at 100/125/150 instead |
| 2026-10-27 | Fullscreen detection = foreground change + `EVENT_OBJECT_LOCATIONCHANGE` + 1s poll | A video going fullscreen in an already-focused window fires no foreground event |
| 2026-10-27 | Artwork lives in `%TEMP%\Beam\art\`, overwritten per track, wiped on quit | The shelf rule bans file copies, not a thumbnail cache; leaving it unbounded is worse |
| 2026-10-27 | Clipboard stays helper-owned; helper crash breaks paste until restart | Moving `CF_HDROP` ownership to main means reimplementing the same thing; test the restart instead |
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
| 2026-10-28 | Files rows expose copy and remove on hover; the empty state is a dashed drop well | Task 3.3 already promised per-row copy, and the core action needs a visible target |
| 2026-10-28 | Settings has five rows including Reset position, with real controls and dividers instead of a row gap | Read-only badges looked interactive; five 44px rows only fit 242px without the gap |
| 2026-10-28 | Type scale 11/12/13/15/40 and spacing 4/8/12/16 | Five label sizes and three body rhythms made the panel look assembled from different screens |
| 2026-10-31 | Window drag is renderer pointer capture plus main `setBounds` with the window size pinned | `setPosition` let Windows re-round the transparent window's height on every pointer move (42 grew to 141 in the first test); the renderer's 4px threshold keeps a plain click opening the panel |
| 2026-10-31 | The saved position is the outer top-left plus `displayId`, restored only when that rect still intersects a current display | A monitor that was unplugged must not leave the pill offscreen; the primary taskbar anchor is the fallback, and Reset Position clears the value |

UI decisions: ADR-0001 (component boundaries), ADR-0002 (original mascot), ADR-0003 (window, capsule, and panel sizes), ADR-0004 (vanilla shadcn-style), ADR-0005 (capsule interaction), ADR-0006 (landscape panel), ADR-0007 (capsule-to-panel interaction), ADR-0008 (content dynamics), ADR-0009 (state identity, panel completeness, and scale), ADR-0010 (capsule artwork, dot language, and panel clarity).

## 8. Status

Phase 0: 0.1 built, 0.2 measured and passed, 0.3 built (ping/pong), 0.4a built (live SMTC events, PNG art), 0.4b built (CF_HDROP clipboard), 0.5 built (fullscreen detection; verify drives a real borderless window). 0.4c replaced by 3.4. 1.1 built (`placeWindow` anchors above the taskbar), 1.2 built (verify guards the foreground), 1.6 built (tray), 1.3 built (panel open/collapse; timing measured from `transitionrun`), 1.4 built (drag + `settings.ts`; verify drags with a real mouse, restarts, and resets), 1.5 built (idle star 0.7 asserted from computed style), 1.9 built (hide on fullscreen, tray restores; verify check 15), 3.1 built (drop shelf, paths in main memory, 50 cap, pill count; verify check 16), 3.3 built (live Files rows on open, row copy and Copy All with `Copied` feedback, Explorer paste; verify check 17). Next: 3.4, then 3.2 and 3.5.

Open: the transparent rest margins still swallow clicks (no task owns it); multi-monitor restore and 100/150% scaling are unproven; the helper restart policy, hotkey, timer, and the four placeholder tabs are unbuilt; row remove is drawn but inert until 3.5.

---

## 9. Known Risks

| Risk | Honest read | Mitigation |
|---|---|---|
| RAM budget | Electron ≤130 MB, helper ≤60 MB. Measured 2026-10-29 at 136×42 with the panel and tray installed: 99 MB private summed across 5 processes (main 33.4, renderer 28.1, gpu 15.0, utility 11.7, helper 10.8), 0.2% CPU idle. | Both under cap. Re-measure after the shelf, timer, and fullscreen hooks land. Over either cap → stop and report before building more. |
| Rest margins | The window stays 136 wide for every state, so the 94px rest pill leaves 21px of transparent margin each side that still receives clicks; hover states leave 4px. Still unfixed after 1.3 and owned by no task. | Forward clicks through the empty margin with `setIgnoreMouseEvents` + a renderer hit test, or shrink the window per state; both need a decision. |
| `Alt+Space` steal | Registering it kills the system window menu for every app while Beam runs | Accepted by user 2026-10-27 |
| Multi-file drag-out | Solved 2026-10-29: helper OLE drag spun at 100% CPU; Electron's `webContents.startDrag` with a `files` array is the path | Prove with a real drop into Explorer at 3.4 |
| SMTC on some players | Some apps publish partial metadata, no artwork | Show text without art, never crash |
