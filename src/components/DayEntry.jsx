import React, { useRef, useCallback } from 'react';
import { formatDayLabel, parseHoursFromTimes } from '../lib/dates.js';
import BulletInput from './BulletInput.jsx';

function normalizeTime(raw) {
  const s = raw.trim();
  if (!s) return s;
  const match = s.match(/^(\d{1,2})(?::(\d{2}))?\s*([aApP][mM]?)?$/);
  if (!match) return s;
  let h = parseInt(match[1], 10);
  const m = match[2] ? match[2].padStart(2, '0') : '00';
  const ind = (match[3] || '').toLowerCase();
  let period;
  if (ind.startsWith('p')) period = 'PM';
  else if (ind.startsWith('a')) period = 'AM';
  else if (h >= 13 && h <= 23) { period = 'PM'; h -= 12; }
  else if (h === 0) { period = 'AM'; h = 12; }
  else if (h === 12) { period = 'PM'; }
  else { period = 'AM'; }
  return `${h}:${m} ${period}`;
}

export default function DayEntry({ date, entry, onChange }) {
  const label = formatDayLabel(date);
  const initialSession = useRef({ id: crypto.randomUUID(), startTime: '', endTime: '', bullets: [] });

  const sessions = (entry.sessions && entry.sessions.length > 0)
    ? entry.sessions
    : [initialSession.current];

  const hasTimes = sessions.some((s) => s.startTime && s.endTime);

  const updateSession = useCallback((idx, field, value) => {
    const updated = sessions.map((s, i) => (i === idx ? { ...s, [field]: value } : s));
    onChange({ ...entry, sessions: updated });
  }, [entry, onChange, sessions]);

  const addSession = useCallback(() => {
    const updated = [...sessions, { id: crypto.randomUUID(), startTime: '', endTime: '', bullets: [] }];
    onChange({ ...entry, sessions: updated });
  }, [entry, onChange, sessions]);

  const removeSession = useCallback((idx) => {
    const updated = sessions.filter((_, i) => i !== idx);
    onChange({ ...entry, sessions: updated });
  }, [entry, onChange, sessions]);

  return (
    <div style={{ paddingTop: 4 }}>
      <p style={{ margin: '0 0 14px', fontWeight: 600, color: 'var(--text)', fontSize: 17, fontFamily: 'var(--serif)' }}>
        {label}
      </p>

      {sessions.map((session, idx) => {
        const sessionHours = session.startTime && session.endTime
          ? parseHoursFromTimes(session.startTime, session.endTime)
          : null;

        return (
          <div
            key={session.id}
            style={{
              marginBottom: 16,
              paddingBottom: 16,
              borderBottom: idx < sessions.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            {sessions.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Session {idx + 1}
                </span>
                <button
                  onClick={() => removeSession(idx)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, padding: '2px 4px' }}
                >
                  Remove
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <label>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Start</span>
                <input
                  type="text"
                  inputMode="text"
                  placeholder="9:00 AM"
                  value={session.startTime}
                  onChange={(e) => updateSession(idx, 'startTime', e.target.value)}
                  onBlur={(e) => { const n = normalizeTime(e.target.value); if (n !== e.target.value) updateSession(idx, 'startTime', n); }}
                  style={inputStyle}
                />
              </label>
              <label>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  End{sessionHours !== null && (
                    <span style={{ marginLeft: 6, color: 'var(--accent)', fontWeight: 700 }}>
                      {sessionHours % 1 === 0 ? `${sessionHours}.0` : sessionHours.toFixed(1)}h
                    </span>
                  )}
                </span>
                <input
                  type="text"
                  inputMode="text"
                  placeholder="5:00 PM"
                  value={session.endTime}
                  onChange={(e) => updateSession(idx, 'endTime', e.target.value)}
                  onBlur={(e) => { const n = normalizeTime(e.target.value); if (n !== e.target.value) updateSession(idx, 'endTime', n); }}
                  style={inputStyle}
                />
              </label>
            </div>

            <BulletInput
              bullets={session.bullets}
              onChange={(b) => updateSession(idx, 'bullets', b)}
            />
          </div>
        );
      })}

      <button
        onClick={addSession}
        style={{
          background: 'none',
          border: '1px dashed var(--border)',
          borderRadius: 8,
          padding: '8px 14px',
          color: 'var(--text-muted)',
          fontSize: 13,
          cursor: 'pointer',
          width: '100%',
          marginBottom: 12,
          transition: 'border-color 0.15s, color 0.15s',
        }}
      >
        + Add Session
      </button>

      {!hasTimes && (
        <label>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Manual hours (fallback — used only when no times set)
          </span>
          <input
            type="number"
            step="0.5"
            min="0"
            max="24"
            placeholder="8"
            value={entry.hours || ''}
            onChange={(e) => onChange({ ...entry, sessions, hours: e.target.value })}
            style={{ ...inputStyle, width: '100%' }}
          />
        </label>
      )}

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
        Auto-saved. Add sessions for split work days.
      </p>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  background: 'var(--input-bg)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '9px 10px',
  color: 'var(--text)',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
};
