# Search spec — v1

Status: draft for Karan's approval. No code starts before this is approved and broken into tickets.

## 1. Goal

Replace Windows search with a fast, correct one inside Beam. Press `Alt+Space`, type, and the right app or file is the first row. This is part of v1, not v2.

## 2. User flow

1. `Alt+Space` opens the panel with the search field focused. The cursor is in the field, ready to type.
2. Typing replaces the tab body with one ranked list of apps, files, and folders. The tabs return when the query is cleared.
3. Arrow keys move the selection; the first row is selected by default.
4. `Enter` opens the selection: apps launch, files open in their default app, folders open in Explorer.
5. `Shift+Enter` reveals a file or folder in Explorer. On an app row it does nothing.
6. `Esc` clears the query and returns to the tab you came from. `Esc` again closes the panel.
7. Closing and reopening the panel refreshes the index, so new and deleted files appear without an app restart.

## 3. Scope

In:
- Installed apps: every Start-menu entry (shortcuts and Store apps), 112 on the reference machine.
- Files and folders inside the six user folders and their subfolders: Desktop, Documents, Downloads, Pictures, Videos, Music.
- Matching by name and folder path only. All file types count.
- One mixed result list, best match first, maximum 8 rows.
- Partial results with a small `indexing…` note while a scan is still running.

Out:
- File contents, previews, and file actions other than open and reveal.
- Whole-disk search, other drives, and user-added folders (later).
- Settings pages, Control Panel items, open-window switching.
- Shell-extracted app icons (use Lucide icons by type in this cut).
- Search history, recents, or learned ranking.

## 4. Index

- The helper owns the index: it already owns Win32 and the filesystem seam, and the renderer stays untrusted.
- Built in memory at app launch, in the background, after the bridge is ready.
- Rebuilt when the panel opens, so results never go stale while open.
- Contents: one entry per app (name, launch id) and per file or folder (name, full path, kind).
- Skipped: hidden and system entries. No AppData, no reparse points.
- No disk index file, no file watcher. The reference machine holds 534 files in the six folders; a rebuild is cheap. Revisit only if a real folder makes the rebuild visible.

## 5. Ranking

One list, case-insensitive:

1. Exact name match.
2. Name starts with the query.
3. A word inside the name starts with the query.
4. Name contains the query.
5. Folder path contains the query.

Apps win ties against files. Within the same rank, shorter names first, then alphabetical. Cap 8 rows. No fuzzy matching in this cut.

## 6. UI

- A single search field at the top of the panel, above the tab body, using existing DESIGN tokens: 28px height, 8px radius, `--control` fill, Lucide search glyph.
- While the query is non-empty the tabs hide and the result list fills the body: icon, name, and a muted path or app label. One selection highlight, keyboard-first.
- Empty query restores the tab that was open before typing.
- The panel still never takes focus from startup or the tray; only the `Alt+Space` press focuses the field.
- Loading, empty, and error states:
  - Indexing: rows stream in, `indexing…` note at the bottom.
  - No matches: "No results for <query>" inside the panel body.
  - Index unavailable (helper down): "Search is offline" with the existing connection-lost language.

## 7. Data contract

- New renderer → main channel: `beam:search:query` `{ query }`.
- Main → helper request: `search.query` `{ query }`, reply `{ results: [{ kind, name, detail, launch }] }` where kind is `app | file | folder`, detail is the app name or folder path, and launch is the app id or full path.
- Main → helper request: `search.refresh` — rebuilds the index. Sent when the panel opens.
- Helper → main event: `search.index` `{ state: "building" | "ready", count }` (renderer shows the note from the state pushed with results).
- The renderer never touches the filesystem; it renders only what main sends.

## 8. Performance and budget

- Typing latency: query to rendered results under 50 ms once the index is ready (measure and record; adjust the target only with a real number).
- Index rebuild must stay inside the helper's 60 MB private budget; measure before and after with the resources journey.
- Startup must stay quiet: the scan runs after `[bridge] pong`, in the background, with no visible CPU spike over the accepted budget.
- Zero network requests. Index stays in memory only.

## 9. Acceptance checks

1. `Alt+Space` focuses the field; typing `notepad` shows Notepad as the first row; `Enter` launches it.
2. A uniquely named test file placed in Documents appears; `Enter` opens it; `Shift+Enter` reveals it in Explorer.
3. A file created after launch appears after closing and reopening the panel; a deleted file disappears the same way.
4. Ranking holds: exact, starts-with, word-start, contains, path; apps win ties; 8-row cap.
5. `Esc` clears the query back to the previous tab; a second `Esc` closes the panel.
6. An empty query never shows a stale result list.
7. No horizontal overflow at 420×284; keyboard focus ring visible; the list scrolls with arrows only.
8. Helper memory stays under 60 MB with the index loaded; 0 TCP sockets before and after a query.
9. Indexing note appears only while the scan runs; no-matches and helper-down states render.

## 10. Verification

Add `.agents/skills/verify-beam/features/search.md`:
- Real Windows input for `Alt+Space` (global hotkey does not go through CDP).
- CDP for typing, arrows, Enter, Esc, and the rendered rows.
- Real fixture files: create two uniquely named files in Documents (and one folder), search them, open and reveal one, then delete them in cleanup.
- Paste the session rows and screenshots into JOURNAL.

## 11. Open design details (not user decisions)

- Exact field placement and spacing inside the 420×284 body, decided in DESIGN.md before build.
- How the `indexing…` note is styled and announced.
- Whether the field shows a clear button at 28px.
- How rows truncate long paths (middle-truncation is already the pattern).
