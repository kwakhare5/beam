# Last-used panel, live timer and calendar, and artwork in the event

Status: accepted 2026-11-04. Amends ADR-0009 and ADR-0011. Approved by the user in the panel audit.

The panel always opened by state (Music when anything played, else Files), so a user who had just dropped files was taken away from them; Timer and Calendar were drawn but dead, which also broke the rule that the app and the preview show the same tabs; the helper rewrote one art PNG per state change while main read it, so the panel often fell back to a gray star tile; and the Music body's 12px gaps overflowed its 226px box by 10px.

Settled:

- **Last used wins.** Every direct feature action stamps it — a drop or the picker, any Files action, a transport, a timer action, a calendar move, or a tab visit. Opening the panel goes there. With no stamp this session: Music when a session exists, else Files when the shelf holds rows, else Music. Session-only; nothing is persisted.
- **Timer is live.** Presets 5/10/25 plus a 1–999 custom field; Start counts from a deadline (never decrements), the tab and the pill show the same digits, the pill carries the background music's dot, hover reveals a cancel, and expiry shows the gold check with Start again / Dismiss. Quiet never fires while a timer runs or holds its done face.
- **Calendar is live.** A month offset with previous/next and Today; today stays gold.
- **Four tabs on both surfaces.** Music, Files, Timer, Calendar render in the app and the preview; Settings is removed from both until 7.1. Its design spec stays in DESIGN for that task.
- **Artwork rides the event.** `music.changed` carries the PNG as base64 (`art`); the helper no longer writes `%TEMP%\Beam\art`, and main no longer reads a file. The pill and the panel share one data-URL contract.
- **No-art face.** When a session publishes no thumbnail the 148px slot shows the 48px star on the panel background — no gray tile. The preview gains that panel and a no-art pill.
- **Music rhythm.** The panel body uses 8px gaps and a 4px bar→times gap: rows total 224 in a 226px box, leaving 9px of air above the art and below the transports.

Consequences: `verify.ps1` does not cover any of this yet; the 9.9 checks and a green run remain the gate. The timer's done face and the base64 line size get their own checks there.
