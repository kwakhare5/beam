# Beam UI

The shared language for the Beam desktop surface. Use these terms in code, docs, and review.

## Surfaces

**Capsule**:
The visible surface that hugs its content at rest: idle 78×30, files 80–88, music and paused 69–108, timer 122, done 108, drag 88, error 127, quiet 26×26. Every rest label centers the master mark and its text as one unit. Music alone expands on hover or focus, to 126×30 with four 24px controls. Idle dims the star to 70%; music shows the album thumbnail (or the star) and the title; paused adds an amber dot; timer shows digits and an always-visible 28px ×; done shows `Done` and the same 28px ×; files shows a count.
_Avoid_: pill, bar, bubble

**Rest window**:
The 136×42 transparent window that contains the capsule and its shadow margin. One size for every state; it never resizes on hover.
_Avoid_: pill window

**Pill position**:
The capsule window's saved top-left on screen, stored as x/y in `%APPDATA%\Beam\settings.json` after a drag. It is restored at launch when that rect still intersects a current display; Reset Position clears it and returns to the primary taskbar anchor.
_Avoid_: window coordinates, drag position

**Panel**:
The visible 420×284 open surface with tabs. No footer.
_Avoid_: popup, modal, card

**Open window**:
The 452×316 transparent window that contains the 420×284 panel and a 16px shadow margin.
_Avoid_: panel window

**Shell**:
The fill, 1px border, and shadow shared by the capsule and the panel.
_Avoid_: background, chrome

**Hover emphasis**:
Hover brightens the border in every state and brightens the idle label and star to 100. Music also expands once to 126×30 and fades the art and title for its four controls; the expansion snaps, so no target moves under a reaching cursor. No other state changes size. The window never resizes.
_Avoid_: hover resize, OS resize

**Hover action**:
The music hover row contains four 24px controls: previous, play/pause, next, and panel. Timer and done carry an always-visible 28px × (cancel / dismiss) at rest rather than on hover. Idle, files, and drag have no controls.
_Avoid_: hover button, hidden control

## Structure

**Tab**:
A content area in the panel: Music, Files, Timer, Calendar, or Settings.
_Avoid_: page, screen

**Content state**:
The data condition of the capsule: idle, playing, paused, timer, done, files, or drag.
_Avoid_: mode, variant

**Interaction state**:
The pointer or keyboard condition: rest, hover, focus, pressed, or disabled. It never changes the content state.
_Avoid_: hover state when a content state is meant

**State precedence**:
The order that decides which content state owns the capsule when several are active: drag, then timer, then music, then files, then idle.
_Avoid_: priority, winner

**Panel state**:
The data condition of a tab body: normal, empty, loading, or success.
_Avoid_: content state

**State component**:
A rejected idea: one component per content state. States are data; one capsule renders all of them.
_Avoid_: per-state component

**Transport isolation**:
Transport buttons (previous, play/pause, next) execute playback commands and stop event propagation; they never trigger panel expansion.
_Avoid_: media trigger

**Expansion anchor**:
The screen-aware origin of the panel relative to the capsule: downward when docked in the upper half of the display, upward when in the lower half.
_Avoid_: popup anchor, dock direction

**Edge clamping**:
Shifting the open window coordinates to preserve at least 8px margin from display boundaries when the capsule is docked near a screen edge.
_Avoid_: screen padding, window snapping

**Title / transport swap**:
The playing capsule shows the track title at rest in a hug-sized slot (108px max) and swaps the thumbnail and title for Previous / Play-Pause / Next / Panel on hover or focus while expanding once to 126px.
_Avoid_: dynamic width, text stretching

**Middle-truncation**:
Ellipsizing long filenames in the center (`quarterl…inal.xlsx`) to preserve both the title prefix and file format extension.
_Avoid_: end truncation, text clipping

**Showcase board**:
The unified single-canvas gallery view in `app-preview.html` displaying all capsule states and all five open panels simultaneously.
_Avoid_: dashboard, mock page

**Status dot**:
A 6px dot on the capsule mark: green while playing, amber when paused, red when a shelf file is missing. A timer carries the background music's dot. Gold is reserved for brand and primary actions, so a gold dot never signals state.
_Avoid_: notification dot, badge, media pip

**Drop well**:
The dashed empty area in the Files tab that accepts a drop and holds the Add button.
_Avoid_: drop zone, empty state

**Seek bar**:
The interactive progress slider in the Music tab showing elapsed and total time. Pointer drag or click, ←/→ 5s, and Home/End go through `beam:music:seek` to the helper, which clamps to the SMTC timeline; a refusal repaints the last known position.
_Avoid_: position bar, read-only bar

## Brand

**Master mark**:
The official Puffy Chubby Star mark (`beam-mascot.svg`), used at 20px in the capsule.
_Avoid_: logo, avatar, mini mark

**Mascot**:
The single canonical Puffy Chubby Star mark (`beam-mascot.svg`), used at 20px in the capsule and 48px in panel empty states. Secondary star variants are deleted.
_Avoid_: logo, avatar, fake stars

**Flat surface**:
A surface with at most one solid fill or border of its own and no filled parent behind it: no tab pill inside a track, no icon box inside a row, no chip around row metadata. State is shown with color, spacing, and 1px dividers.
_Avoid_: nested card, double box, track

**Solid fill**:
Every fill is opaque: `--control`, `--control-hover`, `--surface-hover`, `--card`, or `--primary`. No translucent overlay, glass chip, gradient, inner rim, or glow. Row metadata is plain text, not a badge.
_Avoid_: glass fill, translucent wash, frosted chip

**Mini mark**:
A rejected custom glyph that replaced the mascot in the capsule. Do not use.
_Avoid_: mini mascot, star glyph

## Style

**Primary**:
The single gold brand color (`#FFAA00`) used for the current tab, primary action, timer digits, today, and the done check.
_Avoid_: accent, brand color

**Accent**:
The neutral hover surface in the shadcn token vocabulary. It is not the gold.
_Avoid_: primary, gold

**Transport**:
The filled media glyphs (previous, play/pause, next) in the same 24px Lucide sprite. UI icons stay 2px outline.
_Avoid_: filled icon set, second icon library

**Focus ring**:
The capsule body, its controls, and panel controls use one 2px neutral `--ring` outline with a 2px offset. No glow.
_Avoid_: gold glow, double ring

**shadcn-style**:
The token vocabulary, 8px grid, Lucide icons, and component patterns used in the vanilla renderer.
_Avoid_: shadcn/ui

**shadcn/ui**:
The React + Tailwind + Radix component collection. It is not used in this app.
_Avoid_: shadcn-style

**Lucide**:
The vendored icon library and shadcn's default icon set.
_Avoid_: shadcn icons
