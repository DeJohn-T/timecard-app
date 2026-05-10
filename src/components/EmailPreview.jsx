import React, { useState } from 'react';
import { buildSubject, openMailto } from '../lib/emailer.js';
import { generateEmail } from '../lib/formatter.js';

export default function EmailPreview({ entries, weekDates, settings, weekKey, onSubmitted, onClose }) {
  const [emailBody, setEmailBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const body = await generateEmail({ entries, weekDates, settings });
      setEmailBody(body);
      setGenerated(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const send = () => {
    const subject = buildSubject(weekDates, settings.myName);
    const recipients = settings.recipientEmails
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    openMailto(recipients, subject, emailBody);
    onSubmitted();
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={sheetStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: 'var(--text)' }}>Email Draft</h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {!generated ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
              Sending your notes to Claude to format your timecard email.
            </p>
            {error && <p style={{ color: 'var(--error)', marginBottom: 16, fontSize: 13 }}>{error}</p>}
            <button onClick={generate} disabled={loading} style={primaryBtnStyle}>
              {loading ? 'Generating...' : 'Generate Email'}
            </button>
            {!settings.apiKey && (
              <p style={{ color: 'var(--warning)', fontSize: 12, marginTop: 12 }}>
                No API key set. Add one in Settings first.
              </p>
            )}
          </div>
        ) : (
          <>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              style={{
                width: '100%',
                minHeight: 320,
                resize: 'vertical',
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '12px',
                color: 'var(--text)',
                fontSize: 13,
                lineHeight: 1.6,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
              }}
            />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              Edit above if needed. "Send" opens your email client pre-filled.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={generate} disabled={loading} style={secondaryBtnStyle}>
                {loading ? '...' : 'Regenerate'}
              </button>
              <button onClick={send} style={{ ...primaryBtnStyle, flex: 1 }}>
                Send via Email Client
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  zIndex: 100,
};

const sheetStyle = {
  background: 'var(--bg)',
  borderRadius: '16px 16px 0 0',
  padding: '20px 20px 32px',
  width: '100%',
  maxWidth: 600,
  maxHeight: '90vh',
  overflowY: 'auto',
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: 18,
  cursor: 'pointer',
  padding: '4px 8px',
};

const primaryBtnStyle = {
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '12px 20px',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryBtnStyle = {
  background: 'var(--surface)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '12px 16px',
  fontSize: 14,
  cursor: 'pointer',
};
