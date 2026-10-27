# DESIGN.md — Visual System & UI Tokens

## 1. Aesthetic Direction & Vibe
- **Design Theme:** Minimalist utility website derived directly from audited Helumi design tokens, paired with a Windows 11 dark glass desktop capsule and interactive mood mascots.
- **Canonical app preview:** `showcase/app-preview.html` is the single file used to review every app UI state. It loads the app's real stylesheet and shared view functions (`src/renderer/ui/`), so it must be opened with `npm run ui`, never from disk. Every phase extends that file; no other preview or mock file is ever created.
- **Background Feel:**
  - **Marketing Web:** Warm light gray canvas (`#f5f5f5`), pure white cards (`#ffffff`), and crisp `0.5px` hairline borders.
  - **Desktop Floating Bar:** Windows 11 dark glass (`rgba(18, 19, 22, 0.92)`), subtle 1px translucent border, smooth capsule geometry.
- **Copy Tone:** Editorial, calm, and understated. Section headings are lowercase, punchy, and punctuated with periods (e.g., `meet beam.`, `one bar for everything.`).

### Two design systems, on purpose (2026-10-27)

The website and the app are not the same surface, so they do not share one look. This is deliberate, not drift.

| | Website | Desktop app |
|---|---|---|
| **Job** | sells the product | sits over your work all day |
| **Palette** | Notion warm light: `#f5f5f5`, `#ffffff`, black text | Windows 11 dark glass, plus a light theme toggle |
| **Type** | Inter for body, Caveat for hand-drawn notes | Inter only, tight scale |
| **Depth** | flat, `0.5px` hairline borders, no shadows | flat translucent fill, 1px hairline border |
| **Accent** | system blue `#0a84ff` | brand gold `#FFAA00`, red for errors |
| **Corners** | 16px cards, capsule buttons | capsule pill, 14px panel, 10px cards |
| **Motion** | page-level, editorial | 120–150ms, no press scaling |

What they share, so they still read as one brand: the Puffy Chubby Star mascot, Inter, lowercase calm copy, and a single accent rule. Nothing else is forced to match.

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

### Desktop App Tokens (Windows 11 Dark Glass)
| Token | Value | Purpose |
|---|---|---|
| Shell Background | `rgba(18, 19, 22, 0.92)` | Translucent pill and panel |
| Shell Border | `rgba(255, 255, 255, 0.08)` | 1px border on pill and panel boundaries |
| Panel Surface | `rgba(255, 255, 255, 0.04)` | Tab container, card wells, shelf slots |
| Text Primary | `#EDEDED` | Song titles, timer countdowns, dates |
| Text Muted | `#888888` | Artist names, shortcut keys, inactive tabs |
| Destructive | `#EF4444` | Missing file warning badges, cancel actions |

---

### Desktop App Tokens — Light Theme (user toggle, 2026-10-27)
| Token | Value | Purpose |
|---|---|---|
| Light Shell | `rgba(255, 255, 255, 0.92)` | Translucent light pill and panel |
| Light Shell Border | `rgba(0, 0, 0, 0.08)` | 1px border on light surfaces |
| Light Panel Surface | `rgba(0, 0, 0, 0.03)` | Tab container, cards, shelf slots |
| Light Text Primary | `#111111` | Song titles, timer countdowns, dates |
| Light Text Muted | `#6B6B6B` | Artist names, shortcut keys, inactive tabs |
| Light Destructive | `#D92D20` | Missing file badges on light surfaces |


## 3. Typography & Hierarchy

- **Primary UI Font (app + website):** `Inter` variable, vendored in `assets/fonts/` and loaded locally. Stack: `"Inter", "Segoe UI Variable Text", "Segoe UI", sans-serif`. No network fetch; the SIL OFL license ships next to the file.
- **Numbers:** Inter `tabular-nums` for the timer and any live counter. No second mono font in v1.
- **Editorial Hand-Drawn Font (website only):** `Caveat` (weight 600) for notes, arrow callouts, and doodle captions. Never used in the app.
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

---

## 7. App UI System (locked 2026-10-27)

This section overrides any earlier app size or spacing in this file and in the preview. The app is one always-on window; the capsule grows 24px on hover inside it, and the window never resizes.

### 7.1 Window and capsule

| | Idle | Hover | Open |
|---|---|---|---|
| Window | 184×44 | 184×44 | 428×308 |
| Visible surface | 104×32 capsule | 128×32 capsule | 420×300 panel |

- Rest and hover share one window size. Hover brightens the shell, grows the capsule 104→128, and fades controls in; the window never resizes, so no OS resize flicker.
- Click expands the same window to 428×308 with a 150ms ease-out, anchored bottom-center and growing upward. Close reverses it.
- The 4px shadow margin is not content. At idle the capsule is 40px from each window edge (4px shadow + 36px transparent); at hover it is 28px (4px + 24px). The open margin is 4px.
- Show with `showInactive()`; keep `focusable: true` so Esc and Tab work. Never steal focus on show.
- Do not copy Wispr's 260×90 margin on an always-on pill: the invisible area would capture clicks.

### 7.2 Capsule

- 104×32 idle, 128×32 hover, 176×32 playing/paused; radius 999, padding 0 8, 1px hairline, shell `rgba(18,19,22,.92)`, one tight shadow `0 3px 10px rgba(0,0,0,.45)`. Width transitions in 120ms; the window stays 184.
- 24px original master mark (`beam-mascot.svg`), 8px gap. One 12px/600 line. The idle is centered with 11px breathing room each side; the playing title gets 40px at 176. Digits 15px/600 tabular. No second line and no badge.
- Hover: shell brightens `.70→1`, border `.08→.14`, the capsule grows 24px inside the fixed window, the filled 18px transport fades in over 120ms only when playing or paused, and the title truncates at 40px. The mascot pops to `scale(1.06) rotate(-2deg)` over 120ms. No OS resize, no control resize.
- Idle is `opacity: .70`; hover returns it to 1.
- The capsule always uses the original master mark; only the line, right slot, and border tone change. The state mascots (`star-music`, `star-files`) appear at 48px in the panel empty states. No custom mini mark.
- Focus: the focused control gets a 1px neutral ring (`var(--ring)`); the capsule itself has no ring and no glow. The controls stay focusable while visually hidden, and appear on focus.

| State | Width | Line | Right slot | Extra |
|---|---|---|---|---|
| Idle | 104 | `Beam` | — | opacity .70 |
| Playing | 176 | track title | — | controls on hover |
| Paused | 176 | track title, muted | — | play icon |
| Timer | 132 | `Focus` | `18:24` | tabular |
| Done | 132 | `Time's up` | `00:00` | gold digits |
| Files | 104 | `3 files` | — | — |
| Drag | 104 | `+3 files` | — | dashed gold border |
| Missing | 140 | file name, danger ink | — | drag disabled |

Artist, shortcut, file size, and the word "missing" live in the panel only.

### 7.3 Panel

- 420×300, radius 14, shell `.92`, 1px hairline, one tight shadow that fits the 4px margin. No footer; the body is the full 260px.
- Tab bar 40px: real Lucide 14px plus 12px labels; active tab uses the surface, settings is the icon at the right. Body padding 8, gaps 8.
- Music: 148px art on the left, title/artist/controls on the right (`showcase/sample-art.svg` in the preview), 15/600 title, 12 artist, three 32px controls with 20px icons. No footer.
- Files: 36px rows; the list scrolls with 5 rows, 32px Copy All / Add / Clear pinned bottom. Missing rows use danger; copied shows a check and label.
- Timer: 28px preset chips, 40/600 digits, 12px note, 32px Start / Cancel. Center the face group.
- Calendar: 7×6 grid, 28px cells, 12px numerals, today gold, adjacent month at 45%.
- Settings: five 44px rows, 36×20 switch, 11px keycaps.
- Music and files empty states use a 48px original mascot and one line of copy; timer and calendar use their normal content. Disabled controls drop to .4; music loading uses three skeleton rows; copied uses the success state.

### 7.4 Type, icons, colour, motion

- Inter variable vendored in `assets/fonts/`; fallback Segoe UI. One family: 12/13/15/40, tabular numerals for time.
- Lucide 24px source: filled media shapes for transport, 2px outline for UI; 18 in the capsule, 20 in music controls, 16 in rows, 14 in tabs and buttons. No approximated paths beyond the four media shapes.
- Gold is the only brand color (`--primary`): current tab, primary button, timer digits, today, and done digits. The shadcn `--accent` is a neutral hover surface, not a second brand color. Danger only for missing or errors.
- Every interactive element has default, hover, active (`scale(.97)`), focus (focused control 1px neutral; panel controls 2px neutral; no capsule ring), disabled (0.4), and loading. Hover brightens the surface and grows the capsule 24px inside the fixed window; controls never resize.
- Motion: 120ms hover, 150ms panel grow, 120ms mascot pop. No done glow, no ambient mascot animation. `prefers-reduced-motion` disables the pop and movement; uses a crossfade or instant change.
- Spacing 4/8/12/16/24; radii 6/8/10/14/999. No arbitrary values, no nested cards, no gradient text, no decorative blur, no footer.
- CSS uses the shadcn-style variable vocabulary (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`) from `src/renderer/styles/tokens.css`.

### 7.5 Code structure

- `showcase/app-preview.html` has four sticky pages (Compare, Capsule, Panels, Rules) and a panel sub-nav; the hash selects a page. Compare is the default: two static 104/128 capsules with the same `Beam` content inside 184×44 frames, pointer-events off. The Capsule page has 10 content cards including the idle-hover pair; Panels is 420×300; Rules documents the 1px neutral control focus. The music sample uses `showcase/sample-art.svg`.
- `src/renderer/ui/` is the only UI source: `pill.ts` (one capsule), `panel.ts` (one panel shell and tab host), `panel-body.ts`, `icons.ts` (Lucide sprite), `mascots.ts` (original suite), `html.ts`, `types.ts`, and `tabs/{music,files,timer,calendar,settings}.ts`. `index.ts` is the public API used by the app and the preview.
- No per-state components. A content state is data (`data-state`); an interaction state is data (`data-hover`), focus, or press.
- `src/renderer/styles.css` is the entry; `src/renderer/styles/` holds `tokens`, `base`, `pill`, `panel`, `controls`, and `tabs`. Change one file without editing the others.
- The renderer is vanilla TypeScript. shadcn-style tokens and Lucide only; no React, Tailwind, or Radix. See `docs/adr/0001`–`0005` and `GLOSSARY.md`.

### 7.6 Contrast and states

- Body text ≥4.5:1; large text ≥3:1. `#888` on `#121316` and `#6B6B6B` on white both pass. Gold text on light uses `#8A5A00`.
- Do not ship a state with only one of hover, focus, active, disabled, loading, or success. The preview must show every state in this section.
