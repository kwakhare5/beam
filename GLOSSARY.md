# Beam UI

The shared language for the Beam desktop surface. Use these terms in code, docs, and review.

## Surfaces

**Capsule**:
The visible surface: a 136×32 bar for idle, timer, done, files and drag; music rests at 100×32 and grows to 136×32 on hover or focus. Idle centers the master mark; music shows the title at rest; timer shows its label and digits.
_Avoid_: pill, bar, bubble

**Rest window**:
The 144×44 transparent window that contains the capsule and its shadow margin. One size for every state; it never resizes on hover.
_Avoid_: pill window

**Panel**:
The visible 420×300 open surface with tabs. No footer.
_Avoid_: popup, modal, card

**Open window**:
The 452×332 transparent window that contains the 420×300 panel and a 16px shadow margin.
_Avoid_: panel window

**Shell**:
The fill, 1px border, and shadow shared by the capsule and the panel.
_Avoid_: background, chrome

**Hover emphasis**:
At idle the label is muted and returns to full ink on hover while the border strengthens. On music the pill grows from 100 to 136, the title fades out, and the transports fade in. The window never resizes.
_Avoid_: hover growth, hover resize, OS resize

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
The playing capsule shows the track title at rest and swaps it for Previous / Play-Pause / Next on hover or focus while growing from 100 to 136 wide.
_Avoid_: dynamic width, hover growth, text stretching

**Middle-truncation**:
Ellipsizing long filenames in the center (`quarterl…inal.xlsx`) to preserve both the title prefix and file format extension.
_Avoid_: end truncation, text clipping

**Showcase board**:
The unified single-canvas gallery view in `app-preview.html` displaying all capsule states and all five open panels simultaneously.
_Avoid_: dashboard, mock page

**Media pip**:
A subtle 6px gold indicator on the mascot marking active background playback when a countdown timer claims the primary capsule. The same pip turns red when a shelf file is missing.
_Avoid_: notification dot, badge

**Drop well**:
The dashed empty area in the Files tab that accepts a drop and holds the Add button.
_Avoid_: drop zone, empty state

**Position bar**:
The read-only progress line in the Music tab showing elapsed and total time. It cannot be dragged.
_Avoid_: seek bar, scrubber, slider

## Brand

**Master mark**:
The official Puffy Chubby Star mark (`beam-mascot.svg`), used at 24px in the capsule.
_Avoid_: logo, avatar, mini mark

**Mascot**:
The single canonical Puffy Chubby Star mark (`beam-mascot.svg`), used at 24px in the capsule and 48px in panel empty states. Secondary star variants are deleted.
_Avoid_: logo, avatar, fake stars

**Flat surface**:
A surface with at most one fill or border of its own and no filled parent behind it: no tab pill inside a track, no icon box inside a row. State is shown with color, spacing, and 1px dividers.
_Avoid_: nested card, double box, track

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
Capsule controls use a 1px neutral inset ring; panel controls use a 2px neutral ring. The capsule itself has no ring and no glow.
_Avoid_: capsule ring, gold glow, double ring

**shadcn-style**:
The token vocabulary, 8px grid, Lucide icons, and component patterns used in the vanilla renderer.
_Avoid_: shadcn/ui

**shadcn/ui**:
The React + Tailwind + Radix component collection. It is not used in this app.
_Avoid_: shadcn-style

**Lucide**:
The vendored icon library and shadcn's default icon set.
_Avoid_: shadcn icons
