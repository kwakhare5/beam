# Capsule interaction: filled transport, hover growth, capsule focus, mascot pop

The outline Lucide transport read as wireframes at 18px. The 216px idle capsule looked long. The focus ring looked orphaned on the play button. The mascot was static.

We use filled media glyphs (previous, play/pause, next) in the same 24px sprite; outline stays for UI. The capsule is 104×32 at idle, 128×32 on hover, and 176×32 when playing or paused, inside the fixed 184×44 window; the shell brightens `.70→1` and the border `.08→.14`. Keyboard focus is a 1px neutral ring on the focused control; the capsule itself has no ring. The mascot pops to `scale(1.06) rotate(-2deg)` over 120ms on hover, disabled by `prefers-reduced-motion`.

Trade-offs: the 176 playing state leaves 40px for the title, so longer track titles truncate in the capsule and live in full in the panel. The idle capsule leaves 40px from each window edge (4px shadow + 36px transparent), and the window never resizes, so hover growth cannot flicker. The focus is control-only: the capsule stays clean, and the ring marks the exact tab stop. The app and preview share `pill.css`, so the app gets the same hover and mascot animation.
