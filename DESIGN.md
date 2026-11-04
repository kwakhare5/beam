# DESIGN.md — Visual System & Design Specifications

This document defines the two visual systems of Beam:
1. **Primary: Desktop App UI System (v1 target surface)** — The offline Windows 11 floating capsule and panel. Music and Files are live; Timer, Calendar, and Settings remain preview-only.
2. **Reference: Marketing Website & Brand Lab (Post-v1 / Reference Only)** — The showcase and landing page aesthetic.

---

# PART 1: DESKTOP APP UI SYSTEM (v1 target surface)

## 1. Aesthetic Direction & Craft
- **Design Theme:** Solid desktop system in the macOS style: opaque shell (`#151517` dark / `#f4f4f2` light), brand gold (`#ffaa00`), neutral text (`#ededed`), 1px hairline border, standard filled buttons, keycap shortcuts, status dots, and one static mascot.
- **No Glass:** Surfaces are opaque. No backdrop blur, no translucent shell, no reflections, no inner rims, no glow, no gradients. A soft shadow is allowed only to lift the floating window off the desktop.
- **Canonical App Preview:** `showcase/app-preview.html` is the single file used to review every app UI state. It loads the app's real stylesheet and shared view functions (`src/renderer/ui/`), so it must be opened with `npm run ui`, never from disk. Every phase extends that file; no other preview or mock file is ever created.
- **Copy Tone:** Clear, calm, and understated. Standard sentence and title casing (`No music playing`, `Drop files here`, `Done`, `Missing`). No forced lowercase rule.

## 2. Desktop App Tokens (CSS Variables)

### Dark Theme (Primary Default)
Defined in [`src/renderer/styles/tokens.css`](file:///d:/Beam/src/renderer/styles/tokens.css):

| Token | Value | Purpose |
|---|---|---|
| `--border` | `rgba(255, 255, 255, 0.08)` | 1px border on capsule and panel |
| `--card` | `#151517` | Solid dark surface |
| `--control` | `#252527` | Solid control fill: buttons, chips, switches, inputs |
| `--control-hover` | `#303032` | Solid control hover |
| `--surface-hover` | `#1d1d1f` | Solid row and tab hover |
| `--foreground` | `#ededed` | Primary text |
| `--muted-foreground` | `#8a8a8a` | Subtitles, metadata, inactive tabs |
| `--primary` | `#ffaa00` | Brand gold: primary action, selected tab text |
| `--primary-text` | `#ffaa00` | Gold text: timer digits, done check, today |
| `--destructive` | `#ff453a` | Missing files, cancel text (5:1 on the shell) |
| `--pip-green` | `#22c55e` | Playing/present status dot |
| `--pip-amber` | `#f59e0b` | Paused status dot |
| `--shadow-pill` | `0 1px 2px rgba(0,0,0,.24), 0 2px 4px rgba(0,0,0,.18)` | Capsule lift inside the window margin |
| `--shadow-panel` | `0 4px 16px -2px rgba(0,0,0,.45), 0 1px 3px rgba(0,0,0,.3)` | Panel shadow inside the 16px open margin |
| `--space-1` … `--space-4` | `4 / 8 / 12 / 16px` | The only spacing steps |
| `--ease` | `cubic-bezier(0.16, 1, 0.3, 1)` | Standard easing |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Press easing |
| `--font-sans` | `Inter, 'Segoe UI Variable Text', 'Segoe UI', sans-serif` | Type stack |

### Light Theme (User Toggle)
Light overrides every color token in the `[data-theme='light']` block of `tokens.css`. The key differences:

| Token | Value | Purpose |
|---|---|---|
| `--card` | `#f4f4f2` | Solid light shell |
| `--border` | `rgba(0, 0, 0, 0.08)` | Hairline border |
| `--control` | `#e7e7e5` | Solid light control fill |
| `--control-hover` | `#dedddb` | Solid light control hover |
| `--surface-hover` | `#eeeeec` | Solid light row and tab hover |
| `--foreground` | `#111111` | Primary text |
| `--muted-foreground` | `#6b6b6b` | Secondary text |
| `--primary-text` | `#8a5a00` | High-contrast gold text |
| `--destructive` | `#d92d20` | Missing files |

## 3. Window & Surface Geometry

| | Rest | Hover | Open |
|---|---|---|---|
| **Window** | 136×42 | 136×42 | 452×316 |
| **Visible Surface** | 94×30 capsule · drag 128 | 128×30 capsule · music, timer, done | 420×284 panel |

- **Rest & Hover:** idle, playing, paused, timer, done, and files rest at `94×30`; drag rests at `128×30`. Music, timer, and done grow to `128×30` on hover or keyboard focus over 120ms. Idle and files stay `94×30` and only brighten. There is one `136×42` window for all states, so the window never resizes on hover; the pill grows inside it, centered.
- **Zero-Flicker Hover:** Hover never resizes the window. It brightens the shell and border, grows the three states that have more to show, and swaps the resting fact for their actions. Nothing grows when there is nothing new to reveal.
- **Smooth Panel Expansion:** On click, the window expands to `452×316` with a 150ms ease-out; Beam animates even when Windows has window animations off, because the OS toggle made the open read as a hard snap. The OS window resizes immediately while compositor-driven CSS transforms handle the 150ms scale/fade expansion internally; on collapse, CSS animates out over 150ms before the window snaps back to `136×42`.
- **Screen-Aware Vertical Anchoring:** The panel anchors bottom-center and grows upward when the capsule is in the lower half of the display, and anchors top-center and grows downward when in the upper half.
- **Edge Clamping:** Horizontal coordinates clamp to keep at least 8px margin from display boundaries.
- **Pointer Drag:** Press and move anywhere on the capsule body to move the window; 4px of movement separates a drag from a click, so a plain click still expands the panel. The window stays at its pinned size, clamps inside a display's work area, and saves its position to `%APPDATA%\Beam\settings.json`; Reset Position re-anchors it above the primary taskbar. Transport and action buttons never start a drag.
- **Click Isolation:** Transport buttons stop propagation and toggle playback directly; only clicks on the mascot, title, or empty capsule body trigger panel expansion.
- **Lightweight Dismissal:** `Esc`, tray toggle, or clicking outside collapses the window. Opening focuses Beam so `Esc` and outside-click have a target; closing does not reactivate another app.
- **Quiet Idle:** after 20s with no music, no shelf files, no hover, and the panel closed, the idle capsule becomes a 30×30 star-only nub inside the same window; hover, music, a file, or an open panel wakes it, and leaving hover returns it after 2s.
- **Shaped Hit Area:** the window clips to the visible pill plus a 6px halo (the full 452×316 when open), so clicks in the old margins reach the desktop instead of opening the panel.
- **Shadow Margins:** the `136×42` window leaves 21px on each side of the rest capsule and 6px above and below it; an expanded capsule leaves 4px on each side. The open window leaves 16px on all sides, so the panel shadow has room and the margin still counts as an outside click.

## 4. Radii & Component Hierarchy
- **One Fill Level:** every surface is flat by default. Never put a filled or bordered box inside another one: no tab pill inside a track, no icon box inside a row, no chip around row metadata. State comes from color, spacing, and 1px dividers. A control may carry one fill or one border, never both a parent fill and its own.
- **Solid Fills:** every fill is opaque: `--control`, `--control-hover`, `--surface-hover`, `--card`, or `--primary`. No translucent overlays, no glass chips, no gradient, no inner rim.
- **Panel Shell:** `16px` (`--r-panel`)
- **Cards & Album Art:** `12px` (`--r-card`)
- **Controls, Buttons & Chips:** `8px` (`--r-control`)
- **Micro Badges & Date Cells:** `6px` (`--r-micro`)
- **Pills, Capsules & Switches:** `999px` (`--r-pill`)

## 5. Capsule Specifications
- **Geometry:** `30×30` for quiet, `94×30` at rest for idle, playing, paused, timer, done, and files; drag is `128×30`. Music, timer, and done grow to `128×30` on hover or focus. Radius 999, padding `0 8px`, 1px hairline border, shell `#151517`. One `136×42` window for every state.
- **Mascot Mark:** 24px master mark followed by an 8px gap. Music states swap it for the 24px album thumbnail (6px radius) when artwork exists; the star is the fallback. At idle rest the star dims to 70% and returns to full on hover. The mark fades out on music and done hover so the actions keep the 8px edge padding. Static otherwise; no hover transform.
- **Keyboard:** the capsule is one tab stop; Enter or Space opens the panel, and keyboard focus draws a 2px gold `:focus-visible` ring with a 2px offset. Closing the panel returns focus to the capsule; opening it moves focus into the panel.
- **Hover Reveal:** The resting pill shows one fact in a 46px slot: a title, digits, a check, or a count. Music and paused swap the thumbnail and title for three 28px transports plus a 20px chevron at `128×30`; their overlay spans the full pill, leaving 14px on each side. The chevron opens the panel; the transports never do. Timer keeps its digits and reveals a 28px cancel at the slot end (the slot grows from 46 to 80). Done swaps the 16px check for `Done` plus a 28px dismiss. Idle and files reveal nothing and keep `94×30`.
- **Done:** at rest the capsule shows the star and a centered 16px gold check with a gold 1px border. On hover or focus the check fades and `Done` plus a 28px dismiss fade in. No digits and no glow.
- **Paused:** no glyph. Paused shows the album thumbnail (or the star) with a 6px amber dot and keeps the full 46px title slot; the title stays muted and the artwork stays crisp. The title fades out on hover for the transports.
- **Shelf Count:** a non-empty shelf shows its count (`5 files`, `1 file`), capped at 50 entries. Dragging files over the capsule shows the drag state with the incoming count (`+3 files`). A drop that would pass the cap keeps 50 and the capsule reads `Max 50` for 2.4s before settling on `50 files`. A missing file turns the mascot dot red; the row carries the name and red `Missing` text. An empty shelf falls back to idle, so there is no `0 files` state.
- **Status Dots:** 6px green while playing, amber when paused, red when a shelf file is missing. A timer carries the background music's dot. Gold stays brand and primary.
- **Dual-State Collision (Timer + Music):** Countdown takes capsule prominence (digits only) with a 6px green dot on the mascot while audio plays, amber when paused.
- **Precedence:** drag, then timer, then music, then files, then quiet, then idle.

| State | Width | Line | Right slot | Extra |
|---|---|---|---|---|
| Quiet | 30px | — | — | star only at 60%; wakes on hover, music, files, or an open panel; leaves 2s after hover ends |
| Idle | 94px | `Beam` | — | centered; star 70%, label muted; hover brightens both |
| Playing | 94 → 128 | track title (46px rest) | — | 24px thumbnail + green dot; hover: thumbnail and title fade, transports fade in |
| Paused | 94 → 128 | track title, muted (46px rest) | — | 24px thumbnail + amber dot; hover: thumbnail and title fade, transports fade in |
| Timer | 94 → 128 | digits only | 28px cancel on hover | tabular digits; green dot when music plays, amber when paused |
| Done | 94 → 128 | gold check | `Done` + 28px dismiss on hover | gold 1px border |
| Files | 94px | `5 files` | — | no growth; cap 50 with a `Max 50` notice; red dot when a file is missing |
| Drag | 128px | `+3 files` | — | dashed gold border |

## 6. Panel Specifications
- **Panel Dimensions:** `420×284` body inside a `452×316` open window. Radius 16px, 1px border, no footer, 8px body padding. One fixed height for every tab — switching tabs never resizes the window — and each tab body centers its content, so leftover space splits top and bottom instead of pooling under the content. A long file list scrolls inside the fixed height.
- **Tab Bar (40px):** Four equal tabs — Music, Files, Timer, Calendar — flat: no track background, no padding box, no selected fill. Settings stays out of the app and the preview until 7.1. Tabs are 28px tall with 14px Lucide icons and 12px labels. The selected content tab is gold icon + gold label at weight 500 plus a 2px gold underline inset 8px. Hover is a solid `--surface-hover` fill on the tab itself. Tabs are keyboard-navigable (arrows, Home, End). The panel opens to the last feature used this session — a drop or picker, a Files action, a transport, the timer, the calendar, or a tab visit — and with no history picks Music when a session exists, else Files when the shelf holds rows, else Music.
- **Music Tab:** 148×148 square art on the left with a `12px` radius and no border; title and artist with a status dot on the right. A read-only position bar with elapsed/total in 11px tabular digits and one transport row span the full panel width below, on the standard 8px block rhythm. The transport is a solid 38px circular primary play/pause with 16px gap to 30px flanking controls. No artwork shows the 48px star on the panel background — no gray tile. Nothing playing uses the designed empty state — mascot, `No music playing`, `Start playback in any app` — with no transport row, so the panel never shows dead controls. Loading uses skeleton lines.
- **Files Shelf:** 36px flush rows separated by 1px dividers, with plain 14px status icons (no icon box, no pips), 26-character middle-truncated filenames, right-aligned 11px text for size, `Folder`, or red `Missing`, and 24px copy/remove buttons that appear, and accept clicks, only on hover or focus. A missing row keeps only Remove; copy would fail. Existing rows drag out with their real path; missing rows cannot be dragged, and the capsule itself still moves the window. Row hover is a solid `--surface-hover` fill. Five rows fit; more scroll. Pinned bottom actions: an 11px muted `Files clear on quit` line takes the left end, with solid gold Copy All, text Add files, and red text Clear All pushed right. Add files (and the empty state) opens the Windows file picker. A visible status line reports Added / Removed / Copied / `Max 50`, a remove offers Undo for 5s, and quitting with rows asks before clearing them. The note exists only while the list holds rows. Copy All disables when every row is missing; Clear All asks for a second click. The empty state is a dashed drop well with an Add files button.
- **Timer Tab:** 28px preset chips, always visible, with 25 min selected by default; the custom mode shows a 1–999 minute inline field with a `Set` chip below the chips; 40px digits; 12px note; Start in idle and custom, Cancel in running. Done shows a 40px gold check plus `Time’s up` with Start again and Dismiss.
- **Calendar Tab:** Header with 28px left/right chevrons, month title, and Today. A real table with seven columns, full weekday names as column headers, and a full date label on every current-month cell; the first day of the week follows the Windows locale (Sunday fallback); two-letter locale weekday headers at 11px; only the weeks the month needs (five, or six when the month spills), padded with adjacent-month days, so days get a taller, calmer cell; today is gold.
- **Settings Tab:** Five 44px rows separated by 1px dividers, no row gap: Start with Windows switch, toggle shortcut as keycaps without an outer box, chime volume as plain 12px text with −/+ and a test button, theme row naming `Dark` or `Light` beside the switch, Reset position. 36×20 switch, 20px keycaps, 28px steppers.

## 7. Motion, Typography & Code Architecture
- **Font Stack:** Inter variable vendored in `assets/fonts/` (fallback `Segoe UI Variable Text`, `Segoe UI`, `sans-serif`). Tabular numerals for timer and position digits.
- **Type Scale:** `11 / 12 / 13 / 15 / 40px` only. Capsule title 12/600, capsule digits 15/600, panel title 15/600, settings rows and calendar title 13, hints and row metadata 11, timer digits 40. No 10px text.
- **Spacing Scale:** `4 / 8 / 12 / 16px` (`--space-1`…`--space-4`). One 8px gap between panel body blocks; list internals use 4px.
- **Motion Scale:** 120ms hover and content/action crossfade, 120ms width growth for music, timer, and done, 150ms panel grow, 100ms press (`scale(0.96)`). Transitions animate opacity, transform, background, border-color, box-shadow, the capsule width, and the timer action width; no other layout property animates. Beam always runs its own motion and ignores `prefers-reduced-motion`, because this machine has Windows animations off and honoring it made the panel open read as a hard snap (decision 2026-10-29).
- **Public API:** `src/renderer/ui/index.ts` exporting pure HTML component functions (`pill`, `panel`, `iconSprite`, `middleTruncate`).
- **Code Architecture:** `ui/capsule/` owns the capsule, `ui/panel/` owns the shell and tab navigation, `ui/panel/tabs/` owns one module per tab, and `ui/shared/` owns escaping, formatting, icons, and the mascot path. `src/shared/ipc.ts` owns the 18 channel names and the payload types shared by main, preload, and renderer.
- **Styles Architecture:** One file per component under `src/renderer/styles/`: `tokens.css`, `base.css`, `capsule.css`, `panel/shell.css`, `panel/body.css`, `controls/buttons.css`, `controls/fields.css`, `controls/indicators.css`, and one file per tab under `tabs/`.

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
