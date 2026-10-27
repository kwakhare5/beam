# Landscape panel with art-left music

The 360×340 panel was nearly square and the 148px full-bleed art left a dead bottom area. The panel is now 420×300 inside a 428×308 open window, anchored bottom-center. The extra width is used, not filled: the music art sits 148px on the left and the title, artist, and controls occupy the right; the body is 260px, the file list shows 5 rows, settings keeps five 44px rows, and the calendar stays a padded 7-column grid. There is no footer.

The panel opens from the capsule: the rest window is 184×44; on click it grows to 428×308 over 150ms, the 128px capsule widens to 420 and its radius goes 999→14, and the content fades in. The window is never resized on hover; hover only grows the capsule 104→128 inside the 184 window. The preview frame is 420×300 at `showcase/app-preview.html`.
