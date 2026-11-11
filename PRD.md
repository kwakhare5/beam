# PRD.md — Product Requirements Document

## 1. Executive Summary
Beam is a lightweight floating Windows 11 capsule that keeps media controls, a multi-file drop shelf, a countdown timer, and a clean month calendar one click away, without switching windows or opening full apps. It runs 100% locally and offline on Electron with TypeScript, with zero cloud dependencies and zero API costs.

---

## 2. Target User & Core Problem
- **Target User:** Everyday Windows users who listen to music, move files across applications, track short work intervals, and check dates while working.
- **Core Problem:** Desktop context switching is disruptive. Pausing music, opening a browser tab to start a timer, switching folders back and forth to attach files, or checking a calendar takes focus away from active work.
- **User Outcome:** Users manage media, stash and paste batches of files, run timers, and view the calendar in 1 click or keyboard shortcut from a permanent floating pill that never blocks their screen.

---

## 3. Core Features (v1 Scope)

### 1. Floating Pill Shell & Window Anchoring
- **User Flow:** Sits 12px above the Windows taskbar at bottom-center. Every state hugs its content and shows one fact, with the star and label centered as one unit; idle dims, files shows a count, timer and done keep an always-visible 28px ×, and music is the only state that expands — to 126×30 on hover or focus, showing Prev / Play-Pause / Next / Panel as four 24px controls. One 136×42 window holds every state. Clicking anywhere on the resting pill opens the four content tabs plus Settings as a 420×284 panel inside a 452×316 window with a 150ms grow, opening to what the pill shows: Timer while it runs or is done, Music while a session exists, Files when the shelf has rows, otherwise the last-used tab. The panel opens downward in the upper half of the display and upward in the lower half. Dragging repositions and persists coordinates across app restarts. Clicking outside or pressing `Esc` closes the panel. Automatically hides when a full-screen window (game/movie) is active.
- **Acceptance Criteria:**
  - `alwaysOnTop: true` with automatic hide on fullscreen detection.
  - Draggable with position persisted across app restarts.
  - Dimmed capsule when idle (no music playing, no timer active).
  - System Tray icon (bottom-right near clock) with right-click menu: Settings, Reset Position, Quit.
  - Windows startup launch toggle in settings.
  - Light and dark themes, switchable in Settings and remembered across restarts.
  - Global configurable keyboard shortcut to toggle panel visibility (default `Alt + Space`, rebindable in settings).
  - Correct at 100%, 125%, and 150% display scaling.
  - A second launch reveals the existing pill instead of starting another one.

### 2. Music Controls (Windows SMTC Integration)
- **User Flow:** Audio plays in Spotify, Apple Music, or a browser → Beam automatically shows track title, artist, and album artwork. Hovering the playing pill expands it into Prev / Play-Pause / Next / Panel; the full Music panel carries the same transports plus a seek slider.
- **Acceptance Criteria:**
  - Integrates locally with Windows System Media Transport Controls (SMTC) with $0 API cost and no developer accounts.
  - Displays track title, artist name, and album artwork.
  - Play/Pause and Next/Previous track buttons function reliably.
  - A seek slider shows elapsed and total time and seeks through SMTC (built 2026-11-08; the helper clamps to the session timeline and a refusal repaints the last position).

### 3. File Drop Shelf (In-Memory Stash + 1-Click Clipboard Copy)
- **User Flow:** User drags files from any folder onto Beam → files park on the shelf with a count badge (e.g. "3 files"). User can drag them out into another app/folder, copy one row, or click "Copy All" and immediately paste with `Ctrl + V`. If an original file is deleted from disk, the shelf displays a "Missing" badge on that row and a red pip on the capsule.
- **Acceptance Criteria:**
  - In-memory file path references only (0 MB disk duplication, instant response).
  - Multi-file drop support with compact list and "Clear All" button.
  - Hybrid output: standard drag-and-drop out, plus 1-click clipboard copy to enable direct `Ctrl + V` pasting into Explorer, email, or chat apps.
  - File existence check disables dragging and badges missing files.

### 4. Countdown Timer & Presets
- **User Flow:** User selects a preset (5m, 10m, 25m) or enters custom minutes → resting pill displays live countdown with an always-visible 28px cancel. When time expires, the pill reads "Done" with a gold border and a 28px dismiss, plays one gentle built-in audio chime, and fires a native Windows notification banner.
- **Acceptance Criteria:**
  - Accurate countdown timer running in background.
  - Live countdown displayed directly on the resting pill.
  - Audio alert (1 clean, gentle chime) and Windows desktop notification banner upon completion.

### 5. Read-Only Month Calendar
- **User Flow:** User clicks Calendar tab → sees the current month grid with today's date clearly highlighted, and can move to adjacent months with the chevrons or return with Today. The calendar shows dates; it does not create or edit events.
- **Acceptance Criteria:**
  - Clean month/day grid derived from local system clock; first day of the week follows the Windows locale, Sunday as fallback.
  - Today's date highlighted only in its own month.
  - Previous/next month navigation and a Today shortcut.
  - 100% offline, zero account sign-ins, zero sync requirements.

### 6. Smart Contextual Tab Switching
- **User Flow:** User clicks the pill or hits the global hotkey → Beam opens to what the pill shows: Timer while a countdown runs or is done, Music while a session exists, Files when the shelf holds rows, otherwise the last-used tab.
- **Acceptance Criteria:**
  - Panel automatically displays the active tab without requiring manual tab navigation.

---

## 4. What We Are NOT Building (Out of Scope for v1)
- **App Launcher / Switcher:** Cut to V2.
- **File Search (Name & Content):** Cut to V2.
- **Clipboard History Manager:** Cut to future releases.
- **Cloud Accounts, Sync & Multi-Device Sharing:** Fully out of scope; Beam is 100% offline.
- **Music Scrubbing / Timeline Seeker:** Delivered on 2026-11-08 (U2); seeking goes through SMTC and the bar reports the accepted position.
- **Hardware Controls (Monitor Brightness / Volume Sliders):** Hardware-dependent, cut from V1.

---

## 5. Success Metrics & Done State
- **How we know v1 works:**
  - App launches cleanly into a dimmed resting pill above the Windows taskbar.
  - Automatically picks up active Spotify or Apple Music sessions with working Play/Pause and Skip.
  - Dragging files into the shelf allows immediate drag-out or `Ctrl + V` pasting.
  - Timer completes with an audible chime and Windows banner.
  - Full verification suite passes with exit code 0.
- **Target Performance:**
  - Idle memory: Electron processes under 130 MB private bytes; the C# helper capped separately at 60 MB. Report both numbers and the total. (Raised from 100 MB on 2026-10-27 after the Electron baseline was accepted.)
  - CPU usage: < 0.5% average over 60 seconds at rest.
  - Zero external network requests; $0 operating cost.
