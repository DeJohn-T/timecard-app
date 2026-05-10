import React, { useState, useEffect, useCallback, useRef } from 'react';
import DayButton from './components/DayButton.jsx';
import DayEntry from './components/DayEntry.jsx';
import EmailPreview from './components/EmailPreview.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import Dashboard from './components/Dashboard.jsx';
import {
  getWeekDates, getWeekKey, getDateKey, formatWeekRange,
  parseHoursFromTimes, isTodayFridayAfter8AM, isToday,
} from './lib/dates.js';
import { getEntries, saveEntry, isWeekSubmitted, markWeekSubmitted, getSettings } from './lib/storage.js';

export default function App() {
  const weekDates = getWeekDates();
  const weekKey = getWeekKey(weekDates);

  const todayIndex = weekDates.findIndex(isToday);
  const [selectedIndex, setSelectedIndex] = useState(todayIndex >= 0 ? todayIndex : 0);
  const [entries, setEntries] = useState(() => getEntries(weekKey));
  const [showEmail, setShowEmail] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(() => getSettings());
  const [submitted, setSubmitted] = useState(() => isWeekSubmitted(weekKey));
  const [fridayBanner, setFridayBanner] = useState(false);
  const [view, setView] = useState('log'); // 'log' | 'dashboard'
  const saveTimer = useRef({});

  useEffect(() => {
    if (!submitted && isTodayFridayAfter8AM(settings.timezone)) {
      const hasAny = Object.values(entries).some(
        (e) => e?.bullets?.length > 0 || e?.notes?.trim() || e?.startTime || e?.hours
      );
      if (hasAny) setFridayBanner(true);
    }
  }, []);

  const handleEntryChange = useCallback((dateKey, entry) => {
    setEntries((prev) => ({ ...prev, [dateKey]: entry }));
    clearTimeout(saveTimer.current[dateKey]);
    saveTimer.current[dateKey] = setTimeout(() => {
      saveEntry(weekKey, dateKey, entry);
    }, 400);
  }, [weekKey]);

  const totalHours = Object.values(entries).reduce((sum, e) => {
    if (!e) return sum;
    if (e.startTime && e.endTime) return sum + (parseHoursFromTimes(e.startTime, e.endTime) || 0);
    return sum + (parseFloat(e.hours) || 0);
  }, 0);

  const hasEntries = Object.values(entries).some(
    (e) => e && (e.bullets?.length > 0 || e.notes?.trim() || e.startTime || e.hours)
  );

  const selectedDate = weekDates[selectedIndex];
  const selectedKey = getDateKey(selectedDate);
  const selectedEntry = entries[selectedKey] || {};

  const handleSubmitted = () => {
    markWeekSubmitted(weekKey);
    setSubmitted(true);
    setShowEmail(false);
    setFridayBanner(false);
  };

  const fmtH = (h) => (h % 1 === 0 ? `${h}.0` : h.toFixed(2).replace(/0+$/, ''));

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Timecard</h1>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{formatWeekRange(weekDates)}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {totalHours > 0 && view === 'log' && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {fmtH(totalHours)}h
            </span>
          )}
          <button onClick={() => setShowSettings(true)} style={iconBtnStyle} title="Settings">⚙️</button>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
        {['log', 'dashboard'].map((tab) => (
          <button
            key={tab}
            onClick={() => setView(tab)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 7,
              border: 'none',
              background: view === tab ? 'var(--bg)' : 'transparent',
              color: view === tab ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: view === tab ? 600 : 400,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {tab === 'log' ? 'Log' : 'Dashboard'}
          </button>
        ))}
      </div>

      {view === 'log' ? (
        <>
          {/* Friday banner */}
          {fridayBanner && !submitted && (
            <div style={{
              background: 'var(--accent-dim)',
              border: '1px solid var(--accent)',
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 14, color: 'var(--text)' }}>It's Friday - time to send your timecard!</span>
              <button onClick={() => setShowEmail(true)} style={{
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                Generate
              </button>
            </div>
          )}

          {submitted && (
            <div style={{
              background: 'var(--success-dim)', border: '1px solid var(--success)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 14,
              fontSize: 14, color: 'var(--success)',
            }}>
              Timecard submitted for this week.
            </div>
          )}

          {/* Day buttons */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between', padding: '4px 0 16px' }}>
            {weekDates.map((date, i) => {
              const dk = getDateKey(date);
              const e = entries[dk];
              const hasDot = !!(e?.bullets?.length > 0 || e?.notes?.trim() || e?.hours || e?.startTime);
              return (
                <DayButton
                  key={i}
                  date={date}
                  isSelected={i === selectedIndex}
                  hasEntry={hasDot}
                  onClick={() => setSelectedIndex(i)}
                />
              );
            })}
          </div>

          <DayEntry
            date={selectedDate}
            entry={selectedEntry}
            onChange={(entry) => handleEntryChange(selectedKey, entry)}
          />

          {hasEntries && !submitted && (
            <div style={{ marginTop: 24, paddingBottom: 40 }}>
              <button onClick={() => setShowEmail(true)} style={{ ...primaryBtnStyle, width: '100%' }}>
                Generate Email Draft
              </button>
            </div>
          )}
        </>
      ) : (
        <Dashboard currentWeekHours={totalHours} currentWeekKey={weekKey} />
      )}

      {showEmail && (
        <EmailPreview
          entries={entries}
          weekDates={weekDates}
          settings={settings}
          weekKey={weekKey}
          onSubmitted={handleSubmitted}
          onClose={() => setShowEmail(false)}
        />
      )}

      {showSettings && (
        <SettingsPage
          settings={settings}
          onSave={(s) => { setSettings(s); setShowSettings(false); }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

const iconBtnStyle = {
  background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1,
};

const primaryBtnStyle = {
  background: 'var(--accent)', color: '#fff', border: 'none',
  borderRadius: 10, padding: '14px 20px', fontSize: 16, fontWeight: 600, cursor: 'pointer',
};
