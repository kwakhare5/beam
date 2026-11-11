# State identity, panel completeness, and one visual scale

Status: accepted 2026-10-28. Amends ADR-0003, ADR-0005, ADR-0006, ADR-0007, and ADR-0008. Amended the same day by the two-width pass, the 100/136 music pass, and the 100-rest pass: every capsule state rests at 100×32; music, timer, and done grow to 136×32 on hover; drag is 136; the paused rest slot is 30px; the calendar always draws six rows; the tab bar and file rows are flat. Amended 2026-10-29 by ADR-0010: paused shows artwork plus an amber dot and keeps the 50px title slot; the dots are green/amber/red.

The capsule states were hard to tell apart, four panel screens were clipped or missing their states, several settings rows looked interactive but were not, and the docs described a product that did not exist. We settled on:

- **Done**: the capsule shows a centered 16px gold check and a 1px gold border at rest; hover swaps the check for `Done` plus a 28px dismiss. No digits, no glow. Running shows gold digits, so done and running do not look identical, and `00:00` no longer repeats "Time's up".
  **Superseded in part 2026-11-11:** the capsule now shows `Done` with a gold border and an always-visible 28px dismiss; there is no check glyph and no hover swap.
- **Paused**: a 12px play glyph sits outside the title slot, which leaves 30px for the title in the 100px rest width. Muted ink alone was invisible at rest.
- **Shelf capsule**: a non-empty shelf shows its count (`5 files`). A missing file turns the mascot pip red; the panel row carries the name and the `Missing` badge. The `0 files` and missing-filename capsule states are gone because one summary has to win, and picking one missing name out of several was arbitrary.
- **Precedence** when states overlap: drag, then timer, then music, then files, then idle. Direct manipulation feedback wins for the moment it lasts; timer still beats music.
- **Music panel**: square 148×148 art plus a read-only position bar with elapsed and total. Seeking stays out of scope. The old 148×236 art box cropped square album art by 37%.
- **Open window**: 452×332 with a 16px transparent shadow margin; the panel stays 420×300. A 32px shadow cannot fit a 4px margin, and a click in the margin counts as an outside click.
- **Calendar**: real month arrows and Today; first day of week follows the Windows locale with Sunday as fallback; two-letter locale weekday headers; always six week rows, padded with adjacent-month days, so the grid never jumps. A hardcoded Sunday-first grid fails Monday-first locales.
- **Files**: copy and remove appear per row on hover or focus at 24px; the empty state is a dashed drop well; folders read `Folder`, not the raw size string.
- **Timer panel**: idle, custom, running, and done states. Custom is an inline 1–999 minute field. There is still no pause; Cancel appears only while running.
- **Settings**: five rows including Reset position, with real controls: a switch, keycaps, a volume stepper with a test button, and a `Dark theme` switch. Dividers replace the 8px row gap so 220px fits inside 242px.
- **Scale**: type 11/12/13/15/40 with no 10px; spacing 4/8/12/16 with one 8px body gap.

Consequences: DESIGN.md, GLOSSARY.md, TASKS.md, and the preview follow these values now. App wiring lands in tasks 1.3, 2.3, 3.x, 4.x, 5.x, and 7.1; until then the panel remains preview-only.
