# DESIGN.md — Visual System & Design Specifications

This document defines the two visual systems of Beam:
1. **Primary: Desktop App UI System (v1 target surface)** — The offline Windows 11 floating capsule and panel. Music, Files, Timer, Calendar, and Settings are all live.
2. **Reference: Marketing Website & Brand Lab (Post-v1 / Reference Only)** — The showcase and landing page aesthetic.

---

# PART 1: DESKTOP APP UI SYSTEM (v1 target surface)

## 1. Aesthetic Direction & Craft
- **Design Theme:** Solid desktop system in the macOS style: opaque shell (`#151517` dark / `#eceae6` light), brand gold (`#ffaa00`), neutral text (`#ededed` dark / `#1b1b19` light), 1px hairline border, standard filled buttons, keycap shortcuts, status dots, and one static mascot.
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
| `--track` | `#636368` | Unfilled seek rail (3.05:1 on the shell) |
| `--primary` | `#ffaa00` | Brand gold: primary action, selected tab text |
| `--primary-text` | `#ffaa00` | Gold text and thin strokes: timer digits, done check, today, position bar fill |
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
| `--card` | `#eceae6` | Solid warm-greige light shell |
| `--border` | `rgba(0, 0, 0, 0.10)` | Hairline border |
| `--control` | `#dfddd8` | Solid light control fill |
| `--control-hover` | `#d4d1cb` | Solid light control hover |
| `--surface-hover` | `#e4e1dc` | Solid light row and tab hover |
| `--foreground` | `#1b1b19` | Primary text |
| `--muted-foreground` | `#5f5d59` | Secondary text (5.5:1) |
| `--track` | `#8a847a` | Unfilled seek rail (3.1:1 on the light shell) |
| `--primary-text` | `#7a4e00` | High-contrast gold text (6.0:1) |
| `--destructive` | `#a61b12` | Missing files, cancel text (6.3:1 on the light shell) |

## 3. Window & Surface Geometry

| | Rest | Hover | Open |
|---|---|---|---|
| **Window** | 136×42 | 136×42 | 452×316 |
| **Visible Surface** | 94×30 capsule · music/paused 108 · quiet 26×26 · drag 128 | 128×30 capsule · music, timer, done | 420×284 panel |

- **Rest & Hover:** idle, timer, done, and files rest at `94×30`; music and paused rest at `108×30`; drag rests at `128×30`. Music, timer, and done grow to `128×30` on hover or keyboard focus over 120ms. Idle and files stay at rest and only brighten. There is one `136×42` window for all states, so the window never resizes on hover; the pill grows inside it, centered.
- **Zero-Flicker Hover:** Hover never resizes the window. It brightens the shell and border, grows the three states that have more to show, and swaps the resting fact for their actions. Nothing grows when there is nothing new to reveal.
- **Smooth Panel Expansion:** On click, the window expands to `452×316` with a 150ms ease-out; Beam animates even when Windows has window animations off, because the OS toggle made the open read as a hard snap. The OS window resizes immediately while compositor-driven CSS transforms handle the 150ms scale/fade expansion internally; on collapse, CSS animates out over 150ms before the window snaps back to `136×42`.
- **Screen-Aware Vertical Anchoring:** The panel anchors bottom-center and grows upward when the capsule is in the lower half of the display, and anchors top-center and grows downward when in the upper half.
- **Edge Clamping:** Horizontal coordinates clamp to keep at least 8px margin from display boundaries.
- **Pointer Drag:** Press and move anywhere on the capsule body to move the window; 4px of movement separates a drag from a click, so a plain click still expands the panel. The window stays at its pinned size, clamps inside a display's work area, and saves its position to `%APPDATA%\Beam\settings.json`; Reset Position re-anchors it above the primary taskbar. Transport and action buttons never start a drag.
- **Click Isolation:** Transport buttons stop propagation and toggle playback directly; only clicks on the mascot, title, or empty capsule body trigger panel expansion.
- **Lightweight Dismissal:** `Esc`, tray toggle, or clicking outside collapses the window. Opening focuses Beam so `Esc` and outside-click have a target; closing does not reactivate another app.
- **Quiet Idle:** after 10s with no music, no shelf files, no hover, and the panel closed, the idle capsule becomes a `26×26` star-only nub (18px star at 60%) inside the same window. The cursor within `37px` of the nub centre (about 24px off its edge, polled at 4Hz by main) wakes it to the full 94px idle pill; music, a file, or an open panel also wake it. Near and hover never reveal actions by themselves. Leaving the near zone or hover returns it to quiet after 2s.
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
- **Geometry:** `26×26` for quiet, `94×30` at rest for idle, timer, done, and files, `108×30` for playing and paused; drag is `128×30`. Music, timer, and done grow to `128×30` on hover or focus. Radius 999, padding `0 8px`, 1px hairline border, shell `#151517`. One `136×42` window for every state.
- **Mascot Mark:** 20px master mark followed by an 8px gap. Music states swap it for the 20px album thumbnail (6px radius) when artwork exists; the star is the fallback. At idle rest the star dims to 70% and returns to full on hover. The mark fades out on music and done hover so the actions keep the 8px edge padding. Static otherwise; no hover transform.
- **Keyboard:** the capsule is one tab stop; Enter or Space opens the panel, and keyboard focus draws a 2px `--ring` outline with a 2px offset. Closing the panel returns focus to the capsule; opening it moves focus into the panel.
- **Hover Reveal:** The resting pill shows one fact in a slot: a title, digits, a check, or a count. Music and paused rest at 108px with a 62px title slot, then swap the thumbnail and title for three 28px transports plus a 20px chevron at `128×30`; their overlay spans the full pill, leaving 8px on each side. The chevron opens the panel; the transports never do. Timer keeps its digits and reveals a 28px cancel at the slot end (the slot grows from 48 to 82). Done swaps the 16px check for `Done` plus a 28px dismiss. Idle and files reveal nothing and stay at rest.
- **Done:** at rest the capsule shows the star and a centered 16px gold check with a gold 1px border. On hover or focus the check fades and `Done` plus a 28px dismiss fade in. No digits and no glow.
- **Paused:** no glyph. Paused rests at 108px and shows the album thumbnail (or the star) with a 6px amber dot and the full 62px title slot; the title stays muted and the artwork stays crisp. The title fades out on hover for the transports.
- **Shelf Count:** a non-empty shelf shows its count (`5 files`, `1 file`), capped at 50 entries. Dragging files over the capsule shows the drag state with the incoming count (`+3 files`). A drop that would pass the cap keeps 50 and the capsule reads `Max 50` for 2.4s before settling on `50 files`. A missing file turns the mascot dot red; the row carries the name and red `Missing` text. An empty shelf falls back to idle, so there is no `0 files` state.
- **Status Dots:** 6px green while playing, amber when paused, red when a shelf file is missing. A timer carries the background music's dot. Gold stays brand and primary.
- **Dual-State Collision (Timer + Music):** Countdown takes capsule prominence (digits only) with a 6px green dot on the mascot while audio plays, amber when paused.
- **Precedence:** drag, then timer, then music, then files, then quiet, then idle.

| State | Width | Line | Right slot | Extra |
|---|---|---|---|---|
| Quiet | 26px | — | — | 18px star at 60%; wakes on a near cursor, hover, music, files, or an open panel; returns 2s after they leave |
| Idle | 94px | `Beam` | — | centered; star 70%, label muted; hover brightens both |
| Playing | 108 → 128 | track title (62px rest) | — | 20px thumbnail + green dot; hover: thumbnail and title fade, transports fade in |
| Paused | 108 → 128 | track title, muted (62px rest) | — | 20px thumbnail + amber dot; hover: thumbnail and title fade, transports fade in |
| Timer | 94 → 128 | digits only | 28px cancel on hover | tabular digits; green dot when music plays, amber when paused |
| Done | 94 → 128 | gold check | `Done` + 28px dismiss on hover | gold 1px border |
| Files | 94px | `5 files` | — | no growth; cap 50 with a `Max 50` notice; red dot when a file is missing |
| Drag | 128px | `+3 files` | — | dashed gold border |

## 6. Panel Specifications
- **Panel Dimensions:** `420×284` body inside a `452×316` open window. Radius 16px, 1px border, no footer, 8px body padding. One fixed height for every tab — switching tabs never resizes the window — and each tab body centers its content, so leftover space splits top and bottom instead of pooling under the content. A long file list scrolls inside the fixed height.
- **Tab Bar (40px):** Four equal content tabs — Music, Files, Timer, Calendar — plus a compact 28px icon-only Settings button on the right. Flat: no track background, no padding box, no selected fill. The four content tabs carry a 14px Lucide icon and a 12px label; Settings is the sliders icon with an `aria-label` and title. The selected tab is gold icon + gold label at weight 500 plus a 2px gold underline inset 8px (6px on the compact Settings button). Hover is a solid `--surface-hover` fill on the tab itself. Tabs are keyboard-navigable (arrows, Home, End). The panel opens to the last feature used this session — a drop or picker, a Files action, a transport, the timer, the calendar, a tab visit, or the tray's Settings item — and with no history picks Music when a session exists, else Files when the shelf holds rows, else Music.
- **Music Tab:** 148×148 square art on the left with a `12px` radius and no border. The right column (242px at the default width) stacks the title (15/600, up to two lines), the artist with the 6px status dot on the same line, a seek slider with elapsed/total in 11px tabular digits, and the three transports, 12px apart and vertically centered against the art. The seek slider is a 14px hit strip around a 4px rail with a 10px gold knob; it is a focusable `role="slider"`: drag, click, ←/→ (5s), Home/End, and each commit goes through `music.seek` to the helper, with a silent repaint of the last known position when the player refuses. The transport is a solid 38px circular primary play/pause with 16px gap to 30px flanking controls. No artwork shows the 48px star on the panel background — no gray tile. Nothing playing uses the designed empty state — mascot, `No music playing`, `Start playback in any app` — with no transport row, so the panel never shows dead controls. Loading uses skeleton lines.
- **Files Shelf:** 36px flush rows separated by 1px dividers, with plain 14px status icons (no icon box, no pips), 26-character middle-truncated filenames, right-aligned 11px text for size, `Folder`, or red `Missing`, and 24px copy/remove buttons that appear, and accept clicks, only on hover or focus. A missing row keeps only Remove; copy would fail. Existing rows drag out with their real path; missing rows cannot be dragged, and the capsule itself still moves the window. Row hover is a solid `--surface-hover` fill. Five rows fit; more scroll. Pinned bottom actions: an 11px muted `Files clear on quit` line takes the left end, with solid gold Copy all, text Add files, and red text Clear all pushed right. Add files (and the empty state) opens the Windows file picker. A visible status line reports Added / Removed / Copied / `Max 50`, a remove offers Undo for 5s, and quitting with rows asks before clearing them. The note exists only while the list holds rows. Copy all disables when every row is missing; Clear all asks for a second click. The empty state is a dashed drop well with an Add files button.
- **Timer Tab:** 28px preset chips, always visible, with 25 min selected by default; the custom mode shows a 1–999 minute inline field with a `Set` chip below the chips; 40px digits; 12px note. The countdown face is fixed at the panel centre in every mode, presets sit at the top, and Start/Cancel/Done actions stay pinned to the bottom, so starting or cancelling never moves the digits. Done shows a 40px gold check plus `Time’s up` with Start again and Dismiss.
- **Calendar Tab:** Header with 28px left/right chevrons, month title, and Today. Today is an active 28px control with foreground text, not a muted disabled-looking chip. A real table with seven columns, full weekday names as column headers, and a full date label on every current-month cell; the first day of the week follows the Windows locale (Sunday fallback); two-letter locale weekday headers at 11px; only the weeks the month needs (five, or six when the month spills), padded with adjacent-month days, so days get a taller, calmer cell; today is gold.
- **Settings Tab:** Five 44px rows separated by 1px dividers, no row gap: Start with Windows switch, Shortcut as keycaps without an outer box (`Click the keys to change it`), chime volume as plain 12px text with −/+ and a test button, theme row naming the current `Dark` / `Light` mode beside the dark-mode switch, Reset position. 36×20 switch, 20px keycaps, 28px steppers with 8px radii.

## 7. Motion, Typography & Code Architecture
- **Font Stack:** Inter variable vendored in `assets/fonts/` (fallback `Segoe UI Variable Text`, `Segoe UI`, `sans-serif`). Tabular numerals for timer and position digits.
- **Type Scale:** `11 / 12 / 13 / 15 / 40px` only. Capsule title 12/600, capsule digits 15/600, panel title 15/600, settings rows and calendar title 13, hints and row metadata 11, timer digits 40. No 10px text.
- **Spacing Scale:** `4 / 8 / 12 / 16px` (`--space-1`…`--space-4`). One 8px gap between panel body blocks; list internals use 4px.
- **Motion Scale:** 120ms hover and content/action crossfade, 120ms width growth for music, timer, and done, 150ms panel grow, 100ms press (`scale(0.96)`). Transitions animate opacity, transform, background, border-color, box-shadow, the capsule width, and the timer action width; no other layout property animates. Beam always runs its own motion and ignores `prefers-reduced-motion`, because this machine has Windows animations off and honoring it made the panel open read as a hard snap (decision 2026-10-29).
- **Public API:** `src/renderer/ui/index.ts` exporting pure HTML component functions (`pill`, `panel`, `iconSprite`, `middleTruncate`).
- **Code Architecture:** `ui/capsule/` owns the capsule, `ui/panel/` owns the shell and tab navigation, `ui/panel/tabs/` owns one module per tab, and `ui/shared/` owns escaping, formatting, icons, and the mascot path. `src/shared/ipc.ts` owns the 28 channel names and the payload types shared by main, preload, and renderer.
- **Styles Architecture:** One file per component under `src/renderer/styles/`: `tokens.css`, `base.css`, `capsule.css`, `panel/shell.css`, `panel/body.css`, `controls/buttons.css`, `controls/fields.css`, `controls/indicators.css`, and one file per tab under `tabs/`.

---

# PART 2: MARKETING WEBSITE & BRAND LAB (Post-v1 / Reference Only)

> [!NOTE]
> The marketing website is post-v1 and not part of the desktop app runtime or build. Never ship assets from `showcase/`.

## 8. Marketing Website Direction & Brand Identity
- **Design Theme:** Notion-like warm paper canvas (`#f7f7f5`) with white surfaces and 1px hairline dividers. No cards on the landing page; sections sit on the paper and separate by hairlines.
- **Type:** Inter (self-hosted variable, `site/public/fonts/InterVariable.woff2`) for all UI and body text, including numerals. Caveat (self-hosted, `site/public/fonts/Caveat.woff2`) for exactly two hand-drawn accents on the landing page: the hero aside and the demo hint. No system display faces and no mono.
- **Editorial Tone:** Calm lowercase copy punctuated with periods; short lines, no feature-card grids, no stat blocks. One voice everywhere: lowercase nav/footer links and section heads, sentence-case body, two-sentence feature blurbs, "bar" in visible copy (never "pill"), "See it live" as the primary CTA while no build is published, "Download for Windows" only when a release exists, Windows 11 only. No claim the build does not prove.
- **Real UI demo:** the landing page embeds the actual app renderer. `site/demo/main.ts` imports `src/renderer/ui` plus `src/renderer/styles.css`; Vite builds it into `site/public/demo`, and the page iframes it at real sizes (136×42 closed, 452×316 open) with same-origin postMessage resizing and a collapsed stage when closed. Never rebuild the demo as hand-written markup.
- **Demo audio:** two free-licensed local MP3s — Ovo (Arulo, Mixkit Free Licence) and Carti Bih (Arulo, Mixkit Free Licence) — played by a real `HTMLAudioElement` driving the pill and panel progress. Covers are generated 512px WebP demo art. No YouTube, no streaming, no external requests; credits live in `site/demo/public/CREDITS.txt`.
- **Hero lockup:** the star sits on the tail of "meet beam." as an overlapping superscript, not as a separate icon. It is inline SVG (`site/src/components/brand.tsx`), not a static image: the wink chevron and the open eye blink on separate loops while the whole star bobs on a 4.6s loop and spring-spins on hover. Copy is "meet beam." / "music, files, time — all in one place." / "no windows to manage." The hint sits above a hand-drawn stroke arrow (`site/src/components/brand.tsx`, 90×110 path, drawn at 56×68) in normal flow, nudged down so its tip sits 12px above the pill; it never blocks a click; the supplied filled 122×148 arrow was the style reference, not the final path. The hero aside is Notion orange and the hint + arrow Notion purple, the only coloured handwriting; the four feature chips keep the blue/orange/green/purple tints. Both motion loops respect reduced motion. The navbar is sticky on the paper background and keeps features / demo / faq visible at 390px (github moves to the footer).
- **Type scale:** hero `clamp(2.2rem, 5.6vw, 3.9rem)` (62.4px at 1440); section h2 24px mobile / 28px desktop; hero subline 20/22px; body 16px; feature body and proof 15px; feature titles 16px; captions, footer and micro copy 13px; Inter only, tabular numerals for times.
- **Download path:** no release is published yet, so the hero leads with "See it live" and "Build from source"; the nav's "get beam" anchors to the honest download section. A four-item strip (System / Status / Shortcut / Build) states Windows 11, not published, Alt + Space, unsigned preview. When a build ships, point the primary CTA at GitHub `releases/latest`. Packaging ships `BeamBridge.exe` and `tray.ico` through electron-builder `extraResources` and resolves them from `process.resourcesPath` when packaged.
- **FAQ on the page:** the standalone `/faq` route and the `up close.` live-panel section are gone. The home page carries a `questions.` details block (`#faq`, 8 rows) after the features and before the download, using the same hairlines, 16px question and 15px answer, with the plus icon rotating 45° when open. The nav, footer and the unsigned-preview note deep-link to `#faq`.
- **Panel visibility:** opening the demo panel scrolls it into view only when it would fall below the fold or under the sticky header; reduced motion makes that jump instant. Below 360px the features link leaves the navbar, and the open panel uses 0.72 zoom down to 340px and 0.66 below that. Open demo tabs pause each other over a same-origin `BroadcastChannel`, so only one track plays. Mobile keeps the closed pill at 1× (136×42 iframe) and only zooms the open panel.
- **Small pages:** a branded `app/not-found.tsx` (`nothing here.`) exports as `404.html`. `/changelog` lists the dated preview work and links the journal. `sitemap.xml` and `robots.txt` are static exports and the sitemap no longer lists `/faq`. A skip link precedes the header, every page has one `h1` and a `main#content`, muted text measures 6.21:1 on paper, and internal `Link`s set `prefetch={false}` to avoid the static-export RSC 404. The Files demo accepts real OS file drops (real names and sizes); copy and drag-out remain app-only.
- **Hint:** “go on, click the star.” is centred, and the arrow sits below it in normal flow, its tip 12px above the pill with no text overlap.

### Marketing Web Tokens
| Token | Hex / Value | Purpose |
|---|---|---|
| `--paper` | `#f7f7f5` | Page background canvas |
| `--surface` | `#ffffff` | Buttons, inputs, raised controls |
| `--ink` | `#191918` | Primary text and headings |
| `--muted` | `#5f5c56` | Body copy, captions, secondary links |
| `--hairline` | `#e9e9e7` | 1px dividers and control borders |
| `--hover` | `#f1f1ef` | Hover fill for ghost controls |
| `--gold` | `#ffaa00` | Brand accent (matches the app's `--primary`) |
| `--blue` | `#2383e2` (tint `#d3e5ef`) | Music icon only |
| `--orange` | `#d9730d` (tint `#fadec9`) | Files icon |
| `--green` | `#448361` (tint `#dbeddb`) | Timer icon |
| `--purple` | `#9065b0` (tint `#e8deee`) | Calendar icon |
| `--red` | `#d44c47` | Error text only |

Notion tag colours are limited to the four tinted feature icon chips, never body text. Primary buttons are ink with white text; blue is not a primary colour. Text selection is a soft gold. The star bobs and tilts on a 4.6s loop and spins on hover; both are disabled under `prefers-reduced-motion`.

## 9. Mascot Suite & Vector Assets
Governed by installed skills [`svg-logo-designer`](file:///d:/Beam/.agents/skills/svg-logo-designer/SKILL.md) and [`illustration-style`](file:///d:/Beam/.agents/skills/illustration-style/SKILL.md):
- **Character:** **Puffy Chubby Star** — Honey Gold (`#FFAA00`) 5-point polar harmonic cubic Bézier spline with 10 perpendicular tangent handles ($C^2$ smooth curvature).
- **Format:** Pure vector SVG in `assets/mascot/` (`beam-mascot.svg`). Single canonical brand mascot across all views; the five retired `star-*` variants were deleted 2026-10-28.
- **Brand Lab:** `showcase/index.html` (frozen reference brand lab; never shipped in production).
