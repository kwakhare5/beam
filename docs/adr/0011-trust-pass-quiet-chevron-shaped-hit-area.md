# Trust pass: quiet idle, a chevron, a shaped hit area, and only live tabs

Status: accepted 2026-11-04. Amends ADR-0007 and ADR-0009. Approved by the user in the UI audit. **Amended 2026-11-11:** the 20px chevron is replaced by a 24px panel button that is a peer of the three transports inside the music hover row; the resting capsule itself opens the panel. Quiet is 26×26 after 10s.

The app presented dead controls as live (Timer, Calendar, Settings, Add files, the pill's timer/done buttons), Esc left main's `panelOpen` true so the next pill click was ignored, the 21px transparent margins swallowed clicks meant for the window underneath, a playing pill hid every open target on hover, idle stayed a full labelled capsule all day, and file add/copy/remove failures were silent.

Settled:

- **Quiet idle.** With the helper alive, no music, no shelf files, no hover, and the panel closed for 20s, the idle capsule becomes a 30×30 star-only nub (star at 60%) inside the same 136×42 window. Hover, music, a file, or an open panel wakes it; leaving hover returns it after 2s. The preview keeps a quiet frame.
- **Chevron.** The music/paused hover row gains a 20px chevron (16px icon) after Prev / play-pause / Next, so the panel has an explicit target while music plays. Clicking it opens the panel; the transports never open it.
- **Shaped hit area.** `BrowserWindow.setShape` clips the window to the visible pill plus a 6px halo (the full 452×316 when open). Clicks outside the pill reach the desktop instead of opening the panel. `setShape` is experimental on Windows; one failure logs once and the window falls back to the full rect.
- **Only live tabs.** The app tab bar shows Music and Files until Timer and Calendar ship; Settings is hidden until it has real rows. The canonical preview still shows all five. Opening the panel picks Music when a session exists, Files when the shelf holds rows, otherwise the last tab.
- **Honest file actions.** Add files opens the native picker (drops append to the same shelf); the Files footer and empty state share it. A visible status line reports Added / Removed / Copied / `Max 50`, and Remove offers Undo for 5s. Clear All stays armed on the second click. Quit from the tray asks before clearing a non-empty shelf, and the tray gains Hide.
- **Helper loss.** A dropped helper turns the pill red-bordered with `Connection lost`; a successful ping restores it.
- **Close sync.** `beam:panel:collapsed` now clears main's `panelOpen`, outside-margin clicks dismiss, and the close animates 150ms before the window snaps back.

Consequences: `verify.ps1` check 22 expects four controls (including `panel`). New checks for quiet, the chevron, auto-pick, Esc/reopen, outside-click, the picker, Undo, and the quit guard are pending under 9.9. Timer, Done, and Calendar art in the preview stay as the target spec.
