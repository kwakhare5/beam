# Capsule artwork, one dot language, and clearer panel state

Status: accepted 2026-10-29. Amends ADR-0005, ADR-0008, and ADR-0009. Approved by the user after the proposal review.

The paused capsule used a 12px play glyph that stole 20px from the title, the gold media pip competed with the brand color, and the music panel's transport sat in a narrow column. The panel also had a few dead or ambiguous states. Settled:

- **Capsule artwork**: music states show the 24px album thumbnail with a 6px radius; the star is the fallback when no artwork exists. Paused dims the thumbnail to 70% and drops the play glyph, restoring the 50px title slot.
- **Dots**: green while playing or while a timer runs, amber when paused, red when a shelf file is missing. Gold stays brand and primary, so a gold dot never signals state.
- **Music panel**: 148×148 art and the title block sit on the first row; the position bar and one transport row span the full panel width. The selected content tab carries a 2px gold underline inset 8px; the Settings icon keeps the gold treatment without the underline.
- **Settings**: the theme row names `Dark` or `Light` beside the switch. Keycaps sit directly with no outer kbd box.
- **Files**: missing rows keep only Remove; copy would fail. The footer says `Add files`.
- **Timer**: the custom chip says `Set`. Done shows a 40px gold check plus `Time’s up`, not `00:00`.

Consequences: `verify.ps1` now checks the thumbnail, the three dot colors, the full-width music row, the tab underline, the theme label, the missing-row copy removal, and the done face. The proposal page in `showcase/app-preview.html` is gone; the canonical board, capsule, and panels pages carry these states. App wiring is still unbuilt, so the preview remains the only rendered surface.

**Amendment 2026-10-29 (audit pass):** the paused capsule keeps the thumbnail at full opacity; the amber dot and the muted title carry the state. Custom timer mode keeps the preset chips visible with 25 min selected by default and a `Set` chip below. Copy All disables when every shelf row is missing, and Clear All asks for a second click. The Done hover label is always `Done`. Capsule expansion uses `:has(:focus-visible)` so a mouse click releases it while keyboard focus holds it.
