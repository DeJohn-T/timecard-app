import React, { useState, useRef } from 'react';
import { saveSettings, exportAllData, importAllData } from '../lib/storage.js';
import { seedDemoData } from '../lib/demoSeed.js';

export default function SettingsPage({ settings, onSave, onClose }) {
  const [form, setForm] = useState({ ...settings });
  const [saved, setSaved] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const importRef = useRef(null);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const save = () => {
    saveSettings(form);
    setSaved(true);
    setTimeout(() => { setSaved(false); onSave(form); }, 800);
  };

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timecard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const keyCount = Object.keys(data).filter(k => k.startsWith('timecard')).length;
        if (keyCount === 0) { setImportMsg('No timecard data found in file.'); return; }
        importAllData(data);
        setImportMsg(`✓ Restored ${keyCount} data keys. Reload to see changes.`);
      } catch {
        setImportMsg('Invalid backup file — could not parse JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
            <optgroup label="United States">
              <option value="America/New_York">Eastern — New York</option>
              <option value="America/Chicago">Central — Chicago</option>
              <option value="America/Denver">Mountain — Denver</option>
              <option value="America/Phoenix">Mountain (no DST) — Phoenix</option>
              <option value="America/Los_Angeles">Pacific — Los Angeles</option>
              <option value="America/Anchorage">Alaska — Anchorage</option>
              <option value="Pacific/Honolulu">Hawaii — Honolulu</option>
            </optgroup>
            <optgroup label="International">
              <option value="UTC">UTC</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris / Berlin / Rome</option>
              <option value="Europe/Helsinki">Helsinki / Athens</option>
              <option value="Asia/Dubai">Dubai</option>
              <option value="Asia/Kolkata">India (IST)</option>
              <option value="Asia/Bangkok">Bangkok / Jakarta</option>
              <option value="Asia/Shanghai">China (CST)</option>
              <option value="Asia/Tokyo">Tokyo</option>
              <option value="Australia/Sydney">Sydney</option>
            </optgroup>
          </select>
        </Field>

        <Field label="Hourly rate ($/hr)">
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="25.00"
            value={form.hourlyRate || ''}
            onChange={(e) => update('hourlyRate', e.target.value)}
            style={inputStyle}
          />
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

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4, marginBottom: 16 }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-muted)' }}>
            Demo — load realistic placeholder data for screenshots.
          </p>
          <button
            onClick={seedDemoData}
            style={{ width: '100%', background: 'var(--surface2)', color: 'var(--accent)', border: '1px solid rgba(200,121,65,0.35)', borderRadius: 8, padding: '11px', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
          >
            Load demo data
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-muted)' }}>
            Data backup — export saves everything to a file. Import restores from a previous export.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleExport} style={{ flex: 1, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px', fontSize: 14, cursor: 'pointer' }}>
              ⬇️ Export Backup
            </button>
            <button onClick={() => importRef.current?.click()} style={{ flex: 1, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px', fontSize: 14, cursor: 'pointer' }}>
              ⬆️ Import Backup
            </button>
            <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          </div>
          {importMsg && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: importMsg.startsWith('✓') ? 'var(--success)' : 'var(--error)' }}>
              {importMsg}
            </p>
          )}
        </div>

        <button onClick={save} style={{ ...primaryBtnStyle, width: '100%', marginTop: 16 }}>
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
