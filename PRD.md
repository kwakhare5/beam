# PRD.md — Product Requirements Document

## 1. Executive Summary
Beam is a lightweight floating Windows 11 desktop bar that provides 1-click access to media controls, a multi-file drop shelf, a countdown timer, and a clean month calendar without switching windows or opening full apps. It runs 100% locally and offline on Electron with TypeScript, with zero cloud dependencies and zero API costs.

---

## 2. Target User & Core Problem
- **Target User:** Everyday Windows users who listen to music, move files across applications, track short work intervals, and check dates while working.
- **Core Problem:** Desktop context switching is disruptive. Pausing music, opening a browser tab to start a timer, switching folders back and forth to attach files, or checking a calendar takes focus away from active work.
- **User Outcome:** Users manage media, stash and paste batches of files, run timers, and view the calendar in 1 click or keyboard shortcut from a permanent floating pill that never blocks their screen.

---

## 3. Core Features (v1 Scope)

### 1. Floating Pill Shell & Window Anchoring
- **User Flow:** Sits 12px above the Windows taskbar at bottom-center. Hovering fades quick music controls in place and grows the capsule 104→128 inside the 184 window; the window never resizes. Clicking opens the 4 content tabs plus the Settings icon upward as a 420×300 panel with a 150ms grow. Dragging repositioning persists custom coordinates across app restarts. Clicking outside or pressing `Esc` closes the panel. Automatically hides when a full-screen window (game/movie) is active.
- **Acceptance Criteria:**
  - `alwaysOnTop: true` with automatic hide on fullscreen detection.
  - Draggable with position persisted across app restarts.
  - Dimmed capsule when idle (no music playing, no timer active).
  - System Tray icon (bottom-right near clock) with right-click menu: Settings, Reset Position, Quit.
  - Windows startup launch toggle in settings.
  - Global configurable keyboard shortcut to toggle panel visibility (default `Alt + Space`, rebindable in settings).
  - Correct at 100%, 125%, and 150% display scaling.
  - A second launch reveals the existing pill instead of starting another one.

### 2. Music Controls (Windows SMTC Integration)
- **User Flow:** Audio plays in Spotify, Apple Music, or a browser → Beam automatically shows track title, artist, and album artwork. User controls playback via resting hover pill or the full Music panel.
- **Acceptance Criteria:**
  - Integrates locally with Windows System Media Transport Controls (SMTC) with $0 API cost and no developer accounts.
  - Displays track title, artist name, and album artwork.
  - Play/Pause and Next/Previous track buttons function reliably.
  - Seek/scrub bar excluded for V1 to prevent SMTC desynchronization issues.

### 3. File Drop Shelf (In-Memory Stash + 1-Click Clipboard Copy)
- **User Flow:** User drags files from any folder onto Beam → files park on the shelf with a count badge (e.g. "3 files"). User can drag them out into another app/folder, or click "Copy to Clipboard" / "Copy All" and immediately paste with `Ctrl + V`. If an original file is deleted from disk, the shelf displays a "File moved or deleted" warning badge.
- **Acceptance Criteria:**
  - In-memory file path references only (0 MB disk duplication, instant response).
  - Multi-file drop support with compact list and "Clear All" button.
  - Hybrid output: standard drag-and-drop out, plus 1-click clipboard copy to enable direct `Ctrl + V` pasting into Explorer, email, or chat apps.
  - File existence check disables dragging and badges missing files.

### 4. Countdown Timer & Presets
- **User Flow:** User selects a preset (5m, 10m, 25m) or enters custom minutes → resting pill displays live countdown. When time expires, the pill shows the done digits in gold, plays one gentle built-in audio chime, and fires a native Windows notification banner.
- **Acceptance Criteria:**
  - Accurate countdown timer running in background.
  - Live countdown displayed directly on the resting pill.
  - Audio alert (1 clean, gentle chime) and Windows desktop notification banner upon completion.

### 5. Read-Only Month Calendar
- **User Flow:** User clicks Calendar tab → sees current month grid with today's date clearly highlighted.
- **Acceptance Criteria:**
  - Clean month/day grid derived from local system clock.
  - Today's date highlighted.
  - 100% offline, zero account sign-ins, zero sync requirements.

### 6. Smart Contextual Tab Switching
- **User Flow:** User clicks the pill or hits the global hotkey → Beam automatically opens to the active task (Timer tab if a countdown is running, Music tab if music is playing).
- **Acceptance Criteria:**
  - Panel automatically displays the active tab without requiring manual tab navigation.

---

## 4. What We Are NOT Building (Out of Scope for v1)
- **App Launcher / Switcher:** Cut to V2.
- **File Search (Name & Content):** Cut to V2.
- **Clipboard History Manager:** Cut to future releases.
- **Cloud Accounts, Sync & Multi-Device Sharing:** Fully out of scope; Beam is 100% offline.
- **Music Scrubbing / Timeline Seeker:** Cut from V1 to prevent audio desync bugs.
- **Light Theme Toggle:** moved into V1 on 2026-10-27; the app ships light and dark themes, switchable in settings and remembered across restarts.
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
