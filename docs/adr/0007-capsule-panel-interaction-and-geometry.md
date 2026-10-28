# Capsule-to-panel interaction, flicker prevention, and edge geometry

Status: accepted; amended 2026-10-28 by ADR-0009, which changed the open window to 452×332, and by the two-width pass, which replaced the 184×44 rest window.

Clicking the capsule expands the window to 452×332, which holds the 420×300 panel and a 16px shadow margin; transport buttons must not open the panel, continuous window resize calls stutter on Windows, and display edges clip fixed-direction growth.

We isolate media transport clicks: `prev`, `play/pause`, and `next` stop propagation and execute commands directly; clicking the mascot, track title, or capsule body expands the panel. The OS window resizes immediately on open while GPU-accelerated CSS transforms handle the 150ms ease-out expand/collapse motion internally; on collapse, CSS animates out before the window snaps back to 144×44. The panel expands downward if the capsule is in the upper half of the display and upward if in the lower half, clamping horizontally to keep at least 8px margin from monitor boundaries. The panel dismisses on `Esc`, tray toggle, or outside clicks without stealing foreground focus.
