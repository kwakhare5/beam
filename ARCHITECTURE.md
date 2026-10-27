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
                    │  pill + 4 tabs │   │  C# .NET, no window  │
                    └────────────────┘   └────────┬─────────────┘
                                                  │ Win32 / WinRT
                                        ┌─────────▼──────────┐
                                        │ Windows: SMTC,     │
                                        │ clipboard, WinEvent│
                                        └────────────────────┘
```

No network. No database. No server. Four parts, three seams.

---

## 2. Parts & Responsibilities

| Part | Runs as | Owns | Never does |
|---|---|---|---|
| Electron main | Node process | Window geometry, tray, global hotkey, settings file, helper lifecycle | Draw UI, touch Win32 directly |
| Renderer | Chromium window | Pill, 4 tabs, all visuals, mascot animation | Read files from disk, call Win32 |
| BeamBridge.exe | Windowless C# child | SMTC read/write, clipboard, drag-out, fullscreen detection | Draw anything, own state long-term |
| settings.json | File in `%APPDATA%\Beam\` | Position, hotkey, startup flag, chime volume, schema `version` | Store temp data |

Renderer is untrusted by design: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. It gets one narrow preload API and nothing else.

---

## 3. Target File Tree

```
D:\Beam
├── package.json              exact-pinned deps
├── tsconfig.json
├── vite.config.ts
├── electron-builder.yml
├── verify.ps1                the one proof command
├── GLOSSARY.md               UI vocabulary
├── docs/adr/                 0001–0005 UI decisions
├── PRD.md  DESIGN.md  ARCHITECTURE.md  TASKS.md  AGENTS.md  JOURNAL.md
├── scripts/generate-icons.mjs
├── src/
│   ├── main/
│   │   ├── index.ts          app lifecycle, single-instance lock
│   │   ├── window.ts         pill/panel geometry, anchoring, drag, close rules
│   │   ├── tray.ts           tray icon + menu
│   │   ├── hotkey.ts         Alt+Space register, fallback, rebind
│   │   ├── settings.ts       read/write settings.json, defaults, versioned migration
│   │   └── bridge.ts         spawn helper, JSON-lines client, restart on crash
│   ├── preload/index.ts      contextBridge surface (the only door)
│   ├── renderer/
│   │   ├── ui/
│   │   │   ├── index.ts      public view API
│   │   │   ├── pill.ts       one capsule, state data
│   │   │   ├── panel.ts      one panel shell + tab host
│   │   │   ├── panel-body.ts tabpanel wrapper
│   │   │   ├── icons.ts      Lucide sprite + icon()
│   │   │   ├── icons.generated.ts
│   │   │   ├── mascots.ts    original mascot map
│   │   │   ├── html.ts       escape helper
│   │   │   ├── types.ts      Tab
│   │   │   └── tabs/         music, files, timer, calendar, settings
│   │   ├── styles.css        CSS entry (@import)
│   │   ├── styles/           tokens, base, pill, panel, controls, tabs
│   │   └── renderer.ts
│   └── shared/
│       ├── ipc.ts            channel names + payload types
│       └── bridge.ts         helper command/event types
├── native/BeamBridge/        C# .NET console project
├── assets/
│   ├── mascot/*.svg          shipped
│   ├── fonts/                InterVariable.woff2 + OFL.txt
│   ├── tray.ico
│   └── chime.wav             generated, committed
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
| `files.drag` | `paths: string[]` | ok (blocks until drop ends) |
| `fullscreen.get` | — | `{ active, rect }` |
| `ping` | — | `{ pong, version }` |

Events (helper → main), unsolicited, no `id`:

| evt | payload |
|---|---|
| `music.changed` | `{ app, title, artist, album, artPath, playing }` or `null` |
| `fullscreen.changed` | `{ active }` |

Rules: helper never prints anything else to stdout (stderr is for logs). Any malformed line is dropped and logged. Main restarts the helper on exit, max 3 times in 60s, then shows a tray warning. `files.drag` runs on its own STA thread, so a held drag never blocks `music.get` or the SMTC event stream.

**Artwork:** the helper saves the current thumbnail to `%TEMP%\Beam\art\<hash>.png`, overwrites it per track, and wipes the folder on quit. This is the one allowed disk write; the file shelf stays paths-only in memory.

**Clipboard:** Windows keeps `CF_HDROP` alive only while the owning process lives. The helper owns the clipboard, so a helper crash breaks paste until it restarts. Accepted; covered by a restart test in task 8.1.

**Fullscreen:** detection listens to foreground changes, `EVENT_OBJECT_LOCATIONCHANGE` on the foreground window, and a 1s fallback poll. Foreground events alone miss a video that goes fullscreen inside an already-focused window.

---

## 5. Seam B — Main ⇄ Renderer (IPC)

All channels prefixed `beam:`. Renderer can call, main can push. Payloads are typed in `src/shared/ipc.ts`.

| Direction | Channel | Purpose |
|---|---|---|
| renderer → main | `beam:panel:resize` | expand/collapse height |
| renderer → main | `beam:panel:close` | Esc / outside click |
| renderer → main | `beam:music:command` | toggle / next / prev |
| renderer → main | `beam:files:add` | paths from a drop |
| renderer → main | `beam:files:copy` | copy one or all |
| renderer → main | `beam:files:drag` | start drag-out |
| renderer → main | `beam:timer:start/stop` | presets or custom |
| renderer → main | `beam:settings:get/set` | settings screen |
| main → renderer | `beam:music:state` | pushed on `music.changed` |
| main → renderer | `beam:fullscreen` | hide the window |
| main → renderer | `beam:timer:tick` | seconds left, pushed by main (the timer owner) |

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

**Timer**
```
renderer sends beam:timer:start {ms} → main stores deadline = now + ms
→ every 1s main pushes beam:timer:tick {secondsLeft} → renderer prints it
→ at 0: main plays chime.wav and fires the native Notification, pill pulses
→ hidden or fullscreen: same path, because the renderer never owns the clock
```

**Fullscreen hide**
```
helper's WinEventHook sees a foreground change or the foreground window resize/move
→ compares window rect against monitor bounds → fullscreen.changed
→ a 1s poll catches fullscreen entries that fire no event
→ main hides window; hotkey or tray click restores
```

---

## 7. Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-27 | Native C# helper process, not a pure-TS app | Electron has no SMTC access, no CF_HDROP, no foreign-window fullscreen detection |
| 2026-10-27 | Helper over stdio JSON lines | A local port would read as a network surface |
| 2026-10-27 | Hotkey is `Alt+Space`, rebindable | User choice; 2 keys, matches PRD |
| 2026-10-27 | Fallback `Ctrl+Shift+Space` if registration fails | `Alt+Space` is the Windows window-menu key and another app may own it |
| 2026-10-27 | Fixed-size window; the capsule grows 104→128 on hover | Visible growth inside the window; an OS resize flickers on Windows |
| 2026-10-27 | Last-touched media session wins | Windows can expose Spotify and a browser at once |
| 2026-10-27 | Timer beats music when both are active | PRD's contextual rule needs one winner |
| 2026-10-27 | One timer at a time, no pause, cancel allowed, max 999 min | Smallest thing that satisfies the PRD |
| 2026-10-27 | Shelf cap 50 entries, folders allowed, wiped on quit | In-memory by design, matches PRD |
| 2026-10-27 | Multi-file drag-out goes through the helper | Electron's `startDrag` handles one file only |
| 2026-10-27 | Fonts: Segoe UI for now, bundled font deferred | User has not picked a font yet |
| 2026-10-27 | Chime is a generated 1.5s WAV, committed | No network fetch, no license question |
| 2026-10-27 | Perf budget read as: under 0.5% avg CPU over 60s idle, under 130 MB private bytes summed across processes | "0% CPU" is not measurable as written |
| 2026-10-27 | RAM ceiling raised 100 → 130 MB, PRD amended | User accepted the Electron baseline; 100 MB was not realistic |
| 2026-10-27 | RAM gate runs immediately after scaffolding (task 0.2), before the helper | Failing the budget after the native spike would waste the hardest work; cheapest point to swap stacks is at the empty window |
| 2026-10-27 | Electron is confirmed, WinUI is the fallback if the gate fails | User chose Electron; no rewrite until the 60s measurement says otherwise |
| 2026-10-27 | Hardware acceleration is disabled at startup | GPU on measured 139.2 MB private, over the 130 MB gate; off measured 86.4–86.5 MB with 0.017–0.047% CPU and a verified transparent pill. Re-measure when the panel and helper land. |
| 2026-10-27 | Renderer UI is vanilla shadcn-style, not React shadcn/ui | Avoids React/Tailwind/Radix in a 184×44 utility; keeps the Electron/TS stack. ADR-0004. |
| 2026-10-27 | `Alt+Space` stays the default despite stealing the system window menu | Explicit user choice |
| 2026-10-27 | Helper ships self-contained, no .NET prerequisite | Must run on a fresh Windows install |
| 2026-10-27 | Pill starts on the primary monitor, follows across monitors when dragged, snaps back to primary if that monitor disappears | Prevents an offscreen window |
| 2026-10-27 | Shelf stays in-memory; quitting drops contents; shelf shows a warning while non-empty | Matches PRD; silent loss would be worse |
| 2026-10-27 | Timer deadline is owned by main, not the renderer | Chromium throttles hidden windows; the alarm must fire while the pill is hidden |
| 2026-10-27 | `files.drag` runs on a dedicated STA thread in the helper | A blocking `DoDragDrop` on the stdio loop would freeze SMTC reads for the whole drag |
| 2026-10-27 | Budget split: Electron ≤130 MB, helper ≤60 MB, total always reported | One combined number hides which side regressed |
| 2026-10-27 | Single instance: a second launch wakes the existing pill and exits | Two pills would fight over the hotkey, tray icon, and settings file |
| 2026-10-27 | settings.json carries `version: 1`; unknown keys are preserved | Migration needs something to compare against, and a downgrade must not wipe settings |
| 2026-10-27 | `verify.ps1` is created at task 0.1 and grows every phase | Phases 0–7 would otherwise have no runnable proof, which breaks the project's own done rule |
| 2026-10-27 | One window size in scaled units; Chromium handles DPI | Separate layouts per scale are work with no gain; verify at 100/125/150 instead |
| 2026-10-27 | Fullscreen detection = foreground change + `EVENT_OBJECT_LOCATIONCHANGE` + 1s poll | A video going fullscreen in an already-focused window fires no foreground event |
| 2026-10-27 | Artwork lives in `%TEMP%\Beam\art\`, overwritten per track, wiped on quit | The shelf rule bans file copies, not a thumbnail cache; leaving it unbounded is worse |
| 2026-10-27 | Clipboard stays helper-owned; helper crash breaks paste until restart | Moving `CF_HDROP` ownership to main means reimplementing the same thing; test the restart instead |
| 2026-10-27 | Renderer picks the contextual tab; `beam:tab:force` removed | The renderer already holds music and timer state; a second decider causes flicker |
| 2026-10-27 | App ships light and dark themes, toggled in settings | User request 2026-10-27; light palette is the Notion set, dark palette is the existing glass set |
| 2026-10-27 | Pill is a transparent CSS capsule, not Windows acrylic | Tested 2026-10-27: acrylic paints the window rectangle and ignores the CSS pill radius; at 32px tall the capsule shape matters more than blur |
| 2026-10-27 | Marketing website out of v1 | DESIGN.md specs one; PRD does not ask for one |

UI decisions: ADR-0001 (component boundaries), ADR-0002 (original mascot), ADR-0003 (window, capsule, and panel sizes), ADR-0004 (vanilla shadcn-style), ADR-0005 (capsule interaction).

## 8. Open Decisions

None. All decisions closed 2026-10-27; Phase 0 is unblocked.

---

## 9. Known Risks

| Risk | Honest read | Mitigation |
|---|---|---|
| RAM budget | Electron ≤130 MB and helper ≤60 MB, split by user sign-off. Still unproven. | Measure Electron at task 0.2, helper at 0.3. Over either cap → stop and report before building more. |
| `Alt+Space` steal | Registering it kills the system window menu for every app while Beam runs | Accepted by user 2026-10-27 |
| Multi-file drag-out | Needs a WinForms message pump inside a windowless process, on its own STA thread | Prove at task 0.4c; fall back to copy-only if it fights |
| SMTC on some players | Some apps publish partial metadata, no artwork | Show text without art, never crash |
