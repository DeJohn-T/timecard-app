import React, { useState, useRef } from 'react';

export default function BulletInput({ bullets = [], onChange }) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    onChange([...bullets, text]);
    setDraft('');
  };

  const remove = (i) => {
    onChange(bullets.filter((_, idx) => idx !== i));
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && draft === '' && bullets.length > 0) {
      onChange(bullets.slice(0, -1));
    }
  };

  return (
    <div>
      {bullets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {bullets.map((b, i) => (
            <div key={i} style={bubbleStyle}>
              <span style={{ flex: 1, fontSize: 14, color: 'var(--text)', lineHeight: 1.4 }}>{b}</span>
              <button
                onClick={() => remove(i)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px', fontSize: 16, lineHeight: 1, flexShrink: 0 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder={bullets.length === 0 ? 'What did you work on? Press Enter to add' : 'Add another...'}
          style={{
            flex: 1,
            background: 'var(--input-bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px 12px',
            color: 'var(--text)',
            fontSize: 15,
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          style={{
            background: draft.trim() ? 'var(--accent)' : 'var(--surface)',
            color: draft.trim() ? '#fff' : 'var(--text-muted)',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 600,
            cursor: draft.trim() ? 'pointer' : 'default',
            transition: 'background 0.15s',
          }}
        >
          Add
        </button>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
        Press Enter or tap Add. Backspace on empty input removes last entry.
      </p>
    </div>
  );
}

const bubbleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 12px',
};
