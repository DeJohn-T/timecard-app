# Import + Pay Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add screenshot/text import of old timecard emails (Claude extracts entries automatically) and a Pay tab that tracks hourly rate, estimates upcoming checks, and logs received paychecks.

**Architecture:** New `importer.js` handles Claude API (vision + text). New `payStorage.js` handles paychecks localStorage + period math. Two new components (`ImportSheet`, `PayTab`). App.jsx gets an import icon button and a third tab.

**Tech Stack:** React 18, Vite 5, Vitest, Claude API (existing proxy), Canvas API (image resize), localStorage

---

## File Map

| File | Change |
|---|---|
| `src/lib/importer.js` | Create — Claude vision + text extraction |
| `src/lib/payStorage.js` | Create — paychecks CRUD + period helpers |
| `src/components/ImportSheet.jsx` | Create — import sheet UI |
| `src/components/PayTab.jsx` | Create — pay tab UI |
| `src/lib/storage.js` | Modify — add `hourlyRate` to DEFAULT_SETTINGS |
| `src/components/SettingsPage.jsx` | Modify — hourly rate input field |
| `src/App.jsx` | Modify — import button + Pay tab + render new components |

---

## Task 1: payStorage.js + DEFAULT_SETTINGS update

**Files:**
- Create: `src/lib/payStorage.js`
- Modify: `src/lib/storage.js`
- Modify: `src/lib/__tests__/storage.test.js`

- [ ] **Step 1: Add `hourlyRate` to DEFAULT_SETTINGS in storage.js**

Find:
```js
export const DEFAULT_SETTINGS = {
  myName: '',
  recipientEmails: '',
  apiKey: '',
  autoSend: false,
  timezone: 'America/Chicago',
};
```
Replace with:
```js
export const DEFAULT_SETTINGS = {
  myName: '',
  recipientEmails: '',
  apiKey: '',
  autoSend: false,
  timezone: 'America/Chicago',
  hourlyRate: '',
};
```

- [ ] **Step 2: Create `src/lib/payStorage.js`**

```js
import { getAllWeeksWithEntries } from './storage.js';
import { parseHoursFromTimes } from './dates.js';

const PAYCHECKS_KEY = 'timecard-paychecks';

function calcEntryHoursLocal(entry) {
  if (!entry) return 0;
  const sessionHours = (entry.sessions || []).reduce((sum, s) => {
    if (s.startTime && s.endTime) return sum + (parseHoursFromTimes(s.startTime, s.endTime) || 0);
    return sum;
  }, 0);
  if (sessionHours > 0) return sessionHours;
  return parseFloat(entry.hours) || 0;
}

export function getCurrentPayPeriod(date = new Date()) {
  const y = date.getFullYear(), mo = date.getMonth(), d = date.getDate();
  if (d <= 15) {
    return {
      start: new Date(y, mo, 1),
      end: new Date(y, mo, 15),
      payDate: new Date(y, mo, 15),
    };
  }
  return {
    start: new Date(y, mo, 16),
    end: new Date(y, mo, 30),
    payDate: new Date(y, mo, 30),
  };
}

export function getPreviousPayPeriod(date = new Date()) {
  const y = date.getFullYear(), mo = date.getMonth(), d = date.getDate();
  if (d <= 15) {
    const prevMo = mo === 0 ? 11 : mo - 1;
    const prevY = mo === 0 ? y - 1 : y;
    return {
      start: new Date(prevY, prevMo, 16),
      end: new Date(prevY, prevMo, 30),
      payDate: new Date(prevY, prevMo, 30),
    };
  }
  return {
    start: new Date(y, mo, 1),
    end: new Date(y, mo, 15),
    payDate: new Date(y, mo, 15),
  };
}

export function getHoursInPeriod(periodStart, periodEnd) {
  const allWeeks = getAllWeeksWithEntries();
  let total = 0;
  for (const { entries } of allWeeks) {
    for (const [dateKey, entry] of Object.entries(entries)) {
      if (!entry) continue;
      const [y, m, d] = dateKey.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      date.setHours(0, 0, 0, 0);
      const start = new Date(periodStart); start.setHours(0, 0, 0, 0);
      const end = new Date(periodEnd); end.setHours(23, 59, 59, 999);
      if (date >= start && date <= end) {
        total += calcEntryHoursLocal(entry);
      }
    }
  }
  return total;
}

export function getPaychecks() {
  try {
    return JSON.parse(localStorage.getItem(PAYCHECKS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function savePaycheck(paycheck) {
  const existing = getPaychecks().filter((p) => p.id !== paycheck.id);
  existing.unshift(paycheck);
  localStorage.setItem(PAYCHECKS_KEY, JSON.stringify(existing));
}

export function deletePaycheck(id) {
  const existing = getPaychecks().filter((p) => p.id !== id);
  localStorage.setItem(PAYCHECKS_KEY, JSON.stringify(existing));
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
```

- [ ] **Step 3: Add a test for `getCurrentPayPeriod` and `getHoursInPeriod`**

Add to `src/lib/__tests__/storage.test.js` (append after existing tests, inside the file — do not replace existing tests):

```js
import { getCurrentPayPeriod } from '../payStorage.js';

describe('getCurrentPayPeriod', () => {
  it('returns first half for day <= 15', () => {
    const period = getCurrentPayPeriod(new Date(2026, 4, 10)); // May 10
    expect(period.start.getDate()).toBe(1);
    expect(period.end.getDate()).toBe(15);
    expect(period.payDate.getDate()).toBe(15);
  });

  it('returns second half for day > 15', () => {
    const period = getCurrentPayPeriod(new Date(2026, 4, 22)); // May 22
    expect(period.start.getDate()).toBe(16);
    expect(period.end.getDate()).toBe(30);
    expect(period.payDate.getDate()).toBe(30);
  });
});
```

- [ ] **Step 4: Run tests — all should pass**

```bash
cd ~/CodingWorkspaces/timecard-app && npm test
```

Expected: 16 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.js src/lib/payStorage.js src/lib/__tests__/storage.test.js
git commit -m "feat: payStorage utilities + hourlyRate setting"
```

---

## Task 2: importer.js

**Files:**
- Create: `src/lib/importer.js`

- [ ] **Step 1: Create `src/lib/importer.js`**

```js
const EXTRACTION_PROMPT = `Extract timecard data from the following timecard email. Return ONLY valid JSON with no other text, markdown, or explanation:
{
  "weekStart": "YYYY-MM-DD",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "hours": 5.0,
      "startTime": "9:00 PM",
      "endTime": "11:00 PM",
      "bullets": ["bullet 1", "bullet 2"]
    }
  ]
}

Rules:
- weekStart is the Saturday that begins the work week (format YYYY-MM-DD)
- date is each worked day (format YYYY-MM-DD)
- hours is a number (float). Calculate from start/end times if provided, otherwise use stated hours
- startTime and endTime should be in "H:MM AM/PM" format, or "" if not stated
- bullets is an array of activity descriptions for that day
- Only include days that have logged work
- If the year is not shown, assume 2026`;

async function callClaude(endpoint, apiKey, messages) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }
  const data = await response.json();
  const text = data.content[0].text.trim();
  // Strip any markdown code fences if present
  const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(clean);
}

async function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 1200;
        const scale = img.width > MAX ? MAX / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
        resolve({ base64, mediaType: 'image/jpeg' });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function extractFromImage(file, apiKey) {
  const endpoint = import.meta.env.DEV ? '/api/anthropic/v1/messages' : '/api/anthropic';
  const { base64, mediaType } = await resizeImage(file);
  return callClaude(endpoint, apiKey, [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
      { type: 'text', text: EXTRACTION_PROMPT },
    ],
  }]);
}

export async function extractFromText(text, apiKey) {
  const endpoint = import.meta.env.DEV ? '/api/anthropic/v1/messages' : '/api/anthropic';
  return callClaude(endpoint, apiKey, [{
    role: 'user',
    content: `${EXTRACTION_PROMPT}\n\nTimecard email content:\n${text}`,
  }]);
}

export function extractedToEntries(extractedData) {
  const { weekStart, days } = extractedData;
  const weekKey = `week-${weekStart}`;
  const entries = {};
  for (const day of days) {
    entries[day.date] = {
      sessions: [{
        id: crypto.randomUUID(),
        startTime: day.startTime || '',
        endTime: day.endTime || '',
        bullets: day.bullets || [],
      }],
      hours: (!day.startTime && day.hours) ? String(day.hours) : '',
    };
  }
  return { weekKey, entries };
}
```

- [ ] **Step 2: Run build to verify no syntax errors**

```bash
npm run build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/importer.js
git commit -m "feat: importer — Claude vision + text extraction"
```

---

## Task 3: SettingsPage — hourly rate field

**Files:**
- Modify: `src/components/SettingsPage.jsx`

- [ ] **Step 1: Add hourly rate field**

In `src/components/SettingsPage.jsx`, find the "Auto-send mode" Field and add a new Field before it:

```jsx
        <Field label="Hourly rate ($/hr)">
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="25.00"
            value={form.hourlyRate || ''}
            onChange={(e) => update('hourlyRate', e.target.value)}
            style={inputStyle}
          />
        </Field>
```

- [ ] **Step 2: Run build**

```bash
npm run build 2>&1 | tail -3
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsPage.jsx
git commit -m "feat: hourly rate field in settings"
```

---

## Task 4: ImportSheet.jsx

**Files:**
- Create: `src/components/ImportSheet.jsx`

- [ ] **Step 1: Create `src/components/ImportSheet.jsx`**

```jsx
import React, { useState, useRef } from 'react';
import { extractFromImage, extractFromText, extractedToEntries } from '../lib/importer.js';
import { getEntries, saveEntry } from '../lib/storage.js';
import { formatDayLabel } from '../lib/dates.js';

export default function ImportSheet({ settings, onImported, onClose }) {
  const [tab, setTab] = useState('image');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const fileRef = useRef(null);

  const extract = async () => {
    if (!settings.apiKey) { setError('No API key set. Add one in Settings first.'); return; }
    setLoading(true);
    setError('');
    try {
      let data;
      if (tab === 'image') {
        if (!file) { setError('Please select an image first.'); setLoading(false); return; }
        data = await extractFromImage(file, settings.apiKey);
      } else {
        if (!text.trim()) { setError('Please paste some text first.'); setLoading(false); return; }
        data = await extractFromText(text, settings.apiKey);
      }
      const { weekKey, entries } = extractedToEntries(data);
      const existing = getEntries(weekKey);
      const hasExisting = Object.keys(existing).length > 0;
      setPreview({ weekKey, entries, hasExisting, weekStart: data.weekStart });
    } catch (e) {
      setError(`Extraction failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const confirm = (overwrite) => {
    const { weekKey, entries } = preview;
    for (const [dateKey, entry] of Object.entries(entries)) {
      if (!overwrite) {
        const existing = getEntries(weekKey);
        if (existing[dateKey]) continue;
      }
      saveEntry(weekKey, dateKey, entry);
    }
    onImported(preview.weekKey);
    onClose();
  };

  const fmtDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return formatDayLabel(date);
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={sheetStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text)', fontFamily: 'var(--serif)', fontWeight: 600 }}>
            Import Week
          </h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {!preview ? (
          <>
            {/* Tab toggle */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
              {['image', 'text'].map((t) => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 7, border: 'none',
                  background: tab === t ? 'var(--surface2)' : 'transparent',
                  color: tab === t ? 'var(--text)' : 'var(--text-muted)',
                  fontWeight: tab === t ? 600 : 400, fontSize: 14, cursor: 'pointer',
                }}>
                  {t === 'image' ? '📷 Screenshot' : '📝 Paste Text'}
                </button>
              ))}
            </div>

            {tab === 'image' ? (
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Upload a screenshot of an old timecard email you sent.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => setFile(e.target.files[0] || null)}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: '100%', padding: '28px 16px', borderRadius: 12,
                    border: `2px dashed ${file ? 'var(--accent)' : 'var(--border)'}`,
                    background: file ? 'var(--accent-dim)' : 'var(--surface)',
                    color: file ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: 14, cursor: 'pointer', marginBottom: 12,
                    transition: 'all 0.15s',
                  }}
                >
                  {file ? `✓ ${file.name}` : 'Tap to choose image'}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                  Paste the body of your timecard email here.
                </p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Hi All, Hope your day is well. Here is my work log..."
                  rows={8}
                  style={{
                    width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '12px', color: 'var(--text)', fontSize: 13,
                    resize: 'none', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box',
                    marginBottom: 12,
                  }}
                />
              </div>
            )}

            {error && <p style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <button
              onClick={extract}
              disabled={loading}
              style={{
                width: '100%', background: 'var(--accent-gradient)', color: '#fff',
                border: 'none', borderRadius: 12, padding: '15px', fontSize: 16,
                fontWeight: 600, cursor: loading ? 'default' : 'pointer',
                fontFamily: 'var(--serif)', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Extracting...' : 'Extract Entries'}
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              Week of <strong style={{ color: 'var(--text)' }}>{preview.weekStart}</strong> · {Object.keys(preview.entries).length} days found
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, maxHeight: '40vh', overflowY: 'auto' }}>
              {Object.entries(preview.entries).sort(([a], [b]) => a.localeCompare(b)).map(([dateKey, entry]) => {
                const s = entry.sessions?.[0] || {};
                const hasTime = s.startTime && s.endTime;
                return (
                  <div key={dateKey} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '10px 12px',
                  }}>
                    <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--serif)' }}>
                      {fmtDate(dateKey)}
                      {hasTime && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent)', fontWeight: 400 }}>{s.startTime} – {s.endTime}</span>}
                      {!hasTime && entry.hours && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent)', fontWeight: 400 }}>{entry.hours}h</span>}
                    </p>
                    {(s.bullets || []).map((b, i) => (
                      <p key={i} style={{ margin: '2px 0', fontSize: 12, color: 'var(--text-muted)' }}>— {b}</p>
                    ))}
                  </div>
                );
              })}
            </div>

            {preview.hasExisting && !confirmOverwrite && (
              <p style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 10 }}>
                ⚠️ This week already has entries. Import will skip days that already have data.
              </p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPreview(null)} style={secondaryBtnStyle}>Back</button>
              {preview.hasExisting ? (
                <>
                  <button onClick={() => confirm(false)} style={{ ...primaryBtnStyle, flex: 1 }}>
                    Import New Days
                  </button>
                  <button onClick={() => confirm(true)} style={{ ...secondaryBtnStyle }}>
                    Overwrite All
                  </button>
                </>
              ) : (
                <button onClick={() => confirm(false)} style={{ ...primaryBtnStyle, flex: 1 }}>
                  Save to App
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 };
const sheetStyle = { background: 'var(--bg)', borderRadius: '16px 16px 0 0', padding: '20px 20px 36px', width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto' };
const closeBtnStyle = { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', padding: '4px 8px' };
const primaryBtnStyle = { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const secondaryBtnStyle = { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', fontSize: 14, cursor: 'pointer' };
```

- [ ] **Step 2: Run build**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ImportSheet.jsx
git commit -m "feat: ImportSheet — screenshot + text import with Claude extraction"
```

---

## Task 5: PayTab.jsx

**Files:**
- Create: `src/components/PayTab.jsx`

- [ ] **Step 1: Create `src/components/PayTab.jsx`**

```jsx
import React, { useState, useMemo } from 'react';
import {
  getCurrentPayPeriod, getPreviousPayPeriod,
  getHoursInPeriod, getPaychecks, savePaycheck,
  deletePaycheck, formatCurrency,
} from '../lib/payStorage.js';

function fmtDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function PeriodCard({ period, hoursLogged, hourlyRate, label }) {
  const estimated = hourlyRate && hoursLogged ? hoursLogged * parseFloat(hourlyRate) : null;
  const today = new Date(); today.setHours(0,0,0,0);
  const daysLeft = Math.max(0, Math.round((period.end - today) / 86400000));

  return (
    <div style={{
      background: 'var(--surface)', border: '1.5px solid var(--border)',
      borderRadius: 14, padding: '16px', marginBottom: 12,
    }}>
      <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </p>
      <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--serif)' }}>
        {fmtDate(period.start)} – {fmtDate(period.end)}
      </p>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
        <Stat label="Hours logged" value={`${hoursLogged % 1 === 0 ? hoursLogged.toFixed(1) : hoursLogged.toFixed(1)}h`} />
        {estimated !== null
          ? <Stat label="Est. check" value={formatCurrency(estimated)} accent />
          : <Stat label="Est. check" value="Set rate →" muted />}
        {daysLeft > 0 && <Stat label="Days left" value={`${daysLeft}d`} />}
        <Stat label="Payday" value={fmtDate(period.payDate)} />
      </div>
    </div>
  );
}

function Stat({ label, value, accent, muted }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, lineHeight: 1, fontFamily: 'var(--serif)', color: accent ? 'var(--accent)' : muted ? 'var(--text-muted)' : 'var(--text)' }}>
        {value}
      </p>
    </div>
  );
}

function LogPaycheckForm({ currentPeriod, currentHours, onSave, onCancel }) {
  const [amount, setAmount] = useState('');
  const [periodStart, setPeriodStart] = useState(() => currentPeriod.start.toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(() => currentPeriod.end.toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const save = () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    const hrs = getHoursInPeriod(new Date(periodStart), new Date(periodEnd));
    savePaycheck({
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      amount: parseFloat(amount),
      periodStart,
      periodEnd,
      hoursLogged: hrs,
      notes,
    });
    onSave();
  };

  const inputStyle = { width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px', marginBottom: 16 }}>
      <p style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--serif)' }}>Log Paycheck</p>

      <label style={{ display: 'block', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Amount received ($)</span>
        <input type="number" step="0.01" min="0" placeholder="500.00" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <label>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Period start</span>
          <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} style={inputStyle} />
        </label>
        <label>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Period end</span>
          <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <label style={{ display: 'block', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes (optional)</span>
        <input type="text" placeholder="e.g. May 1–15 paycheck" value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} />
      </label>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
        <button onClick={save} disabled={!amount} style={{ flex: 2, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, cursor: amount ? 'pointer' : 'default', opacity: amount ? 1 : 0.5 }}>Save Check</button>
      </div>
    </div>
  );
}

export default function PayTab({ settings }) {
  const [showForm, setShowForm] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const currentPeriod = useMemo(() => getCurrentPayPeriod(), [refresh]);
  const prevPeriod = useMemo(() => getPreviousPayPeriod(), [refresh]);
  const currentHours = useMemo(() => getHoursInPeriod(currentPeriod.start, currentPeriod.end), [refresh]);
  const prevHours = useMemo(() => getHoursInPeriod(prevPeriod.start, prevPeriod.end), [refresh]);
  const paychecks = useMemo(() => getPaychecks(), [refresh]);
  const hourlyRate = settings.hourlyRate;

  const totalPaid = paychecks.reduce((sum, p) => sum + p.amount, 0);
  const totalHoursPaid = paychecks.reduce((sum, p) => sum + p.hoursLogged, 0);

  const onSave = () => { setShowForm(false); setRefresh(r => r + 1); };

  return (
    <div style={{ padding: '8px 0 60px' }}>

      <PeriodCard period={currentPeriod} hoursLogged={currentHours} hourlyRate={hourlyRate} label="Current period" />
      <PeriodCard period={prevPeriod} hoursLogged={prevHours} hourlyRate={hourlyRate} label="Previous period" />

      {!hourlyRate && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 16 }}>
          Add your hourly rate in ⚙️ Settings to see estimated checks.
        </p>
      )}

      {showForm ? (
        <LogPaycheckForm
          currentPeriod={currentPeriod}
          currentHours={currentHours}
          onSave={onSave}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: '100%', background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--serif)', marginBottom: 20,
          }}
        >
          + Log Paycheck
        </button>
      )}

      {paychecks.length > 0 && (
        <section>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            History
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {paychecks.map((p) => (
              <div key={p.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--serif)' }}>
                    {formatCurrency(p.amount)}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                    {p.periodStart} – {p.periodEnd} · {p.hoursLogged.toFixed(1)}h logged
                  </p>
                  {p.notes && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{p.notes}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-muted)' }}>Received</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text)' }}>{p.date}</p>
                  <button onClick={() => { deletePaycheck(p.id); setRefresh(r => r + 1); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, marginTop: 4, padding: 0 }}>
                    remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{paychecks.length} paychecks · {totalHoursPaid.toFixed(1)}h total</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--serif)' }}>{formatCurrency(totalPaid)}</span>
          </div>
        </section>
      )}

      {paychecks.length === 0 && !showForm && (
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', paddingTop: 8, fontStyle: 'italic' }}>
          Log your first paycheck to start tracking earnings.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run build**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PayTab.jsx
git commit -m "feat: PayTab — period cards, log paycheck, history"
```

---

## Task 6: App.jsx — wire everything together

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add imports at the top of App.jsx**

Add these imports after the existing component imports:

```js
import ImportSheet from './components/ImportSheet.jsx';
import PayTab from './components/PayTab.jsx';
```

- [ ] **Step 2: Add state for import sheet and pay tab**

After `const [view, setView] = useState('log');` add:

```js
const [showImport, setShowImport] = useState(false);
```

And change the view state initial value — the tab nav needs to support a third view `'pay'`:
The existing state `const [view, setView] = useState('log');` stays as-is.

- [ ] **Step 3: Add import handler**

After `handleWeekNoteChange` add:

```js
const handleImported = (importedWeekKey) => {
  const importedDates = getWeekDates(new Date(importedWeekKey.replace('week-', '')));
  const importedOffset = Math.round(
    (getWeekDates()[0] - importedDates[0]) / (7 * 86400000)
  );
  setWeekOffset(Math.max(0, importedOffset));
  setView('log');
};
```

- [ ] **Step 4: Update the tab nav to include Pay tab**

Find the tab nav `{['log', 'dashboard'].map(...)` and replace it:

Old:
```jsx
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
          {['log', 'dashboard'].map((tab) => (
            <button key={tab} onClick={() => setView(tab)} style={{
              flex: 1, padding: '8px 0', borderRadius: 7, border: 'none',
              background: view === tab ? 'var(--surface2)' : 'transparent',
              color: view === tab ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: view === tab ? 600 : 400,
              fontSize: 14, cursor: 'pointer',
              boxShadow: view === tab ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            }}>
              {tab === 'log' ? '📋 Log' : '📊 Dashboard'}
            </button>
          ))}
        </div>
```

New:
```jsx
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
          {[['log', '📋 Log'], ['dashboard', '📊 Dashboard'], ['pay', '💵 Pay']].map(([tab, label]) => (
            <button key={tab} onClick={() => setView(tab)} style={{
              flex: 1, padding: '8px 0', borderRadius: 7, border: 'none',
              background: view === tab ? 'var(--surface2)' : 'transparent',
              color: view === tab ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: view === tab ? 600 : 400,
              fontSize: 13, cursor: 'pointer',
              boxShadow: view === tab ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            }}>
              {label}
            </button>
          ))}
        </div>
```

- [ ] **Step 5: Add import button to the header**

Find the settings gear button:
```jsx
          <button onClick={() => setShowSettings(true)} style={{
```

Add an import button right before it (inside the same flex container):
```jsx
          <button onClick={() => setShowImport(true)} style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
            fontSize: 16, lineHeight: 1, color: 'var(--text-muted)', marginRight: 6,
          }} title="Import week">⬆️</button>
          <button onClick={() => setShowSettings(true)} style={{
```

- [ ] **Step 6: Add Pay tab render**

Find the Dashboard render:
```jsx
        ) : (
          <Dashboard currentWeekHours={totalHours} currentWeekKey={weekKey} onWeekSelect={handleWeekSelect} />
        )}
```

Replace the ternary to handle 3 views:
```jsx
        ) : view === 'dashboard' ? (
          <Dashboard currentWeekHours={totalHours} currentWeekKey={weekKey} onWeekSelect={handleWeekSelect} />
        ) : (
          <PayTab settings={settings} />
        )}
```

Also fix the opening of the ternary — find:
```jsx
        {view === 'log' ? (
```
This stays the same since we changed the else branch.

- [ ] **Step 7: Add ImportSheet render**

At the very bottom of the JSX, before the closing `</>`, add after the SettingsPage render:

```jsx
      {showImport && (
        <ImportSheet
          settings={settings}
          onImported={handleImported}
          onClose={() => setShowImport(false)}
        />
      )}
```

- [ ] **Step 8: Run tests + build**

```bash
cd ~/CodingWorkspaces/timecard-app && npm test && npm run build 2>&1 | tail -5
```

Expected: 16 tests passing, build succeeds.

- [ ] **Step 9: Commit and push**

```bash
git add src/App.jsx
git commit -m "feat: import button + Pay tab wired into App"
git push origin main
```
