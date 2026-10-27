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
