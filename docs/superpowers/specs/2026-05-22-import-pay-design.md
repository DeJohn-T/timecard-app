# Import + Pay Tab — Design Spec
**Date:** 2026-05-22  
**Status:** Approved

---

## 1. Import Feature

### Entry points
- Small import icon button in the log header (next to the settings gear)

### ImportSheet component
A bottom sheet with two tabs: **Upload Image** and **Paste Text**.

**Image tab:**
- `<input type="file" accept="image/*">` — triggers camera/photos picker on mobile
- Client-side resize to max 1200px wide + JPEG 85% quality before sending (keeps under Claude API limits)
- Sends base64 image to Claude vision API (`claude-sonnet-4-20250514`) with extraction prompt
- Extraction prompt instructs Claude to return strict JSON

**Text tab:**
- `<textarea>` where user pastes the email body or types manually
- Sends raw text to Claude text API with same extraction prompt

**Extraction prompt (both modes):**
```
Extract timecard data. Return ONLY valid JSON, no other text:
{
  "weekStart": "YYYY-MM-DD",
  "days": [
    { "date": "YYYY-MM-DD", "hours": 5.0, "startTime": "9:00 PM", "endTime": "11:00 PM", "bullets": ["bullet 1"] }
  ]
}
Week starts Saturday. Leave startTime/endTime as "" if not present. hours is a float.
```

**Preview step:**
After extraction, show a preview card per extracted day (date, hours, times, bullets). User can confirm or cancel.

**On confirm:**
- Convert each day to sessions format: `{ sessions: [{ id, startTime, endTime, bullets }], hours }`
- If `startTime`/`endTime` present → use them in session, set `hours: ''`
- If only `hours` → set `hours: String(day.hours)`, empty session times
- Compute `weekKey` from `weekStart` (`week-YYYY-MM-DD`)
- If week already has data → show "Overwrite existing entries?" confirmation
- Save via `saveEntry(weekKey, dateKey, entry)` for each day
- Navigate to that week in the log view

---

## 2. Pay Tab

### Navigation
3rd tab in the top tab bar: `📋 Log | 📊 Dashboard | 💵 Pay`

### Data model

**Settings (add to DEFAULT_SETTINGS):**
```js
hourlyRate: '' // string, e.g. '25.00'
```

**Paychecks (new localStorage key `timecard-paychecks`):**
```js
[{
  id: string,            // crypto.randomUUID()
  date: 'YYYY-MM-DD',   // date check was received
  amount: number,        // dollar amount
  periodStart: 'YYYY-MM-DD',
  periodEnd: 'YYYY-MM-DD',
  hoursLogged: number,   // auto-populated from logged data
  notes: string,
}]
```

### Pay period logic
- Periods: 1st–15th (paid on 15th), 16th–30th (paid on 30th)
- `getCurrentPayPeriod(date)` returns `{ start, end, payDate }`
- `getHoursInPeriod(start, end)` sums all logged hours across all weeks within the date range

### PayTab sections

**Current period card:**
- Period dates (e.g. "May 16 – May 30")
- Hours logged so far this period
- Estimated check: `hours × hourlyRate` (shows "Set rate in Settings" if no rate)
- Days remaining in period

**Log Paycheck:**
- Button → inline form
- Fields: Amount ($), Period (auto-suggested current period), Notes
- `hoursLogged` auto-filled from logged data for that period
- Save → prepends to paychecks list

**History list:**
- Each row: date received, period, amount, hours
- Running total: "X paychecks · $Y total · Z hours"

### Settings addition
New field in SettingsPage: "Hourly rate ($/hr)" — text input, saves to `settings.hourlyRate`

---

## 3. Files Changed

| File | Change |
|---|---|
| `src/lib/importer.js` | New — Claude API calls for image + text extraction |
| `src/lib/payStorage.js` | New — paychecks CRUD, period calc, hours-in-period |
| `src/components/ImportSheet.jsx` | New — image/text import UI + preview |
| `src/components/PayTab.jsx` | New — pay period card, log paycheck form, history |
| `src/lib/storage.js` | Add `hourlyRate: ''` to DEFAULT_SETTINGS |
| `src/components/SettingsPage.jsx` | Add hourly rate field |
| `src/App.jsx` | Import button, Pay tab, ImportSheet + PayTab render |
