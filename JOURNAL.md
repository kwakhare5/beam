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
- **Proof:** `.\verify.ps1` → ALL CHECKS PASSED; `.\measure.ps1` → 88.5 MB steady / 90.3 MB peak / 0.047% CPU, BUDGET PASSED; preview capture: 12 pills, 1 panel, 18 sprites; app capture at 184×44 shows the 104 idle.
- **Still broken / unproven:** The real app still renders only the idle capsule; panel open/close is task 1.3; custom timer is 4.1; helper is 0.3. The app hover/mascot is in the shared CSS but the static app-shot cannot exercise it. Literal shadcn/ui remains unused (ADR-0004). Impeccable is still 3.9.1 because its updater hangs on impeccable.style.

> Note: work cards 32 and 33 were skipped during the UI grilling. Cards 30, 31, and 34 cover that stretch; numbering continues at 35.

#### Work card 35: Audit fixes and docs sync
- **Problem / tension:** The audit found the capsule rendering 36px in the app, 44px in Compare, and 32px in docs; `show()` stole focus; the preview still advertised unbuilt focus/hidden/grow; README, a measure script, and UI assertions were missing; TASKS/PRD/AGENTS/ARCHITECTURE/DESIGN/GLOSSARY/ADR-0004 were stale.
- **Change / decision:** body `padding: 6px 4px` (app capsule 32); Compare `[data-pill]` height 32; `showInactive()`; README; `npm run measure`; verify 5th UI spec check; docs current-vs-target, measurements, tree; TASKS/PRD/AGENTS/DESIGN/GLOSSARY/ADR-0004/ADR-0006; `showcase/index.html` frozen and Google Fonts removed; JOURNAL/HANDOFF. Review fixes: disabled .4, panel focus 2px, 428×308 preview frame, 40px title cap, 4px shadows, gold selected tab, switch hover/active, one-line empty states, three-row loading, no unused fontsource dependency.
- **Proof:** `.\verify.ps1` (5 checks) → ALL CHECKS PASSED; `npm run measure` → 81.8 MB steady / 84 MB peak / 0.011% CPU, BUDGET PASSED; app 184×44 / 32px capsule; preview Compare 104/32 and Panels 420×300.
- **Still broken / unproven:** The app still renders only the idle capsule; panel open, hotkey, tray, settings, helper, SMTC, timer, shelf, fullscreen, IPC, and automated UI tests remain. Next is 0.3.

#### Work card 36: Capsule-to-panel interaction, flicker prevention, and edge geometry
- **Problem / tension:** Clicking the capsule opens the panel, but transport buttons must not trigger open; repeated `win.setBounds` during 150ms expand stutters on Windows; and fixed upward growth clips off-screen if placed near upper monitor borders.
- **Change / decision:** Documented ADR-0007, updated `GLOSSARY.md` (transport isolation, expansion anchor, edge clamping), and updated `DESIGN.md` (zero-flicker CSS motion over instant 428×308 window resize, screen-aware vertical anchoring, 8px edge clamping, Esc/outside lightweight dismissal, transport click isolation).
- **Proof:** `.\verify.ps1` (5/5 checks) → `ALL CHECKS PASSED` (typecheck, build, launch, single-instance, UI spec).
- **Still broken / unproven:** The real app still renders only the idle capsule; panel open/close is task 1.3; helper hello is task 0.3.

#### Work card 37: Apple macOS-grade UI craft, glass depth, and spring transitions
- **Problem / tension:** The UI was functional but felt flat: single-layer shadows, no top specular rim highlight, generic CSS easing, unstyled active tabs, and flat transport buttons without visual hierarchy.
- **Change / decision:** Added dual-layer shadows, top specular highlights (`--highlight: inset 0 1px 0 rgba(255,255,255,0.09)`), and custom spring easing (`cubic-bezier(0.16, 1, 0.3, 1)`) in `tokens.css`; added glass specular and optical title letter-spacing in `pill.css`; added glass rim and segmented pill active tab indicator in `panel.css`; elevated play/pause into a primary 38px circular action in `tabs.css`; and refined active button press scaling (`scale(0.96)`) in `controls.css`.
- **Proof:** `.\verify.ps1` → `ALL CHECKS PASSED` (5/5); `.\measure.ps1` → 83.6 MB private / 85.1 MB peak / 0.008% CPU (`BUDGET PASSED`).
- **Still broken / unproven:** The real app still renders only the idle capsule; panel open/close is task 1.3; helper hello is task 0.3.

#### Work card 38: Dynamic title expansion, middle-truncation, and unified showcase board
- **Problem / tension:** Fixed 40px titles truncated short songs; end-truncation obscured file extensions; simultaneous timer + music lacked media cues; empty states were generic; and inspecting panels required clicking through multiple sub-tabs.
- **Change / decision:** Implemented dynamic title expansion (110px rest ⇄ 48px hover) and middle-truncation (`middleTruncate()`) for files; added background media pip on mascot; added hover row deletion (`×`) on files; added calendar month navigation chevrons; converted empty copy to lowercase editorial voice; unified `showcase/app-preview.html` into a single-canvas Showcase Board showing all capsule states and all 5 open panels side-by-side; codified in ADR-0008, GLOSSARY.md, and DESIGN.md.
- **Proof:** `.\verify.ps1` (5/5 checks) → `ALL CHECKS PASSED` (typecheck, build, launch pid 21780, single-instance, UI spec).
- **Still broken / unproven:** The real app still renders only the idle capsule; helper hello is task 0.3; panel open/close wiring is task 1.3.

#### Work card 39: Portlivo dark mode design system and macOS-native components
- **Problem / tension:** Beam needed to adopt the Portlivo macOS visual design language (dark slate surfaces, crisp blue accents, keycap tags, status pips, port-style pill badges, and 12/16px card geometry) while preserving all existing offline floating pill features and memory constraints.
- **Change / decision:** Saved the Portlivo dark mode specification into `DESIGN.md`; updated `tokens.css` with dark Portlivo palette (`#12151c` shell, `#1b1f2a` cards, `#4fb0ff` accent, 16px panel / 12px cards / 8px controls); added `.status-pip` (green/amber/red), `.pill-badge`, and `.keycap` in `controls.css`; upgraded file rows to include icon boxes with status pips and port badges; updated settings with keycaps; and verified across the Showcase Board in `app-preview.html`.
- **Proof:** `.\verify.ps1` (5/5 checks) → `ALL CHECKS PASSED` (typecheck, build, launch pid 18636, single-instance, UI spec).
- **Still broken / unproven:** The real app still renders only the idle capsule; helper hello is task 0.3; panel open/close wiring is task 1.3.

#### Work card 40: Original dark glass colors restored with macOS component hierarchy
- **Problem / tension:** The previous token edit introduced new slate/blue tints; the user required keeping Beam's exact original colors while adopting the macOS component structures.
- **Change / decision:** Restored exact original colors in `tokens.css` and `DESIGN.md` (`rgba(18, 19, 22, 0.92)` glass, `#ededed` text, `#ffaa00` brand gold, `#888888` muted, `#ededed` ring) while keeping the macOS component structures (status pips, keycap badges, port-style pill badges, and 16/12/8/999px radii scale).
- **Proof:** `.\verify.ps1` (5/5 checks) → `ALL CHECKS PASSED` (typecheck, build, launch pid 23320, single-instance, UI spec).
- **Still broken / unproven:** The real app still renders only the idle capsule; helper hello is task 0.3; panel open/close wiring is task 1.3.

#### Work card 41: DESIGN.md cleanly split into Desktop App UI and Website reference
- **Problem / tension:** `DESIGN.md` blended marketing website tokens (warm gray, Caveat font, system blue) with desktop app tokens (dark glass, Inter, brand gold, 16/12/8/999px radii), causing confusion over which rules govern the app.
- **Change / decision:** Restructured `DESIGN.md` into Part 1 (Desktop App UI System, the v1 core shipped surface) and Part 2 (Marketing Website & Brand Lab, post-v1 reference only), giving every surface an unmistakable boundary.
- **Proof:** `.\verify.ps1` (5/5 checks) → `ALL CHECKS PASSED` (typecheck, build, launch pid 19724, single-instance, UI spec).
- **Still broken / unproven:** The real app still renders only the idle capsule; helper hello is task 0.3; panel open/close wiring is task 1.3.

#### Work card 42: Capsule geometry polish, single brand mascot lock, and casing cleanup
- **Problem / tension:** Capsule text cut off due to static unhovered transport buttons occupying flex space; forced lowercase rule clashed with standard UI conventions; secondary demo/fake star variants (`star-music`, `star-files`) fragmented brand consistency; and corner radius tokens needed strict alignment across micro controls.
- **Change / decision:** Collapsed capsule transport controls to 0px width at rest and expand on hover (granting titles up to 120px with zero text cutoffs); removed forced lowercase strings across all tabs, calendar headers, and settings in favor of standard title/sentence casing; consolidated `mascots.ts` to use canonical `beam-mascot.svg` only across all views; aligned `.keycap` radius to `var(--r-micro)`; and updated `showcase/app-preview.html`, `DESIGN.md`, and `GLOSSARY.md`.
- **Proof:** `.\verify.ps1` (5/5 checks) → `ALL CHECKS PASSED` (typecheck, build, launch pid 17680, single-instance, UI spec).
- **Still broken / unproven:** The real app still renders only the idle capsule; helper hello is task 0.3; panel open/close wiring is task 1.3.

#### Work card 43: Capsule width lock, music transport fix, token and ARIA cleanup
- **Problem / tension:** The Music panel's transport row was invisible because the pill's hover-reveal `.controls` rule (`max-width: 0; overflow: hidden`) leaked into the panel; the capsule used five widths plus an undocumented 104→128 hover growth; four spec tokens were hard-coded; six tokens were dead; inactive tabpanels were never rendered so `aria-controls` dangled; and several values drifted from DESIGN.md.
- **Change / decision:** Scoped pill controls to `.pill .controls` and removed the `controls` class from the music row; locked the capsule to fixed per-state widths (104 idle/files/drag, 132 timer/done, 140 missing, 176 playing/paused) and removed hover growth by user decision; added `--pip-green`, `--pip-amber`, `--pill-badge`, `--keycap` and removed six dead tokens; rendered all five tabpanels with `hidden` on inactive tabs; fixed ARIA (`aria-selected="false"`, `aria-current="date"`, `aria-pressed` presets), the `Missing` badge, the `button.kbd` shortcut, the copied status, and light-theme tab contrast; aligned title 110/48, controls 30px, spring press 0.96 and 120ms motion; synced DESIGN.md, GLOSSARY.md, README.md, PRD.md, ARCHITECTURE.md and ADRs 0003/0005/0006.
- **Proof:** `.\verify.ps1` → `ALL CHECKS PASSED` (5/5: typecheck, build, launch pid 34440, single instance, UI spec). Preview measured: panel 420×300, 5 tabpanels with 1 visible, music controls 30/38/30, capsule widths 104/176/132/140, hover stays 104, light-theme selected tab `#8a5a00`.
- **Still broken / unproven:** The real app still renders only the idle capsule; panel tabs and buttons remain static (no event listeners); helper hello is task 0.3. The open-window body padding is still 6px vertical, so the app would render the panel 420×296 — fix when panel resize lands in task 1.3.

#### Work card 44: One-width capsule, title/transport swap, segmented panel tabs
- **Problem / tension:** Five capsule widths made the pill change size per state, and the DESIGN.md §5 table was geometrically impossible — `Focus` (34px) and `Time's up` (55px) were squeezed into 30px, `Midnight City` (76px) into 48px on hover, and the missing-file extension was cut. The tab bar had only 10px of slack and looked left-heavy; the preview tabs were inert; the mascot image scaled on hover; and `max-width`/`width` were animated.
- **Change / decision:** One 176×32 capsule for every state; the title fills a 128px slot at rest and crossfades to three 28px transports on hover/focus (75px slot with digits, 18-char middle-truncate for missing). Rebuilt the tab bar as a segmented track with four equal 90px tabs and the settings cog outside; exported `bindPanelTabs()` for click, arrow, Home, and End navigation. Removed the mascot hover transform and all layout animations; shrank `--shadow-pill` to fit the 4px window margin; synced DESIGN.md, GLOSSARY.md, ARCHITECTURE.md, ADRs 0003/0005/0006, README.md, PRD.md, and `verify.ps1`.
- **Proof:** `.\verify.ps1` → `ALL CHECKS PASSED` (5/5: typecheck, build, launch pid 34224, single instance, UI spec). Measured: all 10 capsule states 176px; `Focus` 34/74, `Time's up` 55/74, `Midnight City` 76/126, missing `quarterl…inal.xlsx` 126/126 — zero clipped titles; tab track right 472, settings 478–506, panel right 515; ArrowRight/ArrowLeft switch Music↔Files; music controls 30/38/30.
- **Still broken / unproven:** Real-app panel wiring stays task 1.3. The panel shadow (`0 12px 32px`) still exceeds the 4px open-window margin; decide shrink-shadow vs grow-window at 1.3. Visual screenshot could not be captured because the in-app browser surface stayed hidden; layout was verified by measured rects and computed styles.

#### Work card 45: State identity, panel completeness, and one scale (cards 45–54)
- **Problem / tension:** Hovering the idle capsule hid the only word in the app; done and running looked identical; paused was invisible at rest; four of seven capsule states had no CSS; settings overflowed by 10px and calendar six-week months clipped; file rows cut mid-row; theme and volume looked like controls but were dead badges; and the preview showed contradictory data and stale numbers (128/142/428×308) while ADRs contradicted their own update notes.
- **Change / decision:** Per ADR-0009: done reads `Done` with a gold check and gold border; paused gets a 12px play glyph and a 106px title slot; the shelf capsule shows a count with a red pip (no missing/0-files capsules); precedence drag > timer > music > files > idle. Music uses 148×148 art plus a read-only position bar; files get 24px copy/remove row actions, a Folder badge, and a dashed drop well; timer has idle/custom/running/done with an inline 1–999 field; calendar follows the OS week start with two-letter headers and stretches for six-week months; settings fits five 44px rows with real controls and dividers. Open window is 452×332 with a 16px shadow margin; type is 11/12/13/15/40; spacing is 4/8/12/16. Preview rebuilt on one dataset with light-theme samples; ADR-0003/0005/0006/0007/0008 amended and ADR-0009 added; ARCHITECTURE, AGENTS, GLOSSARY, DESIGN, TASKS, PRD, README, and verify.ps1 synced. Timer panel card delegated to a subagent and verified before merge.
- **Proof:** `.\verify.ps1` → `ALL CHECKS PASSED` (5/5: typecheck, build, launch pid 10288, single instance, UI spec). Browser measurements: all board capsules 176×32 with zero clipped titles; idle hover keeps the title at opacity 1; done border `rgb(255, 170, 0)` with no digits; paused glyph present with a 106px title; red pip `rgb(239, 68, 68)`; settings last row sits 30px above the body edge; five file rows fit with 6px slack; January 2027 (49 cells) has 0px calendar overflow; music art 148×148 with a 246px position bar; panel 420×300 inside a 452×332 frame; fonts only 11/12/13/15/40; light-theme capsules 176px; theme switch reports `false` in light. Screenshot still blocked by the hidden in-app browser viewport.
- **Still broken / unproven:** The app still renders only the idle capsule; panel resize, IPC, tray, hotkey, shelf, timer, calendar, and settings wiring stay in tasks 1.3–7.1. The position bar needs `positionMs`/`durationMs` from SMTC at task 2.3. The preview board repeats panel IDs six times for layout, so only the Panels page is safe for assistive tech.

#### Work card 46: Retired star variants deleted
- **Problem / tension:** Five `star-*` SVGs sat unused in `assets/mascot/` while DESIGN.md and AGENTS.md still described them as on disk; `assets/mascot/` is a Do Not Touch folder, so deletion needed explicit approval.
- **Change / decision:** Deleted `star-idle`, `star-music`, `star-files`, `star-timer`, `star-done`; only `beam-mascot.svg` remains, and the two doc lines now say so. No code changed: `mascots.ts` already imported only the master.
- **Proof:** `ls assets/mascot` shows one file; the only asset reference is `src/renderer/ui/mascots.ts:1`; `.\verify.ps1` → `ALL CHECKS PASSED` (5/5: typecheck, build, launch pid 25684, single instance, UI spec).
- **Still broken / unproven:** `showcase/index.html` still inlines the five variants as brand-lab reference (untouched by rule); the app still renders only the idle capsule.

#### Work card 47: Two capsule widths and flat surfaces
- **Problem / tension:** One 176px capsule wasted space in five short states and still clipped long titles; the tab bar was a pill inside a track pill; file rows were cards with an icon box inside; and the calendar drew five or six week rows, so the grid jumped between months.
- **Change / decision:** Two widths — 136×32 for idle, timer, done, files, drag and 216×32 for playing, paused — with the window at 144×44 or 224×44 and a snap on state change. Tab bar is flat: no track, no selected fill, gold icon + label for the current tab, faint hover wash. File rows use 1px dividers, no row fill, and no icon box. Calendar always draws 42 day cells padded with adjacent-month days. Preview, verify checks, ADR-0003/0004/0005/0006/0007/0008/0009, DESIGN, GLOSSARY, ARCHITECTURE, README, PRD, TASKS, and AGENTS synced.
- **Proof:** `.\verify.ps1` → `ALL CHECKS PASSED` (5/5: typecheck, build, launch pid 11532, single instance, UI spec). Browser measurements: idle 136×32 in a 144×44 window, music 216×32 in 224×44; music title 166/166 with zero clip; timer title 34/34 and digits 44 in 136; tab track background transparent with 0 padding; selected tab background transparent, color `rgb(255, 170, 0)`; row background transparent with a 1px divider; icon box transparent; Feb 2026, Aug 2026, Feb 2027, Nov 2026 all render 42 day cells; five file rows with 0 list overflow; art 148px; settings 0 overflow. `npm run measure` at 144×44: 90 MB steady / 90.7 MB peak / 0.035% CPU, BUDGET PASSED.
- **Still broken / unproven:** The app still renders only the idle capsule, so the 224 window swap lands with the state engine at task 1.3. Screenshots stay blocked by the hidden in-app browser; all layout claims are measured rects and computed styles.

#### Work card 48: Solid macOS-style surfaces, no glass or shine
- **Problem / tension:** The shell was 92% translucent with a 1px white top rim, pip glows, and shadows on the art, buttons, and keycaps; idle dimmed the whole shell to 70%, which read as glass. The user asked for solid, normal-button surfaces like Apple and no glassmorphism.
- **Change / decision:** `--card` is now solid `#1c1c1e` dark / `#ffffff` light. Deleted `--highlight` and `--highlight-subtle` and every rim, glow, art border/shadow, button shadow, and keycap bevel. Idle now mutes the label and keeps the shell solid. DESIGN, GLOSSARY, ADR-0005, ARCHITECTURE, the preview rules, and the token table synced. `verify.ps1` now fails on `backdrop-filter`, `--highlight`, pip glow, a translucent `--card`, or opacity on the idle pill.
- **Proof:** `.\verify.ps1` → `ALL CHECKS PASSED` (5/5: typecheck, build, launch pid 8056, single instance, UI spec). Computed styles: pill and panel `rgb(28, 28, 30)` with opacity 1, `backdrop-filter: none`, shadows with no inset layer; album art border 0 / shadow none; pip and primary button shadow none; idle label `rgb(136, 136, 136)`; light pill `rgb(255, 255, 255)`. No `backdrop-filter` remains in app CSS.
- **Still broken / unproven:** The app still renders only the idle capsule. Light theme was proved by setting the theme attribute on the body; the preview toggle sets it on the document root. Screenshots stay blocked, so this is measured computed style, not a visual capture.

#### Work card 49: Four width options on the Compare page
- **Problem / tension:** The 216px music capsule felt too wide on the Compare page, and the user wanted the rest pill shorter than the hover pill, shown as 3–4 options before choosing.
- **Change / decision:** Compare is now an option sheet: A 136/156, B 148/168, C 160/180, D 176/192 (rest/hover), each in a frame 8px wider. Options are pointer-inert pictures. The board and the app stay at 216 until a pair is chosen, and docs are unchanged because nothing is decided.
- **Proof:** `.\verify.ps1` → `ALL CHECKS PASSED` (5/5: typecheck, build, launch pid 22860, single instance, UI spec). Measured: A 136/156 in 144/164 frames, slot 106, 3px control slack; B 148/168 in 156/176, slot 118, 9px; C 160/180 in 168/188, slot 130, 15px; D 176/192 in 184/200, slot 142, 21px; `Midnight City` unclipped in all four.
- **Still broken / unproven:** No pair chosen. Rest shorter than hover means the capsule would grow on hover; that still conflicts with the one-width-per-state rule, so it is not wired. The app still renders only the idle capsule, and screenshots stay blocked.

#### Work card 50: Hover locked, four rest widths on Compare
- **Problem / tension:** The user locked hover at option A (156) and wanted rest shorter than 136, sized around the measured title widths (70–86px slots).
- **Change / decision:** Compare now shows hover locked at 156 (164 frame) and four rest pills: 120, 126, 132, 136 wide with 70/76/82/86px title slots. Board, app, and docs stay at 216 until rest is chosen.
- **Proof:** `.\verify.ps1` → `ALL CHECKS PASSED` (5/5: typecheck, build, launch pid 36900, single instance, UI spec). Measured: hover 156 in a 164 frame, slot 106, 3px slack; rest 120 clips (76px text in 70px), 126 fits exactly (76/76), 132 and 136 fit with 6 and 10px spare.
- **Still broken / unproven:** No rest width chosen. Rest shorter than hover makes the pill grow 36px on hover if 120 is picked (30px at 126, 24px at 132); not wired. App still idle-only; screenshots blocked.

#### Work card 51: Rest under 70px slots, hover 132–156
- **Problem / tension:** The user wanted rest title slots below 70px and hover widths from 132 or 136 upward.
- **Change / decision:** Compare now shows rest 100/106/112/118 (slots 50/56/62/68) and hover 132/136/144/156. Board, app, and docs stay at 216.
- **Proof:** `.\verify.ps1` → `ALL CHECKS PASSED` (5/5: typecheck, build, launch pid 33360, single instance, UI spec). Measured: hover 132 sits 1px inside the mascot and edge; 136 has 1px gaps, 144 has 5px, 156 has 11px. Rest slots are 68/62/56/50 and all four clip the 76px `Midnight City`.
- **Still broken / unproven:** No width chosen. The three transport buttons need 100px, so anything under 136 overlaps. App still idle-only; screenshots blocked.

#### Work card 52: Music capsule locked at 100 rest / 136 hover
- **Problem / tension:** The user locked rest 100 and hover 136 after comparing widths, and asked for it to be permanent rather than a Compare-only option.
- **Change / decision:** `pill.css` sets playing and paused to 100 wide, growing to 136 on hover, focus, or `data-hover` over 120ms. Paused keeps its glyph, leaving a 30px title at rest. One 144×44 window for every state; the 224 window and 216 width are removed from the preview, docs, and verify. Board, Capsule, Compare, and Rules pages show the locked pair.
- **Proof:** `.\verify.ps1` → `ALL CHECKS PASSED` (5/5: typecheck, build, launch pid 18072, single instance, UI spec). Measured in the preview: rest pill 100 with a 50px slot that clips the 76px title; hover 136 with 1px gaps to the mascot and edge; paused 100 with a 30px slot and its glyph; idle 136; window 144 for both. `transition-property` includes `width`; the headless browser reports reduced motion, so its duration reads 0.01ms instead of 120ms.
- **Still broken / unproven:** The app still renders only the idle capsule. At music rest the 144 window leaves 22px of transparent, click-eating margin each side; that needs click-through or a 108 window at task 1.3. Screenshots stay blocked.







