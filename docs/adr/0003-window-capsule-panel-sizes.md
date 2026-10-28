# Two rest window sizes, fixed open window

Status: accepted; amended 2026-10-28 by ADR-0009, by the two-width pass, and by the 100/136 music pass.

The 800×60 window stretched the capsule across the screen, and the 360×460 panel left dead space. The rest window is 144×44 for every state. The capsule is 136×32, except music, which rests at 100×32 and grows to 136×32 on hover or focus over 120ms; the pill stays bottom-center and grows both ways inside the fixed window, so no Win32 resize happens during pointer movement. Music rests small because the resting pill only hints at the track; the title, artist, and controls live in the panel. A click opens a 452×332 window that contains the 420×300 panel, leaving a 16px transparent margin for the panel shadow. Radii are 6 micro, 8 control, 12 card/art, 16 panel, and 999 capsule/switch. The panel body padding is 8 and there is no footer. The music art is a 148×148 square.
