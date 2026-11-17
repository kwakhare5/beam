# beam. — build-in-public post bank

Built 2026-11-17 from JOURNAL.md (work cards 1–159), git history, and the v0.1.1 release.
28 copy-ready X posts. Every claim comes from a journal card or a measured run; every metric
keeps its real context. Each post is under 280 characters (checked mechanically).

How to use
- One post per day at most. Silence beats filler.
- Attach the proof named in each post. Where it says "capture needed", take it before posting.
- Links go in the first reply only, and only where the post gives a reason to download.
  Release: https://github.com/kwakhare5/beam/releases/tag/v0.1.1
  Site:    https://beamm.vercel.app
- Never claim users, downloads, stars, or feedback — none are evidenced yet.
- End-of-post limit lines are part of the post. Do not cut them to save characters.

Already drafted this session and unchanged: posts 1, 2, 3.


=== POST 1 — the honest size story ===
source: JOURNAL 159 · v0.1.1 release · 140,818,841-byte installer, 0.33 MB app code
attach: screenshot of the live FAQ "How big is it?" answer on beamm.vercel.app (capture needed)
limit line: unsigned — SmartScreen warns once
first reply (optional): https://beamm.vercel.app
score: 9/10

[1]
my app's own code is 0.33 MB. the download is 141 MB.

the rest is a browser engine and a windows helper runtime. i cut every locale except english and put the real numbers in the FAQ instead of hiding them.

still unsigned — smartscreen warns once.
[/1]


=== POST 2 — the compression trade ===
source: JOURNAL 159 · measured working sets 48.2 MB vs 110.7 MB · 60 MB helper budget
attach: fresh Get-Process working-set crop from .scratch/verify/installer/measure.ps1 (capture needed)
limit line: download stays 141 MB; only a smaller runtime fixes it
score: 9/10

[2]
i compressed the helper to shrink the download. idle RAM went 48.2 → 110.7 MB, over my 60 MB budget.

.net single-file decompresses into memory at launch. reverted. the installer already compressed it — the download never shrank anyway.

still 141 MB to download.
[/2]


=== POST 3 — it installs like a real app now ===
source: JOURNAL 158–159 · v0.1.1 · first-run panel proof
attach: 5–15s silent recording of install → first launch; fallback .scratch/verify/installer/shot-firstrun-panel.png
limit line: windows 11 only; other display scales untested
first reply: https://github.com/kwakhare5/beam/releases/tag/v0.1.1 and ask if the first screen makes sense
score: 8/10 (9 with the recording)

[3]
first launch used to show just a 78×30 pill — no hint of the app behind it.

v0.1.1 installs like a normal windows app: start menu, desktop, apps list. and first launch opens the panel once, so you see the whole thing.

windows 11 only; other display scales untested.
[/3]


=== POST 4 — the installed app that exited on launch ===
source: JOURNAL 158 · stray dev instance held the single-instance lock
attach: none needed (text story); screenshot of the first-run panel works as support
limit line: the trap is structural — dev and packaged builds share one folder name
score: 8/10

[4]
my freshly installed app exited with code 0 instead of opening. no window, no error.

cause: a leftover dev copy held the single-instance lock — %APPDATA%\beam and %APPDATA%\Beam are the same folder on windows.

killed it. the installed app opened straight to its first-run panel.
[/4]


=== POST 5 — measure the riskiest assumption first ===
source: JOURNAL 18 · the RAM gate moved ahead of the native helper spike
attach: none needed; the follow-up numbers live in post 6
limit line: the gate failed — the story is the ordering, not the result
score: 8/10

[5]
the riskiest part of my app was a small c# helper wired into windows audio. the memory budget check sat after it in my task list.

i moved the check to the front. if the empty app couldn't fit in 130 MB, the plan was wrong.

it failed. better to know on day two than day forty.
[/5]


=== POST 6 — the gpu costs 53 MB ===
source: JOURNAL 26–27 · 139.2 MB peak on, 86.4/86.5 MB peak off, two 60s runs
attach: screenshot of the measure output (capture needed; rerun measure.ps1-era script or document numbers)
limit line: no gpu compositing — every frame is on the cpu
score: 9/10

[6]
my desktop app measured 139.2 MB at idle — 9.2 MB over the 130 MB budget i set before writing any feature.

turning the gpu off brought it to 86.4 MB across two 60-second runs.

the cost is real: no gpu compositing. every frame is drawn on the cpu.
[/6]


=== POST 7 — the window that grew while dragging ===
source: JOURNAL 75 · setPosition re-rounding, height 42 → 141, fixed by setBounds
attach: none (before numbers only); the gate PASS line for move is the proof of fix
limit line: windows still returns 45 when i ask for 42
score: 9/10

[7]
windows re-rounded my transparent window on every pointer move while dragging. the height climbed from 42 to 141 during one drag.

fix: never move with setposition. pin the size with setbounds on every move.

it stays put now. windows still returns 45 when i ask for 42.
[/7]


=== POST 8 — windows pads the height ===
source: JOURNAL 96 · 44 DIP content height, pill pinned to 30px
attach: none needed
limit line: the extra dip is still there — the bar just stops trusting it
score: 8/10

[8]
asked windows for a 30px-tall floating bar. got a 44px content box back.

frameless transparent windows get dpi padding, so my bar rendered 32px tall while every doc said 30.

fix: pin the bar to 30px inside the window and stop trusting the claimed height.
[/8]


=== POST 9 — delete the drag helper ===
source: JOURNAL 65 · helper DoDragDrop: 99.8s CPU, zero replies, no files moved; replaced by Electron startDrag
attach: none (history); the working drag-out PASS line is the follow-up
limit line: the replacement only drops files — folders untested in the 3.4 proof
score: 9/10

[9]
i built file drag-out inside my c# helper. it grabbed the mouse, spun at 100% cpu for 99.8 seconds, and never dropped a file.

deleted the whole path. electron starts a real os drag in one call, and explorer accepts it.

the feature shipped because one layer stopped doing it.
[/9]


=== POST 10 — maximized is not fullscreen ===
source: JOURNAL 77 · DWM frame bounds vs monitor, 2px tolerance; live borderless-window probe
attach: none (a real video player was never used)
limit line: geometry stood in for a real player
score: 9/10

[10]
a maximized window covers 1920×1020 of a 1920×1080 screen. a naive fullscreen check would hide my bar all day.

so: compare dwm frame bounds to the monitor, ignore maximized, cloaked and shell windows.

proved with a real borderless window, not a real video player.
[/10]


=== POST 11 — files on the clipboard, not text ===
source: JOURNAL 59 · CF_HDROP writer in the helper; verify pasted 3 real files
attach: none needed
limit line: folders were never copied
score: 8/10

[11]
"copy" usually means text. i needed explorer to paste actual files.

the helper writes the clipboard by hand: a dropfiles header and a double-null utf-16 path list.

3 real files went in, pasted into explorer, and stayed after the helper exited. folders untested.
[/11]


=== POST 12 — spotify's gap between tracks ===
source: JOURNAL 84 · null SMTC session held 500ms
attach: none (skip test number is in journal)
limit line: 500ms is a guess for other players
score: 8/10

[12]
spotify publishes a null media session between tracks. my bar blinked to idle on every skip.

fix: when the session goes null, hold the last track for 500ms before showing idle.

no more blink. whether other players gap longer than 500ms is unmeasured.
[/12]


=== POST 13 — the file path api is gone ===
source: JOURNAL 79 · File.path removed in Electron 45; webUtils.getPathForFile via preload
attach: none needed
limit line: drops onto the visible margin still count as app drops... shelf click-through was fixed later; keep to folders
score: 8/10

[13]
dropped a file into my app. electron gives the renderer the bytes, not where the file lives — the old path api is gone.

one call restores it: webutils.getpathforfile, handed over by a sandboxed preload.

3 real files, real paths, shelf stays in memory only.
[/13]


=== POST 14 — a countdown that survives hiding ===
source: JOURNAL 118 · main-owned deadline, check 29 completion behind a real fullscreen window
attach: none (chime ack, not audio recording)
limit line: machine sleep untested
score: 9/10

[14]
a countdown that decrements once a second lies after sleep or a throttled tab.

mine stores a deadline timestamp and computes what's left. hidden window, fullscreen game — doesn't matter.

finished behind a real fullscreen window with one chime. machine sleep still untested.
[/14]


=== POST 15 — quit that didn't quit ===
source: JOURNAL 155 · 3 orphaned processes, will-quit re-entry, 2s watchdog + app.exit(0)
attach: .scratch/verify/stall-2026-11-15/ run folder (exists)
limit line: the watchdog line has never fired in normal quits
score: 9/10

[15]
quitting my app with the helper process already dead left 3 processes running and no window. reproduced twice.

the quit handler was re-entering itself.

fixed with a 2s watchdog that ends the process if the helper won't stop. 0 processes after quit now.
[/15]


=== POST 16 — the hung helper ===
source: JOURNAL 117 · 8s rejection measured at 8010ms; restart max 3 per 60s
attach: none needed
limit line: a wedged helper is replaced, not diagnosed
score: 8/10

[16]
a small windows helper talks to my app over stdin. when it hangs, copy waits forever.

now every request gets an answer or an 8-second rejection, and a crashed helper restarts — at most 3 times a minute.

a deliberately hung helper was rejected in 8010ms.
[/16]


=== POST 17 — one rule instead of a width table ===
source: JOURNAL 132–134 · measured: idle 78, files 80–88, music 69–108, timer 122, done 108
attach: screenshot of the canonical preview capsule row (capture needed: npm run ui)
limit line: measured on one display, at 125%
score: 9/10

[17]
every state of my floating bar follows one rule: hug the content, equal 8px padding, star and label centered as one unit.

idle 78px. music 69–108. timer 122. done 108.

earlier passes had width tables. the rule outlived them. measured on one display, at 125%.
[/17]


=== POST 18 — controls that don't move ===
source: JOURNAL 134 · 126×30 hover, 108px row of 4×24 controls, identical coordinates
attach: 5–15s silent recording of hover; fallback is the gate's click proof
limit line: proven by measured coordinates and a real click, not a recording
score: 9/10

[18]
hovering the music bar reveals prev, play, next and panel without moving anything.

the four controls sit at the same coordinates before and after the bar grows — my first version put them under a bar that moved.

only the shell widens; art and title fade out over 120ms.
[/18]


=== POST 19 — the 26px quiet state ===
source: JOURNAL 123, 128 · 10s idle → 26×26, 37px wake, 2s return; one check proves all three
attach: 5–15s recording of idle → quiet → wake
limit line: radius measured on one 125% display
score: 9/10

[19]
10 seconds idle and the bar shrinks to a 26×26 star. a cursor within 37px wakes it. it quiets again 2 seconds after you leave.

one check proves the shrink, the wake, and the return in a single run.

the 37px radius was measured on one display, at 125%.
[/19]


=== POST 20 — the margins that ate clicks ===
source: JOURNAL 88–89 · 16px margin dismiss, setShape clip to pill + 6px halo
attach: none needed
limit line: a 6px ring still belongs to the app
score: 8/10

[20]
my floating window is 136px wide for a 78px bar. the transparent margins looked harmless and swallowed desktop clicks.

now the window is clipped to the bar plus a 6px halo, so clicks outside reach the desktop.

a 6px ring still belongs to beam.
[/20]


=== POST 21 — the demo is the real code ===
source: JOURNAL 100, 156 · site demo imports src/renderer/ui + styles.css
attach: screenshot of the demo and the app side by side
limit line: desktop-only features are labelled, not faked
score: 9/10

[21]
my website demo isn't a mock. it imports the app's own ui modules and stylesheet and runs the same renderer code.

change the pill in the app and the demo changes with it.

anything that needs windows — clipboard, drag-out, hotkey — can't run in a browser and says so.
[/21]


=== POST 22 — the drift guard ===
source: JOURNAL 156 · npm run ui:check golden: 10 pill states, 5 tabs
attach: terminal crop of the PASS line
limit line: the guard covers markup, not behavior
score: 8/10

[22]
three surfaces show the same pill: the app, a design preview, and the website demo.

one script renders 10 pill states and 5 tabs and diffs them against a saved golden file. if they drift, it fails.

the guard catches markup drift; behavior still needs its own proof.
[/22]


=== POST 23 — the first click that did nothing ===
source: JOURNAL 137 · demo re-rendered the pill on pointerdown when enabling sound
attach: none needed
limit line: any other re-render-on-event path could hold the same bug
score: 9/10

[23]
the first click on my site demo did nothing. the second worked.

cause: starting sound re-rendered the whole pill on pointerdown — the pressed button was gone before the click ended.

fix: skip the render when markup is unchanged. other re-render paths deserve the same suspicion.
[/23]


=== POST 24 — the dialog your tests can't see ===
source: JOURNAL 154 · native #32770 dialog owned by the Electron pid
attach: .scratch/verify/pick-2026-11-15/shot-files-picked.png (exists)
limit line: the check needs a real desktop
score: 8/10

[24]
my "add files" check kept failing while the button worked fine.

windows file dialogs are native windows with no title, so window-title automation never sees them.

the check now finds the dialog window owned by the app's process. proof: one 7-byte file added.
[/24]


=== POST 25 — the 239 MB deploy ===
source: JOURNAL 152 · .vercelignore; deploy ready in 18s
attach: none needed
limit line: site and app share one repo, so every push uploads more than needed
score: 7/10

[25]
my website deploy uploaded 239 MB — including windows installers the site never uses — and failed twice.

one .vercelignore later: installer, native build, node_modules excluded.

deploy ready in 18s.
[/25]


=== POST 26 — social card from real html ===
source: JOURNAL 129 · real pill markup at exact 2x, 216×60
attach: the OG image itself
limit line: it's a static render
score: 7/10

[26]
rebuilt the social preview image from the real pill's html and css at an exact 2x, instead of a redrawn mock.

the card now shows the same bar people download.

it's still a static render — the live one is in the app.
[/26]


=== POST 27 — five settings, one real save ===
source: JOURNAL 122 · check 30: theme, volume, chord, startup written and restored
attach: none needed
limit line: first-run onboarding and a tray checkbox aren't built
score: 8/10

[27]
rebound the global shortcut, switched theme, moved volume, wrote a startup entry, restarted the app.

all five values came back. the registry, not a cached checkbox, is the boot truth.

first-run onboarding and the tray checkbox aren't built.
[/27]


=== POST 28 — retries that don't lie ===
source: JOURNAL 147–148 · real-mouse and real-drag gestures retry once, assertions identical
attach: none needed
limit line: a retried gesture is still a real gesture
score: 8/10

[28]
my app tests use a real mouse and a real explorer drag. sometimes the desktop eats the gesture.

the retry rule: replay the whole gesture once, keep every assertion identical, log that it retried.

a missed click is noise. a weakened check is a lie.
[/28]


Skipped on purpose (no honest single tension, or no artifact):
- journal cards 1–15: mascot exploration and brand lab. real work, but the tension was taste,
  rejected variants were deleted on request, and no proof artifacts remain.
- journal cards 16–51: architecture and UI geometry experiments mostly superseded by the
  final capsule. the surviving decision is post 17.
- docs-sync and cleanup passes (74, 90, 114, 125, 126, 132–150): inventories, not stories.
- site copy passes (97–113, 153–159): real work, but the user-visible result is the site
  itself; post 1 covers the one outsider-relevant fact.
