import React, { useState } from 'react';
import { saveSettings } from '../lib/storage.js';

export default function SettingsPage({ settings, onSave, onClose }) {
  const [form, setForm] = useState({ ...settings });
  const [saved, setSaved] = useState(false);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const save = () => {
    saveSettings(form);
    setSaved(true);
    setTimeout(() => { setSaved(false); onSave(form); }, 800);
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={sheetStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: 'var(--text)' }}>Settings</h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <Field label="Your name (for email signature)">
          <input
            type="text"
            value={form.myName}
            onChange={(e) => update('myName', e.target.value)}
            placeholder="DeJohn Thompson"
            style={inputStyle}
          />
        </Field>

        <Field label="Recipient emails (comma-separated)">
          <input
            type="text"
            value={form.recipientEmails}
            onChange={(e) => update('recipientEmails', e.target.value)}
            placeholder="boss@company.com, payroll@company.com"
            style={inputStyle}
          />
        </Field>

        <Field label="Anthropic API key">
          <input
            type="password"
            value={form.apiKey}
            onChange={(e) => update('apiKey', e.target.value)}
            placeholder="sk-ant-..."
            style={inputStyle}
            autoComplete="off"
          />
        </Field>

        <Field label="Timezone">
          <select value={form.timezone} onChange={(e) => update('timezone', e.target.value)} style={inputStyle}>
            <option value="America/Chicago">Central (America/Chicago)</option>
            <option value="America/New_York">Eastern (America/New_York)</option>
            <option value="America/Denver">Mountain (America/Denver)</option>
            <option value="America/Los_Angeles">Pacific (America/Los_Angeles)</option>
          </select>
        </Field>

        <Field label="Auto-send mode">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.autoSend}
              onChange={(e) => update('autoSend', e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Auto-send on Friday 8 AM (no review). Off = show draft first.
            </span>
          </label>
        </Field>

        <button onClick={save} style={{ ...primaryBtnStyle, width: '100%', marginTop: 8 }}>
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</label>
      {children}
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
  padding: '20px 20px 36px',
  width: '100%',
  maxWidth: 600,
  maxHeight: '90vh',
  overflowY: 'auto',
};

const inputStyle = {
  width: '100%',
  background: 'var(--input-bg)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '10px 12px',
  color: 'var(--text)',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
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
  padding: '13px 20px',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
};
