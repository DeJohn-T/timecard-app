import React from 'react';
import { isToday, DAY_ABBREVS } from '../lib/dates.js';

export default function DayButton({ date, isSelected, hasEntry, onClick }) {
  const today = isToday(date);
  const dayAbbrev = DAY_ABBREVS[date.getDay()];
  const dateNum = date.getDate();
  const isPay = dateNum === 15 || dateNum === 30;

  let bg = 'var(--surface)';
  let border = '2px solid transparent';
  let textColor = 'var(--text-muted)';
  let numColor = 'var(--text)';
  let className = '';

  if (isSelected) {
    bg = isPay ? 'rgba(246,201,78,0.1)' : 'var(--accent-dim)';
    border = isPay ? '2px solid var(--pay)' : '2px solid var(--accent)';
    textColor = isPay ? 'var(--pay)' : 'var(--accent)';
    numColor = isPay ? 'var(--pay)' : 'var(--accent)';
  } else if (today) {
    bg = isPay ? 'rgba(246,201,78,0.07)' : 'var(--today-bg)';
    border = isPay ? '2px solid var(--pay)' : '2px solid rgba(108,143,255,0.45)';
    textColor = isPay ? 'var(--pay)' : '#a0aaff';
    numColor = 'var(--text)';
    className = isPay ? 'payday-card' : 'today-btn';
  } else if (isPay) {
    border = '2px solid rgba(246,201,78,0.5)';
    textColor = 'rgba(246,201,78,0.7)';
  }

  return (
    <button
      onClick={onClick}
      className={className}
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
      <span style={{ fontSize: 17, fontWeight: today || isPay ? 700 : 500, color: numColor, lineHeight: 1 }}>
        {dateNum}
      </span>
      {isPay && (
        <span style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: 'var(--pay)',
          opacity: 0.9,
        }} />
      )}
      {hasEntry && !isPay && (
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
      {hasEntry && isPay && (
        <span style={{
          position: 'absolute',
          bottom: 5,
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: 'var(--pay)',
        }} />
      )}
    </button>
  );
}
