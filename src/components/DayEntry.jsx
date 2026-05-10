import React from 'react';
import { formatDayLabel } from '../lib/dates.js';
import BulletInput from './BulletInput.jsx';

export default function DayEntry({ date, entry, onChange }) {
  const update = (field, value) => onChange({ ...entry, [field]: value });
  const label = formatDayLabel(date);

  const bullets = entry.bullets || (entry.notes ? [entry.notes] : []);

  return (
    <div style={{ padding: '16px 0 0' }}>
      <p style={{ margin: '0 0 12px', fontWeight: 600, color: 'var(--text)', fontSize: 15 }}>{label}</p>

      <BulletInput
        bullets={bullets}
        onChange={(b) => update('bullets', b)}
      />

      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <label style={{ flex: 1 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Start</span>
          <input
            type="time"
            value={entry.startTime || ''}
            onChange={(e) => update('startTime', e.target.value)}
            style={timeInputStyle}
          />
        </label>
        <label style={{ flex: 1 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>End</span>
          <input
            type="time"
            value={entry.endTime || ''}
            onChange={(e) => update('endTime', e.target.value)}
            style={timeInputStyle}
          />
        </label>
        <label style={{ flex: 1 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Hours</span>
          <input
            type="number"
            step="0.5"
            min="0"
            max="24"
            placeholder="—"
            value={entry.hours || ''}
            onChange={(e) => update('hours', e.target.value)}
            style={timeInputStyle}
          />
        </label>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
        Auto-saved. Start/end takes priority over hours field.
      </p>
    </div>
  );
}

const timeInputStyle = {
  width: '100%',
  background: 'var(--input-bg)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 10px',
  color: 'var(--text)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};
