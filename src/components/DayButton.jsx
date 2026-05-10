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
        flex: 1,
        minWidth: 0,
        height: 58,
        borderRadius: 10,
        border: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
        background: isSelected ? 'var(--accent-dim)' : today ? 'var(--today-bg)' : 'var(--surface)',
        cursor: 'pointer',
        gap: 1,
        padding: '0 2px',
        position: 'relative',
      }}
    >
      <span style={{
        fontSize: 10,
        fontWeight: 500,
        color: isSelected ? 'var(--accent)' : today ? 'var(--text)' : 'var(--text-muted)',
        letterSpacing: '0.02em',
      }}>
        {dayAbbrev}
      </span>
      <span style={{
        fontSize: 16,
        fontWeight: today ? 700 : 400,
        color: isSelected ? 'var(--accent)' : 'var(--text)',
        lineHeight: 1,
      }}>
        {dateNum}
      </span>
      {hasEntry && (
        <span style={{
          position: 'absolute',
          bottom: 5,
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: isSelected ? 'var(--accent)' : 'var(--dot)',
        }} />
      )}
    </button>
  );
}
