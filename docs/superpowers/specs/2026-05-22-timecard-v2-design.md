# Timecard v2 — Design Spec
**Date:** 2026-05-22  
**Status:** Approved

---

## Overview

A set of improvements to the timecard app covering visual redesign, multi-session time entry, past week navigation, a week history view, and email copy improvements. App is used primarily on mobile.

---

## 1. Visual Redesign

### Palette
| Variable | Value | Use |
|---|---|---|
| `--bg` | `#0a0704` | Page background |
| `--surface` | `#130e08` | Cards, panels |
| `--surface2` | `#1a1208` | Inputs, inner surfaces |
| `--border` | `#2a1f14` | All borders |
| `--accent` | `#c87941` | Primary accent (amber) |
| `--accent-dim` | `rgba(200,121,65,0.12)` | Accent backgrounds |
| `--accent-gradient` | `linear-gradient(135deg,#c87941,#a85c28)` | Buttons |
| `--text` | `#f5e6cc` | Primary text |
| `--text-muted` | `#7a6040` | Secondary text |
| `--pay` | `#d4a84b` | Payday highlight (keep gold) |
| `--success` | `#6dc86d` | Submitted badge |
| `--error` | `#e05c5c` | Error states |

### Typography
- **Headings / app title / day labels / email button:** Cormorant Garamond (Google Fonts) — weights 400, 600, 700; italic variant for accent text
- **Body / inputs / bullets / muted text:** system-ui (OS default — keeps inputs fast and readable on mobile)

### Animated background
Canvas element fixed behind all content. Five slow-drifting radial gradient orbs in warm amber/brown hues (`hsl(15–40, 45–70%, 20–30%)` at ~0.06–0.12 opacity). Subtle per-pixel grain pass on top. Runs at 60fps via `requestAnimationFrame`. Added to `App.jsx` as a `<canvas id="bg">` with `position:fixed; inset:0; z-index:0`. All other content at `z-index:1`.

---

## 2. Multiple Time Sessions per Day

### Data model change
Each day entry changes from:
```js
{ bullets: string[], startTime: string, endTime: string, hours: string, notes: string }
```
to:
```js
{
  sessions: [{ id: string, startTime: string, endTime: string, bullets: string[] }],
  hours: string   // manual fallback if no sessions have times
}
```

### Migration
`getEntries()` in `storage.js` gets a `migrateEntry(entry)` helper that converts old-format entries on read:
- If `entry.sessions` exists → return as-is
- Otherwise → wrap existing fields into `sessions: [{ id: crypto.randomUUID(), startTime, endTime, bullets }]` and carry `hours` forward

### UI — `DayEntry.jsx`
- Renders a list of session blocks. Each block shows:
  - Start time input + End time input (same style as current, side by side)
  - `BulletInput` for that session's notes
  - Auto-calculated hours badge (e.g. `8h`) shown inline next to time row
  - Remove session button (trash icon, only shown when >1 session)
- Below all sessions: **"+ Add Session"** button — adds a new empty session block
- Below that: a **"Manual hours"** text input (pre-filled as fallback, cleared automatically when any session has start+end times)
- Total hours for the day auto-sums across all sessions + manual field and is shown in the day header

### Formatter update (`formatter.js`)
Email generator iterates `sessions` instead of single `startTime/endTime`. Each session renders as its own time row + bullets in the email:
```
Tuesday (5/20) - 8.0 hours
12:00 PM - 2:00 PM CT
- Worked on crawling tool
7:00 PM - 9:00 PM CT
- Brand normalization
- Loom submissions
```

---

## 3. Past Week Navigation

### State
`App.jsx` adds `weekOffset` state (integer, default `0`). `0` = current week, `1` = last week, `2` = two weeks ago, etc. Always non-negative.

### `getWeekDates` update
`dates.js` `getWeekDates()` already accepts an optional `referenceDate`. In `App.jsx`, pass `new Date(Date.now() - weekOffset * 7 * 86400000)` as the reference.

### Header UI
Week range label in the header gains `‹` and `›` buttons on either side:
- `‹` increments `weekOffset` (goes further back) — always enabled
- `›` decrements `weekOffset` — disabled when `weekOffset === 0` (can't go into future)
- Current week shows no "past" indicator; past weeks show a subtle "Past week" label

### Past week behavior
- Past weeks load their saved entries from localStorage normally
- Submitted weeks show a green "✓ Submitted" badge in the header
- Past weeks are fully editable (user may need to correct entries)

---

## 4. History View (Week List)

### Location
Dashboard tab gains a toggle between two sub-views:
- **Stats** — existing dashboard content
- **History** — the week list

### Week List
Scrollable list of all weeks that have any saved entries, sorted newest first. Each row shows:
- Week date range (Cormorant Garamond)
- Mini day dots (7 small cells, filled with hours if logged, empty if not)
- Total hours for the week
- Status badge: "In progress" (current week), "✓ Submitted" (green), or nothing (past, unsubmitted)

Tapping a row sets `weekOffset` to that week's offset and switches view to `log` tab — putting the user directly into that week's log.

---

## 5. Email Copy Fix

### Problem
`mailto:` links sometimes lose line breaks when Gmail opens in compose mode.

### Fix
Add a **"Copy to Clipboard"** button in `EmailPreview.jsx` alongside the existing "Send via Email Client" button. Uses `navigator.clipboard.writeText(emailBody)`. Button shows "Copied!" confirmation for 2 seconds after tap.

The mailto button stays — it works fine in native email apps (Mail.app, Gmail app). Copy is the fix for Gmail web on desktop.

---

## 6. Additional Features

### Weekly note
Optional single text field at the bottom of the log view labeled "Week note (private)". Not included in email. Stored separately in localStorage under `timecard-weeknote-${weekKey}` (string). Shows as a faint italic prompt when empty.

### Streak counter
In the Dashboard stats view, add a "🔥 X week streak" stat card. A streak increments for each consecutive week (going back from current) that has at least one logged entry. Resets if a week has no entries.

### Hours badge in log header
Total hours for the selected week displayed as an amber badge next to "Timecard" in the header — already exists but should update reactively as user types in past weeks.

---

## 7. Files Changed

| File | Change |
|---|---|
| `src/index.css` | CSS variable overhaul, Cormorant Garamond import |
| `src/App.jsx` | Canvas bg, weekOffset state, week nav arrows, history tab wiring |
| `src/lib/dates.js` | No change needed (getWeekDates already accepts referenceDate) |
| `src/lib/storage.js` | `migrateEntry()` helper, `getAllWeeksWithEntries()` helper |
| `src/lib/formatter.js` | Iterate sessions instead of single time block |
| `src/components/DayEntry.jsx` | Multi-session UI |
| `src/components/EmailPreview.jsx` | Copy to clipboard button |
| `src/components/Dashboard.jsx` | Stats/History sub-toggle, week list, streak counter |
| `src/components/DayButton.jsx` | Warm palette update |
| `src/components/SettingsPage.jsx` | Warm palette update |
