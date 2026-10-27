# DESIGN.md — Visual System & UI Tokens

## 1. Aesthetic Direction & Vibe
- **Design Theme:** Minimalist utility website derived directly from audited Helumi design tokens, paired with a Windows 11 dark acrylic desktop bar and interactive mood mascots.
- **Background Feel:**
  - **Marketing Web:** Warm light gray canvas (`#f5f5f5`), pure white cards (`#ffffff`), and crisp `0.5px` hairline borders.
  - **Desktop Floating Bar:** Windows 11 dark acrylic glass (`rgba(18, 19, 22, 0.88)`), subtle 1px translucent border, smooth capsule geometry.
- **Copy Tone:** Editorial, calm, and understated. Section headings are lowercase, punchy, and punctuated with periods (e.g., `meet beam.`, `one bar for everything.`).

---

## 2. Color Palette (Tokens)

### Marketing Web Tokens (Audited from Helumi)
| Token | Hex / Value | Purpose |
|---|---|---|
| `--bg` | `#f5f5f5` | Page background canvas (warm light gray) |
| `--surface` | `#ffffff` | Cards, floating nav pill, pricing cards, modal sheets |
| `--fill` | `#e9e8ea` | Sub-wells, preview tracks, recessed stages |
| `--track` | `#d4d4d4` | Progress tracks, slider backdrops |
| `--side` | `#f2f2f4` | Sidebar and nested panel background |
| `--k-line` | `rgba(0, 0, 0, 0.08)` | `0.5px` hairline borders (`box-shadow: 0 0 0 .5px #00000014`) |
| `--ink` | `#000000` | Primary text and headings |
| `--ink-2` | `rgba(0, 0, 0, 0.64)` | Subtitles, lede paragraphs, secondary copy |
| `--ink-3` | `rgba(0, 0, 0, 0.56)` | Captions, timestamps, disabled indicators |
| `--on-ink` | `#ffffff` | Text on black pills and dark containers |
| `--sel` | `#0a84ff` | Primary action / selection blue (Apple system blue) |
| `--folder` | `#5bb0ff` | File shelf folder accents |
| `--play` | `#ffd23f` | Timer progress / warning yellow |
| Traffic Close | `#ff5f57` | Window red dot |
| Traffic Minimize | `#febc2e` | Window yellow dot |
| Traffic Zoom | `#28c840` | Window green dot |

### Desktop App Tokens (Windows 11 Dark Acrylic Glass)
| Token | Value | Purpose |
|---|---|---|
| Shell Background | `rgba(18, 19, 22, 0.88)` | Translucent blurred pill and panel |
| Shell Border | `rgba(255, 255, 255, 0.08)` | 1px border on pill and panel boundaries |
| Panel Surface | `rgba(255, 255, 255, 0.04)` | Tab container, card wells, shelf slots |
| Text Primary | `#EDEDED` | Song titles, timer countdowns, dates |
| Text Muted | `#888888` | Artist names, shortcut keys, inactive tabs |
| Destructive | `#EF4444` | Missing file warning badges, cancel actions |

---

## 3. Typography & Hierarchy
- **Primary UI Font:** `Inter` or `system-ui` (`-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`).
- **Editorial Hand-Drawn Font:** `Caveat` (Google Font, weight 600) for personal notes, arrow callouts, and doodle micro-captions.
- **Monospace Font:** `ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace` (for timer countdowns, keyboard shortcuts).
- **Scale:**
  - `Hero H1`: 48px / weight 600 / line-height 1.1 / tracking `-0.045em` (lowercase + period)
  - `Section H2`: 28px–32px / weight 600 / line-height 1.2 / tracking `-0.03em` (lowercase + period)
  - `H3 / Lede`: 18px–20px / weight 500 / color `var(--ink-2)`
  - `Body`: 16px / weight 400 / line-height 1.5 / color `var(--ink)`
  - `Caption / Meta`: 12px–14px / color `var(--ink-3)`

---

## 4. Layout, Spacing & Motion
- **Container Width:** Max content `880px` (`--content`); wrapper with gutters `928px` (`.wrap`).
- **Spacing Scale:** 8px base grid (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`, `80px`).
- **Section Rhythm:** 64px vertical spacing between content blocks.
- **Border Radius:**
  - Cards & Stages: `16px` (`--radius`)
  - Sub-cards & Nested panels: `10px` (`--radius-sm`)
  - Buttons, Nav, and Pill Shells: `999px` (capsule geometry)
- **Hairline Shadows (No heavy drop-shadows):**
  - Hairline border: `box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.08)`
  - Active card border: `box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12)`
- **Motion & Easing:**
  - Standard ease: `cubic-bezier(.22, 1, .36, 1)`
  - Mascot bounce / spring: `cubic-bezier(.34, 1.56, .64, 1)`

---

## 5. Mascot & Vector Doodle System
Governed by installed skills [`svg-logo-designer`](file:///d:/Beam/.agents/skills/svg-logo-designer/SKILL.md) and [`illustration-style`](file:///d:/Beam/.agents/skills/illustration-style/SKILL.md):
- **Official Character:** **Puffy Chubby Star** — Honey Gold (`#FFAA00`) 5-point polar harmonic cubic Bézier spline with 10 perpendicular tangent handles ($C^2$ smooth curvature).
- **Asset Format:** Pure vector SVG only (zero raster bitmaps or heavy Lottie runtimes, 100% transparent backgrounds).
- **Core Suite Files in `d:\Beam\assets\mascot\`:**
  1. `beam-mascot.svg`: Master mark with signature wink chevron (`>`) on left, solid black circle (`r=6`) with inner white specular catchlight (`r=2`) on right, and subtle smile.
  2. `star-idle.svg`: Sleeping curved eyes (`◠ ◠`) and floating sleep Z for docked/idle pill state.
  3. `star-music.svg`: DJ headphones and whistling mouth for SMTC music playback.
  4. `star-files.svg`: Holding an origami document with a wink for file shelf drops.
  5. `star-timer.svg`: Focused eyes tracking a mini stopwatch for active countdowns.
  6. `star-done.svg`: Rosy cheeks, joyful smile, and 4-point sparkle stars for completed timers.
- **Showcase Lab & Interactive Micro-Behaviors:** Consolidated single-file interactive suite at [`d:\Beam\showcase\index.html`](file:///d:/Beam/showcase/index.html) demonstrating:
  1. *Catchlight Eye Tracking*: White specular catchlight dot glides smoothly inside the solid black eye following cursor coordinates (clamped to 2.4px limit).
  2. *Jelly Poke Squish*: Y-axis compression (`scale(1.3, 0.72)`) with spring recovery on click.
  3. *File Drag & Gulp*: Mouth expands on file drag-over and swallows upon drop.
  4. *Music Beat Pulse*: 120 BPM rhythmic body tilt and scale pulse during playback.
  5. *Deep Sleep Breathing*: 4-second ease-in-out lung cycle with floating Z particles.

---

## 6. Anti-Slop Checklist (Never Do)
- [ ] No generic purple/cyan dark-mode neon gradients.
- [ ] No blurry heavy drop-shadows (use crisp 0.5px hairline box-shadows).
- [ ] No uppercase shouting headings (use calm lowercase editorial with periods).
- [ ] No heavy Lottie or video runtimes where pure SVG does the job.
- [ ] No missing loading states or unstyled scrollbars.
