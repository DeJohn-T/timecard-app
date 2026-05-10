import React from 'react';
import { isToday, DAY_ABBREVS } from '../lib/dates.js';

export default function DayButton({ date, isSelected, hasEntry, onClick }) {
  const today = isToday(date);
  const dayAbbrev = DAY_ABBREVS[date.getDay()];
  const dateNum = date.getDate();

  let bg = 'var(--surface)';
  let border = '2px solid transparent';
  let textColor = 'var(--text-muted)';
  let numColor = 'var(--text)';

  if (isSelected) {
    bg = 'var(--accent-dim)';
    border = '2px solid var(--accent)';
    textColor = 'var(--accent)';
    numColor = 'var(--accent)';
  } else if (today) {
    bg = 'var(--today-bg)';
    border = '2px solid rgba(108,143,255,0.45)';
    textColor = '#a0aaff';
    numColor = 'var(--text)';
  }

  return (
    <button
      onClick={onClick}
      className={today && !isSelected ? 'today-btn' : ''}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        minWidth: 0,
        height: 60,
        borderRadius: 12,
        border,
        background: bg,
        cursor: 'pointer',
        gap: 2,
        padding: '0 2px',
        position: 'relative',
        transition: 'background 0.15s, border 0.15s',
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 600, color: textColor, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {dayAbbrev}
      </span>
      <span style={{ fontSize: 17, fontWeight: today ? 700 : 500, color: numColor, lineHeight: 1 }}>
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
          opacity: isSelected ? 1 : 0.7,
        }} />
      )}
    </button>
  );
}
