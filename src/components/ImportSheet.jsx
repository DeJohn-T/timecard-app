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

            {preview.hasExisting && (
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
                  <button onClick={() => confirm(true)} style={secondaryBtnStyle}>
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
