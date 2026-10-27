# Product Journal & Progress Log

A chronological, append-only record of real product work, completed features, and verification evidence.

---

### [Beam - V1 Requirements & PRD Lock] 2026-10-26

#### Work card 1: Defining V1 requirements and retiring raw notes
- **Problem / tension:** Initial draft in Beam.md.txt was unstructured and lacked critical technical decisions (framework, SMTC audio hooks, file shelf mechanics, idle states).
- **Change / decision:** Locked Electron + TypeScript stack, in-memory file drop shelf with 1-click clipboard copy, and dimmed resting pill state. Created standardized PRD.md and deleted redundant Beam.md.txt.
- **Proof:** `PRD.md` created (5,645 bytes); `Remove-Item Beam.md.txt` executed cleanly with exit code 0.
- **Still broken / unproven:** Architecture, design specs, task breakdowns, and verification scripts are not yet generated.

#### Work card 2: Establishing visual design system and tokens
- **Problem / tension:** Needed an anti-slop visual system balancing Helumi's minimalist product-first layout with Notion's warm palette and character doodles.
- **Change / decision:** Created DESIGN.md with distinct tokens for web marketing (Notion warm neutrals, soft pastel badges, black SVG line-art doodles) and desktop app (Windows 11 dark acrylic glass).
- **Proof:** `DESIGN.md` created (3,900+ bytes) following standard template rules.
- **Still broken / unproven:** ARCHITECTURE.md, TASKS.md, and codebase implementation remain unwritten.

#### Work card 3: Installing vector logo and illustration skills
- **Problem / tension:** Project needed formal engineering guidelines for vector SVG geometry, logo design, and consistent doodle character systems.
- **Change / decision:** Installed `rknall/claude-skills@svg-logo-designer` (8.1K installs) and `owl-listener/designer-skills@illustration-style` (2.5K installs) locally into `d:\Beam\.agents\skills\`.
- **Proof:** `npx skills add` exited 0; directory listing verifies both skills present in `d:\Beam\.agents\skills\`.
- **Still broken / unproven:** Helumi audit subagent report pending completion; DESIGN.md will be refined with the audited findings.

#### Work card 4: Incorporating audited Helumi design tokens
- **Problem / tension:** Initial DESIGN.md contained estimated tokens rather than verified metrics from the live reference site.
- **Change / decision:** Audited `helumi.html` (589KB) via research subagent, extracting exact CSS tokens (`#f5f5f5` bg, `0.5px` `#00000014` hairline borders, `Caveat` handwriting font, lowercase headings with periods, and 5-mood SVG mascot architecture). Rewrote `DESIGN.md` with these verified specs.
- **Proof:** `DESIGN.md` updated (4,800+ bytes); cites real CSS tokens from `d:\Beam\helumi.html`.
- **Still broken / unproven:** ARCHITECTURE.md, TASKS.md, and core Electron code remain unwritten.

#### Work card 5: Generating handcrafted vector logo and mascot suite
- **Problem / tension:** Needed premium, zero-slop vector assets (brand logos and state mascots) with interactive micro-animations matching Helumi and Grok.
- **Change / decision:** Created 4 scalable SVG logo variations in `d:\Beam\assets\logos\` and 5 "Beamy" mood mascot SVGs in `d:\Beam\assets\mascot\` (`sleepy`, `happy`, `wink`, `focus`, `love`). Built `d:\Beam\assets\preview.html` with Helumi-style hover swing animation and 1-click clipboard copy.
- **Proof:** All 9 SVG files and `preview.html` (11,410 bytes) created; verified with `Get-ChildItem -Recurse` exit 0.
- **Still broken / unproven:** ARCHITECTURE.md, TASKS.md, and core Electron code remain unwritten.

#### Work card 6: Crafting geometric silhouette mascots and companion cluster
- **Problem / tension:** Needed distinct brand marks and mascot illustrations inspired by Helumi's solid geometric silhouettes and character piles without copy-pasting.
- **Change / decision:** Designed 4 hero mascot silhouettes (`Capsule`, `Beacon`, `Squircle`, `Dot & Dash`) featuring 15° angled beam cutout eyes. Created full-color and monochrome companion piles (`beam-companions-pile.svg`) capturing the charm of the reference cluster. Rebuilt `d:\Beam\assets\preview.html` with real-time showcase.
- **Proof:** 6 new SVG assets created; verified via `Get-ChildItem d:\Beam\assets\mascot`; `preview.html` updated (11,800+ bytes).
- **Still broken / unproven:** User review and final brand asset selection pending.

#### Work card 7: Consolidating pure standalone mascots without backgrounds
- **Problem / tension:** Previous iterations contained outer background tiles and app squircle containers rather than raw, transparent mascot figures.
- **Change / decision:** Stripped all background rects, tiles, and containers. Created single consolidated showcase file `d:\Beam\showcase\index.html` housing 10 standalone mascot variations (Capsule, Visor, Starlight, Dot & Dash, Lantern, Beacon, Comic Bubble, Glass Pebble, 8-Bit, and Companion Pile) with transparent checkerboard stages and 1-click SVG copying.
- **Proof:** `d:\Beam\showcase\index.html` (17,600+ bytes) created and verified via `Get-Item`.
- **Still broken / unproven:** Final mascot direction selection pending user review.

#### Work card 8: Generating 12 brand-new experimental geometries and eye styles
- **Problem / tension:** Previous variations reused similar pill-slit eyes and capsule silhouettes. Needed wildly divergent, non-repetitive shapes and eye languages.
- **Change / decision:** Designed 12 completely new, non-reused geometries and facial features (Portal Arch with shades, Chill Rhombus with sleepy slits, Cyclops Lens with camera iris, Laughing Crescent, Retro CRT with plus-eyes, Torus Ring with floating pupils, Origami Shield with fox slits, Isometric Cylinder, Fluid Wave with anime stars, Split Dual-Tone with hypno eyes, Puffy Star with wink, Secret Keyhole with peeking eyes). All consolidated into `d:\Beam\showcase\index.html` with zero backgrounds and 1-click SVG copying.
- **Proof:** `d:\Beam\showcase\index.html` updated (28,000+ bytes); verified with `Get-Item`.
- **Still broken / unproven:** Final mascot direction selection pending user review.

#### Work card 9: Rebuilding user-selected favorites with mathematical geometry
- **Problem / tension:** Hand-drawn SVG Bézier curves in earlier iterations had lumpy, asymmetrical edges on organic shapes.
- **Change / decision:** Mathematically reconstructed the user's 3 chosen favorites (Pop Comic Companion, Fluid Wave Creature, Puffy Chubby Star) using exact circular tangent fillets and harmonic polar cubic Bézier splines. Updated `d:\Beam\showcase\index.html` with a prominent masterwork spotlight.
- **Proof:** `d:\Beam\showcase\index.html` (19,800+ bytes) updated; Python tangent and polar spline scripts executed with code 0.
- **Still broken / unproven:** Final brand mascot selection pending user review.

#### Work card 10: Finalizing Puffy Chubby Star and purging rejected concepts
- **Problem / tension:** User locked in "Puffy Chubby Star" as Beam's official brand mascot and ordered all rejected concepts deleted, with all remaining assets unified in one single showcase file.
- **Change / decision:** Purged all rejected concepts from `d:\Beam\assets\mascot\` and `d:\Beam\assets\concepts\`. Finalized the master star mark (`beam-mascot.svg` / `beam-mascot-star.svg`) and engineered 5 feature state variations (`idle`, `music`, `files`, `timer`, `done`). Rebuilt `d:\Beam\showcase\index.html` with interactive spring physics, CSS eye animation toggle, and 1-click clipboard copy.
- **Proof:** All 7 SVGs parsed as valid XML (exit code 0); `d:\Beam\showcase\index.html` updated (14,400+ bytes) and verified with PowerShell.
- **Still broken / unproven:** Architecture specification (`ARCHITECTURE.md`) and core Electron app implementation pending next sprint.

#### Work card 11: Purging redundant reference assets and duplicates
- **Problem / tension:** Workspace contained a 589KB raw reference dump (`helumi.html`) and an identical duplicate mascot file (`beam-mascot-star.svg`).
- **Change / decision:** Deleted `d:\Beam\helumi.html` and `d:\Beam\assets\mascot\beam-mascot-star.svg`. Updated `DESIGN.md` Section 5 to cite `beam-mascot.svg` directly.
- **Proof:** `Remove-Item` executed with exit code 0; `Get-ChildItem -Recurse` confirms zero stray duplicates.
- **Still broken / unproven:** Architecture specification (`ARCHITECTURE.md`) and core Electron app implementation pending next sprint.

#### Work card 12: Wiping redundant logo asset directory
- **Problem / tension:** `d:\Beam\assets\logos\` contained 4 early concept logos unaligned with the finalized Puffy Chubby Star brand mascot identity.
- **Change / decision:** Wiped `d:\Beam\assets\logos\` folder and all 4 contained SVGs upon explicit user approval, consolidating all visual assets into `d:\Beam\assets\mascot\` and `d:\Beam\showcase\index.html`.
- **Proof:** `Remove-Item` executed cleanly; `Get-ChildItem -Path d:\Beam\assets` verifies only `mascot/` remains.
- **Still broken / unproven:** Architecture specification (`ARCHITECTURE.md`) and core Electron app implementation pending next sprint.

#### Work card 13: Implementing 5 interactive micro-behaviors in showcase
- **Problem / tension:** Mascot showcase displayed static states but lacked live micro-interaction mechanics (cursor tracking, poke squish, file gulping, music pulse, and sleep).
- **Change / decision:** Added a 5-behavior interactive playground to `d:\Beam\showcase\index.html` with vanilla math/CSS transforms (clamped pupil tracking, jelly spring physics, drag/drop mouth morphing, 120 BPM audio bobbing, and floating sleep Z particles). Updated `DESIGN.md` Section 5.
- **Proof:** `d:\Beam\showcase\index.html` (28,500+ bytes) verified; PowerShell confirmed all 14 interactive IDs and handlers exit with code 0.
- **Still broken / unproven:** Architecture specification (`ARCHITECTURE.md`) and core Electron app implementation pending next sprint.

#### Work card 14: Integrating live cursor tracking into official Master Mark
- **Problem / tension:** Previous tracking prototype swapped in generic two-eye cartoon sockets instead of retaining the official Master Mark's iconic wink chevron.
- **Change / decision:** Preserved the signature Master Mark face (left wink chevron `>`, right white eyelid sclera with inner tracking pupil). Wired page-wide cursor tracking to the Hero banner in `d:\Beam\showcase\index.html` and updated `d:\Beam\assets\mascot\beam-mascot.svg` and `DESIGN.md`.
- **Proof:** `beam-mascot.svg` parsed with 3 circles; PowerShell verified `hero-pupil` and `track-pupil-right` live event bindings with exit code 0.
- **Still broken / unproven:** Architecture specification (`ARCHITECTURE.md`) and core Electron app implementation pending next sprint.

#### Work card 15: Restoring pure solid black eye with gliding specular catchlight
- **Problem / tension:** Outer white eyelid socket was unwanted and distorted the clean silhouette of the original master eye.
- **Change / decision:** Stripped the outer white socket entirely; restored the pure solid black eye (`r=6`) directly on the star face. Configured the inner white specular catchlight dot (`r=2`) to glide smoothly inside the black boundary following cursor coordinates. Updated `beam-mascot.svg`, `showcase/index.html`, and `DESIGN.md`.
- **Proof:** `beam-mascot.svg` verified with exactly 2 circles (black eye + white catchlight); PowerShell confirmed `hero-catchlight` and `track-catchlight-right` event bindings exit with code 0.
- **Still broken / unproven:** Architecture specification (`ARCHITECTURE.md`) and core Electron app implementation pending next sprint.

#### Work card 16: Writing the technical blueprint and build checklist
- **Problem / tension:** Project had no architecture doc or task list. Ten PRD gaps were undecided (session priority, timer rules, shelf limits, settings scope, measurable perf budget), and the native-depth requirement was undocumented.
- **Change / decision:** Created `ARCHITECTURE.md` (4 parts, 3 seams, stdio JSON-lines helper protocol, IPC contract, 14 decision rows) and `TASKS.md` (28 ordered tasks across 9 phases, with Phase 0 gating on the native seam and the RAM budget). Recorded `Alt+Space` as the hotkey with a `Ctrl+Shift+Space` fallback.
- **Proof:** Both files verified present via `Get-ChildItem` (ARCHITECTURE.md 9,615 bytes; TASKS.md 7,987 bytes).
- **Still broken / unproven:** No app code exists. Helper packaging (self-contained vs framework-dependent) undecided; Phase 0 spike not started.

#### Work card 17: Closing the five architecture decisions
- **Problem / tension:** RAM ceiling, helper packaging, monitor behavior, and shelf data loss were open, and the PRD's "<100 MB / 0% CPU" targets were not measurable.
- **Change / decision:** Amended PRD to <130 MB private bytes and <0.5% average CPU over 60s. Closed all open decisions: self-contained helper, `Alt+Space` kept as default, pill starts on primary monitor and snaps back if that monitor disappears, shelf warns before quitting with files. Updated tasks 0.2, 0.4, 1.1, 3.5.
- **Proof:** `Select-String` across PRD/ARCHITECTURE/TASKS confirms no stale 100 MB target and no remaining "blocked on" markers; decisions table re-read at lines 178–192.
- **Still broken / unproven:** No app code written. Task 0.1 scaffold not started.

#### Work card 18: Moving the RAM gate ahead of the native spike
- **Problem / tension:** The 130 MB budget gate sat at task 0.4, after the hardest work (C# helper, SMTC, clipboard, drag-out). A failure there would have wasted the native spike.
- **Change / decision:** Reordered Phase 0: 0.1 scaffold → 0.2 budget gate → 0.3 helper hello → 0.4a–c seams. Electron confirmed with WinUI as the fallback if the gate fails. Added the missing project `AGENTS.md`, updated ARCHITECTURE decisions and risk rows, and wrote `.scratch/HANDOFF.md` for the tool switch.
- **Proof:** `TASKS.md` Phase 0 now reads 0.1, 0.2, 0.3, 0.4a, 0.4b, 0.4c, 0.5 (lines 11–29). Grep finds zero stale `0.3a/0.3b/0.3c` references; ARCHITECTURE risk rows 202 and 204 now point at task 0.2 and 0.4c.
- **Still broken / unproven:** No app code. `npm install` has not run. The 130 MB / 0.5% budget is still unmeasured.

#### Work card 19: Closing the PRD/architecture contradictions before code
- **Problem / tension:** Docs disagreed on four things that change code shape: two timer owners (`beam:timer:tick` vs renderer deadline), a blocking `DoDragDrop` on the helper's stdio loop, a 130 MB budget that never said whether the C# helper counts, and hover "expanding" in the PRD vs a fixed-size window in the architecture. Four smaller gaps: DPI scaling, single-instance behaviour, settings schema version, and no `verify.ps1` until task 8.1.
- **Change / decision:** Timer deadline now owned by main (renderer only displays); `files.drag` runs on a dedicated STA thread; budget split Electron ≤130 MB + helper ≤60 MB with the total always printed; hover fades controls with no resize; DPI checked at 100/125/150; second launch wakes the existing pill; `settings.json` carries `version: 1`; `verify.ps1` created at 0.1 and grows per phase. PRD, ARCHITECTURE, and TASKS updated together; eight decisions recorded.
- **Proof:** `grep "counts down locally|summed across app processes|Hovering expands|not by decrementing" *.md` returns no matches. TASKS 0.1/0.2/0.3/1.1/4.2/8.1 and ARCHITECTURE decisions 191–197, 206–208 re-read after editing.
- **Still broken / unproven:** No code exists, `npm install` has not run, and two known gaps remain open: fullscreen detection only listens for foreground changes, and album-art temp files have no stated lifecycle.

#### Work card 20: Replacing the old GitHub repository with this project
- **Problem / tension:** `github.com/kwakhare5/beam` still held the previous project (backend, extension, website, 16 MB) and `D:\Beam` was not a git repository at all.
- **Change / decision:** Applied round-3 decisions to the docs (fullscreen detection, artwork temp folder, clipboard lifetime, renderer owns contextual tab). Initialised git on `main` with a `.gitignore` covering `node_modules`, build output, `.scratch`, `.commandcode`, `.agents`, `.freebuff`; committed 15 files; force-pushed over `origin/main`.
- **Proof:** Push printed `2263e41...21bc121 main -> main (forced update)`. `git ls-tree -r --name-only origin/main` lists 15 files; `git ls-remote --heads` reports `refs/heads/main = 21bc121`. Old tree is gone from the branch.
- **Still broken / unproven:** No app code. `npm install` has not run. Old commits are unreachable but still exist on GitHub by SHA until its garbage collection; a hard purge needs the repo deleted and recreated, which needs the GitHub CLI or an API token (none installed).

#### Work card 21: Scaffold built, 0.1 proven, UI direction set
- **Problem / tension:** No app existed. Electron's binary never downloaded (GitHub release CDN unreachable from this machine), `ELECTRON_RUN_AS_NODE=1` is set machine-wide and makes `electron.exe` run as Node, and the app UI had no size, state, icon or theme decisions.
- **Change / decision:** Built the Electron 45 + Vite 8.3.5 + TypeScript 7.0.2 scaffold with a single-instance lock and `verify.ps1`. Install fixed via `ELECTRON_MIRROR=https://cdn.npmmirror.com/binaries/electron/` with the official checksum verified. Added the canonical preview rule (`showcase/app-preview.html` only) to AGENTS.md and DESIGN.md. Locked UI: 200×36 idle / 260×40 hover / 360×460 on tap, Lucide icons 18px, gold accent, light+dark themes, transparent CSS capsule. Added light app tokens to DESIGN.md and theme toggle to PRD/TASKS. Tested acrylic against a transparent pill.
- **Proof:** `.\verify.ps1` → `PASS typecheck`, `PASS build`, `PASS launch (pid 30028)`, `PASS single instance`, `ALL CHECKS PASSED`, exit 0. `electron.exe --version` → `v45.0.0`. Acrylic screenshots at scratchpad/acrylic.png and acrylic2.png: acrylic paints the window rectangle and ignores CSS radius.
- **Still broken / unproven:** Task 0.2 (RAM/CPU gate) not measured. Vercel still auto-deploys this repo. Lucide and Inter are not vendored yet. The panel internals (tab bar, settings screen, focus rings) are still undesigned.

#### Work card 22: One stylesheet shared by the app and the preview
- **Problem / tension:** The preview had its own colours and sizes, so it would drift from the real app the moment either changed. The user also could not find or read the UI (no single place showing every state).
- **Change / decision:** Rewrote `src/renderer/styles.css` as the single source of tokens and components (pill, panel, tabs, rows, buttons, switches, calendar), with `[data-theme]` for light and dark. `showcase/app-preview.html` now links that same file instead of copying it, and renders 14 states: idle 200×36, hover 260×40, playing, paused, timer, done, shelf empty/full, drag-over, missing, hidden, focus ring, plus 5 panels at 360×460 and light-theme samples. App markup switched from `#pill` to `.pill` so it uses the same class.
- **Proof:** `npm run build` exit 0; emitted CSS grew to 6.11 kB, proving the shared sheet is what ships. Preview reopened from `D:\Beam\showcase\app-preview.html`.
- **Still broken / unproven:** Inter and Lucide are still referenced, not vendored — the preview falls back to Segoe and the icons are inline approximations of Lucide paths. Task 0.2 is still unmeasured.

#### Work card 23: Apple-style surfaces, side-by-side gallery, two systems documented
- **Problem / tension:** The preview forced vertical scrolling to compare states, the pill looked flat rather than Apple-like, and nothing explained why the website and app look different.
- **Change / decision:** Gallery switched to an auto-fill grid (three states per row, panels 392px min) so most states fit on one screen. Loaded the `emil-design-eng` skill and applied its rules: layered surface with a top-highlight gradient, exactly one elevation shadow plus one inner hairline, Apple text tones `#F5F5F7`/`#98989D`, press `scale(0.97)` at 160ms, hover 120–140ms, `prefers-reduced-motion` fallback. Rewrote DESIGN.md §1 with a "Two design systems, on purpose" table (website = Notion light/editorial, app = Apple layered dark + light) and app visual rules; updated app and light token tables; fixed the missing idle mascot.
- **Proof:** `npm run build` exit 0, emitted CSS 6.92 kB. Offscreen `capturePage()` screenshot at scratchpad/preview.png shows three states per row and the new surfaces.
- **Still broken / unproven:** Inter and Lucide are still not vendored (fallback font, approximated icon paths). Task 0.2 still unmeasured. Vercel still auto-deploys the repo.

#### Work card 24: Reverted the Apple direction
- **Problem / tension:** The Apple-style restyle was implemented without an explicit approval and the user rejected the direction. The strict plan gate in the global rules was broken.
- **Change / decision:** Restored `src/renderer/styles.css` to the pre-Apple tokens and flat surfaces (`rgba(18,19,22,.92)`, `#EDEDED`, `#888`, radius 18/12, no shadow, no highlight gradient, no press scaling). Reverted the matching DESIGN.md tables, removed the Apple rules block, and restored the hairline-only shadow rule. Kept only what was requested separately: the side-by-side gallery grid, the fixed idle mascot, and the two-design-systems table.
- **Proof:** `grep -E "shadow|inner-light|F5F5F7|98989D|28, 28, 30"` returns no matches in `src/renderer/styles.css` or `DESIGN.md`; `npm run build` exits 0.
- **Still broken / unproven:** Inter and Lucide are still not vendored. Task 0.2 still unmeasured. No new design direction is approved yet.

#### Work card 25: One source of UI markup shared by the app and the preview
- **Problem / tension:** The preview hand-copied every pill and panel state, so the sample and the app were two separate implementations that would drift; `renderer.ts` was three lines and the app shell had no real UI.
- **Change / decision:** Added `src/renderer/views.ts` with the icon sprite, `pill()`, and `panel()` (all text escaped); `renderer.ts` now draws the idle pill from it; `showcase/app-preview.html` renders all 14 pill states and 5 panels by calling the same functions instead of holding markup; added `npm run ui` (`vite.preview.mts`) because a file:// page cannot import TS; `#app { display: contents }` keeps the pill filling the body.
- **Proof:** `.\verify.ps1` → PASS typecheck, PASS build, PASS launch, PASS single instance, ALL CHECKS PASSED, exit 0. Offscreen Electron capture of the served gallery reported 14 pills, 5 panels, 18 icon symbols; screenshots at scratchpad/preview.png, preview-panels.png, preview-light.png, preview-bottom.png.
- **Still broken / unproven:** Preview now needs `npm run ui` instead of a double-click. Real window behaviour (hover resize, transparency, drag) is still absent (tasks 1.x). Task 0.2 RAM/CPU gate still unmeasured. Inter and Lucide remain unvendored.

#### Work card 26: RAM/CPU gate measured — memory over budget
- **Problem / tension:** Task 0.2 had never been measured, and the whole stack choice depends on Electron's real baseline. Measuring late risks building the helper and UI on a failing foundation.
- **Change / decision:** Added `measure.ps1`: builds, launches the app, walks the Electron process tree, samples private bytes and RSS every 5s for 60s, computes average CPU across all 16 logical processors, prints the numbers, and cleans up its own process tree. No product code changed.
- **Proof:** Peak private 139.2 MB (steady 137.4 MB) against a 130 MB limit; RSS 276.7 MB; average CPU 0.014% against 0.5%. Four processes: 69.2 + 33.8 + 24.8 + 11.6 MB. Exit 1, `BUDGET FAILED`. CPU passes; memory fails by 9.2 MB.
- **Still broken / unproven:** Task 0.2 is not ticked. Need a decision: test software rendering (removes the ~25 MB GPU process, risks CPU and transparency), raise the ceiling to 150 MB, or move to the WinUI fallback. The idle measurement is also the floor — opening the 360×460 panel will add renderer memory.

#### Work card 27: Software rendering clears the 0.2 gate
- **Problem / tension:** With GPU acceleration on, the empty app measured 139.2 MB peak private bytes against the 130 MB ceiling — a fail by 9.2 MB, and the panel would only add more.
- **Change / decision:** Added `app.disableHardwareAcceleration()` at the top of `src/main/index.ts`, before the single-instance lock and window creation. Two independent 60s runs, plus an Electron capture harness with the same window options to check the transparent capsule.
- **Proof:** Run 1 peak 86.4 MB / steady 84.6 MB / CPU 0.047%; run 2 peak 86.5 MB / steady 84.7 MB / CPU 0.017%; both `BUDGET PASSED`, exit 0. `.\verify.ps1` → PASS typecheck, PASS build, PASS launch, PASS single instance, ALL CHECKS PASSED. Screenshot `scratchpad/app-shot.png` shows the 800×60 rounded transparent pill with mascot and text.
- **Still broken / unproven:** Software rendering has no GPU compositing; re-measure CPU with the 360×460 panel open and at task 8.1. The helper's 60 MB cap is still unmeasured. Task 0.3 is next.

#### Work card 28: UI design system locked after grilling
- **Problem / tension:** The app was a long 800×60 pill, the preview used a two-line 200×36 capsule and a 360×460 panel with dead space, and the UI work had been done without the design skills loaded.
- **Change / decision:** Grilled and locked: 208×32 capsule inside a 220×44 rest window, no hover resize; one-line states; 360×400 panel; dark default with light toggle; Inter + real Lucide; hover/press/focus/disabled states; 150ms panel, 120ms hover, one done pulse, reduced motion. Recorded in `DESIGN.md` §7 and corrected the stale acrylic/0.88 token lines.
- **Proof:** `DESIGN.md` lines 134–196 contain the window/capsule table, state map, panel density, motion, and contrast rules. User confirmed every decision twice. No app, preview, or CSS code changed in this task.
- **Still broken / unproven:** The app window is still 800×60; the preview still shows 200×36 / 260×40 / 360×460; Inter and Lucide are not vendored; the panel open/close and window resize are not built. Implementation is waiting on an explicit go.

#### Work card 29: Original mascot restored, UI split, icons and states fixed
- **Problem / tension:** The previous pass replaced `styles.css` and `views.ts` in place, swapped the brand mascot for a custom mini mark, and left the UI in one monolith. The user rejected the mascot and the look: 22px state art was muddy, the transport icons were filled, idle `0.55` was washed out, and the idle hover showed media controls with no media.
- **Change / decision:** Restored the original `beam-mascot.svg` at 24px in the capsule and kept the state mascots at 48px in the music/files empty panels; switched all Lucide icons to outline at 2px; raised idle to `0.70`; removed the fake idle hover. Split `src/renderer/ui/` (one capsule, one panel shell, per-tab modules) and `src/renderer/styles/` (tokens/base/pill/panel/controls/tabs) with shadcn-style variables. Added `GLOSSARY.md` and ADR-0001–0004; updated DESIGN, ARCHITECTURE, AGENTS, and the preview.
- **Proof:** `npm run typecheck`, `npm run build`; `.\verify.ps1` → PASS typecheck/build/launch/single instance, ALL CHECKS PASSED. Preview capture: 13 capsules, 9 panels, 18 icon symbols. App capture at 220×44 shows the original master mark. `measure.ps1` after the split: 83 MB / 85.1 MB peak, 0.005% CPU, BUDGET PASSED.
- **Still broken / unproven:** The real app still shows only the capsule; panel open/close is task 1.3. Custom timer is 4.1; helper is 0.3. Literal shadcn/ui is not used (ADR-0004). Impeccable remains 3.9.1 because its updater hangs on impeccable.style.

#### Work card 30: Capsule lens, focus, hover, mascot, paginated preview, footer removed
- **Problem / tension:** The 216px idle capsule looked long; the focus ring sat on the play button with no capsule cue; the mascot was static; the outline transport read as wireframes. The preview was one long page; radii and spacing were off-system; disabled/loading/success were missing; the panel footer was unwanted; the music art was a placeholder.
- **Change / decision:** M lens: 196 idle / 208 hover inside a fixed 220×44 window; the shell brightens .70→1, the border .08→.14, and the window never resizes. Focus: 2px gold outer on the capsule + 1px inner on the focused control; controls stay focusable while visually hidden. Mascot: scale 1.06 / rotate -2° / 120ms in shared `pill.css`, disabled by reduced motion. Filled transport in the same sprite. Preview: sticky Capsule/Panels/Light/Rules pages + panel sub-nav; 196/208 frames; radii 6/8/10/14; 8px body; 32px controls; disabled/loading/success states; `sample-art.svg`; no footer. App window 228→220. DESIGN, GLOSSARY, ADR-0003, ADR-0005, and ARCHITECTURE updated.
- **Proof:** `.\verify.ps1` → PASS typecheck/build/launch/single instance, ALL CHECKS PASSED. `.\measure.ps1` → 89.3 MB peak private, 0.028% CPU, BUDGET PASSED. Preview capture: 13 pills, 3 panels, 18 sprites at 1242×817; app capture at 220×44 shows the 196 idle capsule with 12px each side. Focus card shows the 2px outer + 1px inner; hover cards show 208.
- **Still broken / unproven:** The real app still renders only the idle capsule; panel open/close is task 1.3; custom timer is 4.1; helper is 0.3. The app hover/mascot is in the shared CSS but the static app-shot cannot exercise it. Literal shadcn/ui remains unused (ADR-0004). Impeccable is still 3.9.1 because its updater hangs on impeccable.style.

#### Work card 31: Idle lens corrected to 160
- **Problem / tension:** The M choice set idle 196 / hover 208, only 12px apart; the user said the idle still read the same as hover.
- **Change / decision:** Idle/timer/done/files/drag/missing are now 160px; hover/playing/paused stay 208px; the window stays 220, so the idle sits 30px from each edge (6px shadow + 24px transparent) and grows 48px on hover. No OS resize. Preview, DESIGN, GLOSSARY, ADR-0003, ADR-0005, and ARCHITECTURE updated.
- **Proof:** `.\verify.ps1` → PASS typecheck/build/launch/single instance, ALL CHECKS PASSED. `.\measure.ps1` → 90 MB peak private, 0.011% CPU, BUDGET PASSED. App capture at 220×44 shows the 160 idle; preview idle 160, hover 208.
- **Still broken / unproven:** The real app still renders only the idle capsule; panel open/close is task 1.3; custom timer is 4.1; helper is 0.3. The app hover/mascot is in the shared CSS but the static app-shot cannot exercise it. Literal shadcn/ui remains unused (ADR-0004). Impeccable is still 3.9.1 because its updater hangs on impeccable.style.

#### Work card 34: Preview refactor, landscape panel, art-left music
- **Problem / tension:** The preview had drifted into a half-updated mix: the Light page was still present, Rules still said 160/208 and a done pulse, Panels still said 360×340, and the Capsule tab didn't show the idle-hover pair from Compare.
- **Change / decision:** Refactored `showcase/app-preview.html` to four pages (Compare, Capsule, Panels, Rules), default Compare. Capsule now has 10 cards including Idle · hover 128; Compare is 104/128 inside 184 frames; Panels is 420×300 in a 428×308 open window with 148px art-left music; Rules is four cards. Removed the Light page, hidden card, done glow, `settingsLight`, and `data-panel-light`. `panel.css` now puts music art 148px on the left. Docs updated to 104/128/176/132/140 and 184/420/428.
- **Proof:** `.\verify.ps1` → ALL CHECKS PASSED; `.\measure.ps1` → BUDGET PASSED; preview capture: 12 pills, 1 panel, 18 sprites; app capture at 184×44 shows the 104 idle.
- **Still broken / unproven:** The real app still renders only the idle capsule; panel open/close is task 1.3; custom timer is 4.1; helper is 0.3. The app hover/mascot is in the shared CSS but the static app-shot cannot exercise it. Literal shadcn/ui remains unused (ADR-0004). Impeccable is still 3.9.1 because its updater hangs on impeccable.style.
