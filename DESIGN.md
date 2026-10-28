# DESIGN.md — Visual System & Design Specifications

This document defines the two visual systems of Beam:
1. **Primary: Desktop App UI System (v1 target surface)** — The offline Windows 11 floating capsule and panel. Designed and previewed; app wiring is still in progress.
2. **Reference: Marketing Website & Brand Lab (Post-v1 / Reference Only)** — The showcase and landing page aesthetic.

---

# PART 1: DESKTOP APP UI SYSTEM (v1 target surface)

## 1. Aesthetic Direction & Craft
- **Design Theme:** Solid desktop system in the macOS style: opaque shell (`#1c1c1e` dark / `#ffffff` light), brand gold (`#ffaa00`), neutral text (`#ededed`), 1px hairline border, standard filled buttons, keycap shortcuts, status pips, pill badges, and one static mascot.
- **No Glass:** Surfaces are opaque. No backdrop blur, no translucent shell, no reflections, no inner rims, no glow, no gradients. A soft shadow is allowed only to lift the floating window off the desktop.
- **Canonical App Preview:** `showcase/app-preview.html` is the single file used to review every app UI state. It loads the app's real stylesheet and shared view functions (`src/renderer/ui/`), so it must be opened with `npm run ui`, never from disk. Every phase extends that file; no other preview or mock file is ever created.
- **Copy Tone:** Clear, calm, and understated. Standard sentence and title casing (`No music playing`, `Drop files here`, `Done`, `Missing`). No forced lowercase rule.

## 2. Desktop App Tokens (CSS Variables)

### Dark Theme (Primary Default)
Defined in [`src/renderer/styles/tokens.css`](file:///d:/Beam/src/renderer/styles/tokens.css):

| Token | Value | Purpose |
|---|---|---|
| `--border` | `rgba(255, 255, 255, 0.08)` | 1px border on capsule and panel |
| `--card` | `#1c1c1e` | Solid dark surface |
| `--secondary` | `rgba(255, 255, 255, 0.04)` | Faint hover wash, art fallback |
| `--muted` | `rgba(255, 255, 255, 0.08)` | Chips, buttons, input fills |
| `--foreground` | `#ededed` | Primary text |
| `--muted-foreground` | `#888888` | Subtitles, metadata, inactive tabs |
| `--accent` | `rgba(255, 255, 255, 0.12)` | Control hover wash |
| `--primary` | `#ffaa00` | Brand gold: primary action, selected tab text |
| `--primary-text` | `#ffaa00` | Gold text: timer digits, done check, today |
| `--destructive` | `#ef4444` | Missing files, cancel actions |
| `--pip-green` | `#22c55e` | Playing/present status dot |
| `--pip-amber` | `#f59e0b` | Paused status dot |
| `--pill-badge` | `rgba(255, 255, 255, 0.06)` | Size and count badges |
| `--keycap` | `rgba(255, 255, 255, 0.08)` | `Alt` / `Space` keycaps |
| `--shadow-pill` | `0 1px 2px rgba(0,0,0,.24), 0 2px 4px rgba(0,0,0,.18)` | Capsule lift inside the 4px rest margin |
| `--shadow-panel` | `0 4px 16px -2px rgba(0,0,0,.45), 0 1px 3px rgba(0,0,0,.3)` | Panel shadow inside the 16px open margin |
| `--space-1` … `--space-4` | `4 / 8 / 12 / 16px` | The only spacing steps |
| `--ease` | `cubic-bezier(0.16, 1, 0.3, 1)` | Standard easing |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Press easing |
| `--font-sans` | `Inter, 'Segoe UI Variable Text', 'Segoe UI', sans-serif` | Type stack |

### Light Theme (User Toggle)
Light overrides every color token in `tokens.css:41-67`. The key differences:

| Token | Value | Purpose |
|---|---|---|
| `--card` | `#ffffff` | Solid light shell |
| `--border` | `rgba(0, 0, 0, 0.08)` | Hairline border |
| `--secondary` | `rgba(0, 0, 0, 0.03)` | Faint hover wash |
| `--foreground` | `#111111` | Primary text |
| `--muted-foreground` | `#6b6b6b` | Secondary text |
| `--primary-text` | `#8a5a00` | High-contrast gold text |
| `--destructive` | `#d92d20` | Missing files |
| `--pill-badge` | `rgba(0, 0, 0, 0.04)` | Badges |
| `--keycap` | `rgba(0, 0, 0, 0.08)` | Keycaps |

## 3. Window & Surface Geometry

| | Rest | Hover | Open |
|---|---|---|---|
| **Window** | 144×44 | 144×44 | 452×332 |
| **Visible Surface** | 136×32 capsule · music 100 | 136×32 capsule · music 136 | 420×300 panel |

- **Music Growth:** music rests at `100×32` and grows to `136×32` on hover or focus over 120ms; every other state is `136×32`. There is one `144×44` window for all states, so the window never resizes on hover; the pill grows inside it, centered.
- **Zero-Flicker Hover:** Hover never resizes the window. It brightens the shell and border and, on music, grows the pill and swaps the title for transports.
- **Smooth Panel Expansion:** On click, the window expands to `452×332` with a 150ms ease-out. The OS window resizes immediately while GPU-accelerated CSS transforms handle the 150ms scale/fade expansion internally; on collapse, CSS animates out over 150ms before the window snaps back to `144×44`.
- **Screen-Aware Vertical Anchoring:** The panel anchors bottom-center and grows upward when the capsule is in the lower half of the display, and anchors top-center and grows downward when in the upper half.
- **Edge Clamping:** Horizontal coordinates clamp to keep at least 8px margin from display boundaries.
- **Click Isolation:** Transport buttons stop propagation and toggle playback directly; only clicks on the mascot, title, or empty capsule body trigger panel expansion.
- **Lightweight Dismissal:** `Esc`, tray toggle, or clicking outside collapses the window without stealing active window focus.
- **Shadow Margins:** 4px horizontal / 6px vertical at rest; 16px on all sides when open, so the panel shadow has room and the margin still counts as an outside click.

## 4. Radii & Component Hierarchy
- **One Fill Level:** every surface is flat by default. Never put a filled or bordered box inside another one: no tab pill inside a track, no icon box inside a row. State comes from color, spacing, and 1px dividers. A control may carry one fill or one border, never both a parent fill and its own.
- **Panel Shell:** `16px` (`--r-panel`)
- **Cards & Album Art:** `12px` (`--r-card`)
- **Controls, Buttons & Chips:** `8px` (`--r-control`)
- **Micro Badges & Date Cells:** `6px` (`--r-micro`)
- **Pills, Capsules & Switches:** `999px` (`--r-pill`)

## 5. Capsule Specifications
- **Geometry:** `136×32` for idle, timer, done, files and drag; music `100×32` at rest and `136×32` on hover or focus. Radius 999, padding `0 8px`, 1px hairline border, shell `#1c1c1e`. One `144×44` window for every state.
- **Mascot Mark:** 24px master mark followed by an 8px gap. Static; no hover transform.
- **Title / Transport Swap:** The slot is 50px in music rest (30px when the paused glyph is present) and 86px on hover; 88px in the other 136px states. At rest the title fills it and ellipsizes when the name is longer. On hover or focus, the title fades out over 120ms and three 28px transport buttons fade in, centered in the same slot.
- **Done:** the capsule reads `Done`, a 16px gold check fills the right slot, and the border turns gold. No digits and no glow.
- **Paused:** a 12px play glyph sits outside the title slot; the title is muted.
- **Shelf Count:** a non-empty shelf shows its count (`5 files`). A missing file turns the mascot pip red; the row carries the name and `Missing` badge. An empty shelf falls back to idle, so there is no `0 files` state.
- **Dual-State Collision (Timer + Music):** Countdown takes capsule prominence (`Focus` plus digits) with a 6px gold media pip on the mascot indicating active audio.
- **Precedence:** drag, then timer, then music, then files, then idle.

| State | Width | Line | Right slot | Extra |
|---|---|---|---|---|
| Idle | 136px | `Beam` | — | centered, muted label |
| Playing | 100 → 136 | track title (50px rest, 86px hover) | — | grows on hover/focus; transports replace title |
| Paused | 100 → 136 | track title, muted (30px rest, 86px hover) | play glyph | grows on hover/focus; transports replace title |
| Timer | 136px | `Focus` | `18:24` | tabular digits; media pip when music plays |
| Done | 136px | `Done` | gold check | gold 1px border |
| Files | 136px | `5 files` | — | red pip when a file is missing |
| Drag | 136px | `+3 files` | — | dashed gold border |

## 6. Panel Specifications
- **Panel Dimensions:** `420×300` body inside a `452×332` open window. Radius 16px, 1px border, no footer, 8px body padding.
- **Tab Bar (40px):** Four equal tabs, flat: no track background, no padding box, no selected fill. Tabs are 28px tall with 14px Lucide icons and 12px labels. The selected tab is gold icon + gold label at weight 500; hover is a faint `--secondary` wash on the tab itself. The settings icon sits at the far right with the same treatment. Tabs are keyboard-navigable (arrows, Home, End).
- **Music Tab:** 148×148 square art on the left, framed as an inset card (`12px` radius, 1px border). Right column: title and artist with a status pip, a read-only position bar with elapsed/total in 11px tabular digits, and an elevated 38px circular primary play/pause with 16px gap to 30px flanking controls. Empty and loading states use the mascot or skeleton lines.
- **Files Shelf:** 36px rows separated by 1px dividers, with plain 14px status icons (no icon box), status pips (green present / red missing), 26-character middle-truncated filenames, right-aligned badges for size, `Folder`, or a danger `Missing` badge, and 24px copy/remove buttons that appear on hover or focus. Row hover is a faint `--secondary` wash. Five rows fit; more scroll. Pinned bottom actions: Copy All / Add / Clear All. The empty state is a dashed drop well with an Add files button.
- **Timer Tab:** 28px preset chips; a custom 1–999 minute inline field; 40px digits; 12px note; Start in idle, Cancel in running, Start again and Dismiss in done.
- **Calendar Tab:** Header with 28px left/right chevrons, month title, and Today. Seven columns; the first day of the week follows the Windows locale (Sunday fallback); two-letter locale weekday headers at 11px; always six week rows, padded with adjacent-month days, so the grid never jumps; today is gold.
- **Settings Tab:** Five 44px rows separated by 1px dividers, no row gap: Start with Windows switch, toggle shortcut keycaps, chime volume with −/+ and a test button, Dark theme switch, Reset position. 36×20 switch, 20px keycaps, 28px steppers.

## 7. Motion, Typography & Code Architecture
- **Font Stack:** Inter variable vendored in `assets/fonts/` (fallback `Segoe UI Variable Text`, `Segoe UI`, `sans-serif`). Tabular numerals for timer and position digits.
- **Type Scale:** `11 / 12 / 13 / 15 / 40px` only. Capsule title 12/600, capsule digits 15/600, panel title 15/600, settings rows and calendar title 13, hints and badges 11, timer digits 40. No 10px text.
- **Spacing Scale:** `4 / 8 / 12 / 16px` (`--space-1`…`--space-4`). One 8px gap between panel body blocks; list internals use 4px.
- **Motion Scale:** 120ms hover and title/transport crossfade, 120ms music width growth, 150ms panel grow, 100ms press (`scale(0.96)`). Transitions animate opacity, transform, background, border-color, box-shadow, and the music capsule width; no other layout property animates. `prefers-reduced-motion` is honored.
- **Public API:** `src/renderer/ui/index.ts` exporting pure HTML component functions (`pill`, `panel`, `iconSprite`, `middleTruncate`).
- **Styles Architecture:** Split into `tokens.css`, `base.css`, `pill.css`, `panel.css`, `controls.css`, `tabs.css` under `src/renderer/styles/`.

---

# PART 2: MARKETING WEBSITE & BRAND LAB (Post-v1 / Reference Only)

> [!NOTE]
> The marketing website is post-v1 and not part of the desktop app runtime or build. Never ship assets from `showcase/`.

## 8. Marketing Website Direction & Brand Identity
- **Design Theme:** Notion-like warm light gray canvas (`#f5f5f5`), pure white cards (`#ffffff`), and crisp 0.5px hairline borders.
- **Editorial Tone:** Calm lowercase copy punctuated with periods (`meet beam.`, `one bar for everything.`).
- **Hand-Drawn Accent Font:** `Caveat` (weight 600) for notes, arrow callouts, and doodle captions (website only; never in desktop app).

### Marketing Web Tokens
| Token | Hex / Value | Purpose |
|---|---|---|
| `--bg` | `#f5f5f5` | Page background canvas (warm light gray) |
| `--surface` | `#ffffff` | Cards, floating nav pill, pricing cards |
| `--fill` | `#e9e8ea` | Sub-wells, preview tracks, recessed stages |
| `--track` | `#d4d4d4` | Progress tracks, slider backdrops |
| `--side` | `#f2f2f4` | Sidebar and nested panel background |
| `--k-line` | `rgba(0, 0, 0, 0.08)` | 0.5px hairline borders |
| `--ink` | `#000000` | Primary text and headings |
| `--ink-2` | `rgba(0, 0, 0, 0.64)` | Subtitles, lede paragraphs, secondary copy |
| `--ink-3` | `rgba(0, 0, 0, 0.56)` | Captions, timestamps, disabled indicators |
| `--sel` | `#0a84ff` | Primary action / selection blue (Apple system blue) |
| `--folder` | `#5bb0ff` | File shelf folder accents |
| `--play` | `#ffd23f` | Timer progress / warning yellow |

## 9. Mascot Suite & Vector Assets
Governed by installed skills [`svg-logo-designer`](file:///d:/Beam/.agents/skills/svg-logo-designer/SKILL.md) and [`illustration-style`](file:///d:/Beam/.agents/skills/illustration-style/SKILL.md):
- **Character:** **Puffy Chubby Star** — Honey Gold (`#FFAA00`) 5-point polar harmonic cubic Bézier spline with 10 perpendicular tangent handles ($C^2$ smooth curvature).
- **Format:** Pure vector SVG in `assets/mascot/` (`beam-mascot.svg`). Single canonical brand mascot across all views; the five retired `star-*` variants were deleted 2026-10-28.
- **Brand Lab:** `showcase/index.html` (frozen reference brand lab; never shipped in production).
