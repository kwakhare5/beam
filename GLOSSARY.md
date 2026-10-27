# Beam UI

The shared language for the Beam desktop surface. Use these terms in code, docs, and review.

## Surfaces

**Capsule**:
The visible surface: 104×32 at idle, 128×32 on hover, 176×32 when playing or paused, 132 when the timer runs or is done, 140 when a shelf file is missing.
_Avoid_: pill, bar, bubble

**Rest window**:
The 184×44 transparent window that contains the capsule and its 4px shadow margin. The capsule grows inside it; the window never resizes.
_Avoid_: pill window

**Panel**:
The visible 420×300 open surface with tabs. No footer.
_Avoid_: popup, modal, card

**Open window**:
The 428×308 transparent window that contains the panel and its 4px shadow margin.
_Avoid_: panel window

**Shell**:
The fill, 1px border, and shadow shared by the capsule and the panel.
_Avoid_: background, chrome

**Hover growth**:
The capsule widens 104→128 inside the fixed 184 window; the shell brightens and the border strengthens. No OS resize.
_Avoid_: hover resize, OS resize

## Structure

**Tab**:
A content area in the panel: Music, Files, Timer, Calendar, or Settings.
_Avoid_: page, screen

**Content state**:
The data condition of the capsule: idle, playing, paused, timer, done, files, drag, or missing.
_Avoid_: mode, variant

**Interaction state**:
The pointer or keyboard condition: rest, hover, focus, pressed, or disabled. It never changes the content state.
_Avoid_: hover state when a content state is meant

**Panel state**:
The data condition of a tab body: normal, empty, loading, success, or error.
_Avoid_: content state

**State component**:
A rejected idea: one component per content state. States are data; one capsule renders all of them.
_Avoid_: per-state component

## Brand

**Master mark**:
The official Puffy Chubby Star mark (`beam-mascot.svg`), used at 24px in the capsule.
_Avoid_: logo, avatar, mini mark

**Mascot**:
The original state SVG suite (`star-music`, `star-files`), used at 48px in the panel empty states. The capsule master mark pops on hover.
_Avoid_: logo, avatar

**Mini mark**:
A rejected custom glyph that replaced the mascot in the capsule. Do not use.
_Avoid_: mini mascot, star glyph

## Style

**Primary**:
The single gold brand color (`#FFAA00`) used for the current tab, primary action, timer digits, today, and the done digits.
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
