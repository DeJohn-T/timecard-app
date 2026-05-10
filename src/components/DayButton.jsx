import React from 'react';
import { isToday, DAY_ABBREVS } from '../lib/dates.js';

export default function DayButton({ date, isSelected, hasEntry, onClick }) {
  const today = isToday(date);
  const dayAbbrev = DAY_ABBREVS[date.getDay()];
  const dateNum = date.getDate();

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 60,
        borderRadius: 10,
        border: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
        background: isSelected ? 'var(--accent-dim)' : today ? 'var(--today-bg)' : 'var(--surface)',
        cursor: 'pointer',
        gap: 2,
        padding: 0,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 500, color: isSelected ? 'var(--accent)' : today ? 'var(--text)' : 'var(--text-muted)' }}>
        {dayAbbrev}
      </span>
      <span style={{ fontSize: 17, fontWeight: today ? 700 : 400, color: isSelected ? 'var(--accent)' : 'var(--text)' }}>
        {dateNum}
      </span>
      {hasEntry && (
        <span style={{
          position: 'absolute',
          bottom: 5,
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: isSelected ? 'var(--accent)' : 'var(--dot)',
        }} />
      )}
    </button>
  );
}
