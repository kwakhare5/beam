# Capsule interaction: filled transport, title/transport swap, control focus

Status: accepted; amended 2026-10-28 by ADR-0009, which replaced hover growth, the 40px title slot, and the mascot pop, and by the 100/136 music pass.

Filled media glyphs (previous, play/pause, next) read clearly at 16px where outline icons looked like wireframes. The capsule is 136×32; music rests at 100×32 and grows to 136×32 on hover or focus over 120ms. At idle the label is muted and returns to full ink on hover while the border strengthens. On music hover or keyboard focus, the title fades out over 120ms and three 28px transports fade in inside the 86px slot. Keyboard focus is a 1px neutral inset ring on the focused control; the capsule itself has no ring and no glow. The mascot is static. A paused capsule keeps a 12px play glyph outside the slot, leaving 30px for the title at rest and 86px on hover, making the state readable without hovering. The app and preview share `pill.css`.
