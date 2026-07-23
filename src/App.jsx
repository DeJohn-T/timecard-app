import React, { useState, useEffect, useCallback, useRef } from 'react';
import DayButton from './components/DayButton.jsx';
import DayEntry from './components/DayEntry.jsx';
import EmailPreview from './components/EmailPreview.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import Dashboard from './components/Dashboard.jsx';
import ImportSheet from './components/ImportSheet.jsx';
import PayTab from './components/PayTab.jsx';
import {
  getWeekDates, getWeekKey, getDateKey, formatWeekRange,
  parseHoursFromTimes, isTodayFridayAfter8AM, isToday,
} from './lib/dates.js';
import { getEntries, saveEntry, isWeekSubmitted, markWeekSubmitted, getSettings, getWeekNote, saveWeekNote } from './lib/storage.js';

function isPayday() {
  const d = new Date().getDate();
  return d === 15 || d === 30;
}

function daysUntilNextPayday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const y = now.getFullYear(), m = now.getMonth();
  const candidates = [
    new Date(y, m, 15), new Date(y, m, 30),
    new Date(y, m + 1, 15), new Date(y, m + 1, 30),
  ];
  for (const c of candidates) {
    c.setHours(0, 0, 0, 0);
    const diff = Math.round((c - now) / 86400000);
    if (diff >= 0) return diff;
  }
  return 0;
}

const GREETINGS = [
  'Log your work, get your bag.',
  "Don't forget Thursday's hours.",
  'Quick log = no missed paychecks.',
  'Future you will thank current you.',
  "30 seconds. That's all it takes.",
];

export default function App() {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDates = getWeekDates(new Date(Date.now() - weekOffset * 7 * 86400000));
  const weekKey = getWeekKey(weekDates);
  const [weekNote, setWeekNote] = useState(() => getWeekNote(weekKey));

  const todayIndex = weekDates.findIndex(isToday);
  const [selectedIndex, setSelectedIndex] = useState(todayIndex >= 0 ? todayIndex : 0);
  const [entries, setEntries] = useState(() => getEntries(weekKey));
  const [showEmail, setShowEmail] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(() => getSettings());
  const [submitted, setSubmitted] = useState(() => isWeekSubmitted(weekKey));
  const [fridayBanner, setFridayBanner] = useState(false);
  const [view, setView] = useState('log');
  const [showImport, setShowImport] = useState(false);
  const saveTimer = useRef({});

  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const orbs = [
      { x: 0.2, y: 0.3, r: 0.35, vx: 0.00012, vy: 0.00009, h: 25, s: 60, a: 0.08 },
      { x: 0.7, y: 0.6, r: 0.30, vx: -0.00010, vy: 0.00013, h: 35, s: 50, a: 0.07 },
      { x: 0.5, y: 0.1, r: 0.28, vx: 0.00008, vy: -0.00011, h: 20, s: 65, a: 0.06 },
      { x: 0.1, y: 0.8, r: 0.32, vx: 0.00014, vy: -0.00008, h: 40, s: 45, a: 0.07 },
      { x: 0.9, y: 0.4, r: 0.25, vx: -0.00009, vy: 0.00015, h: 15, s: 55, a: 0.06 },
    ];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0a0704';
      ctx.fillRect(0, 0, W, H);

      for (const o of orbs) {
        o.x += o.vx;
        o.y += o.vy;
        if (o.x < -0.3) o.x = 1.3;
        if (o.x > 1.3) o.x = -0.3;
        if (o.y < -0.3) o.y = 1.3;
        if (o.y > 1.3) o.y = -0.3;
        const gx = o.x * W, gy = o.y * H, gr = o.r * Math.max(W, H);
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        g.addColorStop(0, `hsla(${o.h}, ${o.s}%, 28%, ${o.a})`);
        g.addColorStop(1, `hsla(${o.h}, ${o.s}%, 10%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(gx, gy, gr, 0, Math.PI * 2);
        ctx.fill();
      }

      const imgData = ctx.getImageData(0, 0, W, H);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 16) {
        const n = (Math.random() - 0.5) * 12;
        d[i]   = Math.min(255, Math.max(0, d[i]   + n));
        d[i+1] = Math.min(255, Math.max(0, d[i+1] + n));
        d[i+2] = Math.min(255, Math.max(0, d[i+2] + n));
      }
      ctx.putImageData(imgData, 0, 0);
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const payday = isPayday();
  const daysUntilPay = daysUntilNextPayday();
  const greeting = GREETINGS[new Date().getDay() % GREETINGS.length];

  useEffect(() => {
    if (!submitted && isTodayFridayAfter8AM(settings.timezone)) {
      const hasAny = Object.values(entries).some(
        (e) => e?.bullets?.length > 0 || e?.notes?.trim() || e?.startTime || e?.hours
      );
      if (hasAny) setFridayBanner(true);
    }
  }, []);

  useEffect(() => {
    setEntries(getEntries(weekKey));
    setSubmitted(isWeekSubmitted(weekKey));
    setWeekNote(getWeekNote(weekKey));
    const idx = weekDates.findIndex(isToday);
    setSelectedIndex(idx >= 0 ? idx : 0);
  }, [weekKey]);

  const handleEntryChange = useCallback((dateKey, entry) => {
    setEntries((prev) => ({ ...prev, [dateKey]: entry }));
    clearTimeout(saveTimer.current[dateKey]);
    saveTimer.current[dateKey] = setTimeout(() => {
      saveEntry(weekKey, dateKey, entry);
    }, 400);
  }, [weekKey]);

  const totalHours = Object.values(entries).reduce((sum, e) => {
    if (!e) return sum;
    const sessionHours = (e.sessions || []).reduce((s, session) => {
      if (session.startTime && session.endTime) {
        return s + (parseHoursFromTimes(session.startTime, session.endTime) || 0);
      }
      return s;
    }, 0);
    if (sessionHours > 0) return sum + sessionHours;
    return sum + (parseFloat(e.hours) || 0);
  }, 0);

  const hasEntries = Object.values(entries).some(
    (e) => e && (
      e.sessions?.some((s) => s.bullets?.length > 0 || s.startTime) ||
      parseFloat(e.hours) > 0
    )
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

  const handleWeekSelect = (offset) => {
    setWeekOffset(offset);
    setView('log');
  };

  const handleWeekNoteChange = (note) => {
    setWeekNote(note);
    saveWeekNote(weekKey, note);
  };

  const handleImported = (importedWeekKey) => {
    const importedStart = importedWeekKey.replace('week-', '');
    const [iy, im, id] = importedStart.split('-').map(Number);
    const importedDate = new Date(iy, im - 1, id);
    const currentStart = getWeekDates()[0];
    const offset = Math.max(0, Math.round((currentStart - importedDate) / (7 * 86400000)));
    setWeekOffset(offset);
    setView('log');
  };

  const fmtH = (h) => (h % 1 === 0 ? `${h}.0` : h.toFixed(2).replace(/0+$/, ''));

  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingTop: 'clamp(24px, 7vh, 72px)' }}>

      {/* Header band */}
      <div style={{
        background: 'linear-gradient(160deg, #150e08 0%, #0a0704 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '16px 16px 14px',
      }}>
        {/* Payday banner */}
        {payday && (
          <div style={{
            borderRadius: 10, padding: '10px 14px', marginBottom: 12,
            background: 'linear-gradient(135deg, #2a2210 0%, #1a1a0e 100%)',
            border: '1.5px solid var(--pay)',
            display: 'flex', alignItems: 'center', gap: 10,
            animation: 'pay-glow 1.4s ease-in-out infinite',
          }}>
            <span style={{ fontSize: 20 }}>💰</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--pay)' }}>It's Payday!</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Get that bag secured.</p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', fontFamily: 'var(--serif)' }}>
                Timecard
              </h1>
              {view === 'log' && (
                <span style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--accent)',
                  background: 'var(--accent-dim)', borderRadius: 6,
                  padding: '2px 8px', border: '1px solid rgba(200,121,65,0.3)',
                }}>
                  {fmtH(totalHours)}h
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 0' }}>
              <button
                onClick={() => setWeekOffset((o) => o + 1)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
              >‹</button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {formatWeekRange(weekDates)}
                {weekOffset > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>past</span>
                )}
                <span style={{
                  marginLeft: 8,
                  fontWeight: 700,
                  color: payday ? 'var(--pay)' : daysUntilPay <= 3 ? 'var(--pay)' : 'var(--text-muted)',
                }}>
                  · {payday ? '💰 Payday Today' : `Payday in ${daysUntilPay}d`}
                </span>
              </span>
              <button
                onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
                disabled={weekOffset === 0}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: weekOffset === 0 ? 'default' : 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px', opacity: weekOffset === 0 ? 0.25 : 1 }}
              >›</button>
            </div>
          </div>
          <button onClick={() => setShowImport(true)} style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
            fontSize: 16, lineHeight: 1, color: 'var(--text-muted)', marginRight: 6,
          }} title="Import week">⬆️</button>
          <button onClick={() => setShowSettings(true)} style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
            fontSize: 16, lineHeight: 1, color: 'var(--text-muted)',
          }} title="Settings">⚙️</button>
        </div>
      </div>

      <div style={{ padding: '12px 16px', flex: 1 }}>
        {/* Tab nav */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
          {[['log', '📋 Log'], ['dashboard', '📊 Dashboard'], ['pay', '💵 Pay']].map(([tab, label]) => (
            <button key={tab} onClick={() => setView(tab)} style={{
              flex: 1, padding: '8px 0', borderRadius: 7, border: 'none',
              background: view === tab ? 'var(--surface2)' : 'transparent',
              color: view === tab ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: view === tab ? 600 : 400,
              fontSize: 13, cursor: 'pointer',
              boxShadow: view === tab ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            }}>
              {label}
            </button>
          ))}
        </div>

        {view === 'log' ? (
          <>
            {fridayBanner && !submitted && (
              <div style={{
                background: 'var(--accent-dim)', border: '1px solid rgba(108,143,255,0.4)',
                borderRadius: 10, padding: '11px 14px', marginBottom: 12,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 14, color: 'var(--text)' }}>
                  {payday ? '💰 Friday + Payday — send that timecard!' : "⏰ It's Friday — send your timecard!"}
                </span>
                <button onClick={() => setShowEmail(true)} style={{
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                }}>Generate</button>
              </div>
            )}

            {submitted && (
              <div style={{
                background: 'var(--success-dim)', border: '1px solid var(--success)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 12,
                fontSize: 14, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                ✓ Timecard submitted for this week.
              </div>
            )}

            {/* Day buttons */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
              {weekDates.map((date, i) => {
                const dk = getDateKey(date);
                const e = entries[dk];
                const hasDot = !!(
                  e?.sessions?.some((s) => s.bullets?.length > 0 || s.startTime) ||
                  parseFloat(e?.hours) > 0
                );
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

            {/* Entry area */}
            <div className="fade-in" key={selectedIndex} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '16px',
              marginBottom: 16,
            }}>
              <DayEntry
                date={selectedDate}
                entry={selectedEntry}
                onChange={(entry) => handleEntryChange(selectedKey, entry)}
              />
            </div>

            <textarea
              value={weekNote}
              onChange={(e) => handleWeekNoteChange(e.target.value)}
              placeholder="Week note (private, not in email)..."
              rows={2}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderTop: '1px solid var(--border)',
                padding: '10px 0',
                color: 'var(--text-muted)',
                fontSize: 13,
                resize: 'none',
                outline: 'none',
                fontFamily: 'var(--serif)',
                fontStyle: 'italic',
                lineHeight: 1.5,
                marginBottom: 4,
              }}
            />

            {/* Empty state nudge */}
            {!hasEntries && (
              <p style={{
                textAlign: 'center', fontSize: 13, color: 'var(--text-muted)',
                padding: '8px 0', fontStyle: 'italic',
              }}>
                {greeting}
              </p>
            )}

            {hasEntries && !submitted && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => setShowEmail(true)} style={{
                  width: '100%', background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 12, padding: '15px 20px', fontSize: 16, fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '-0.01em',
                  boxShadow: '0 4px 20px rgba(200,121,65,0.25)',
                }}>
                  Generate Email Draft
                </button>
                <button onClick={handleSubmitted} style={{
                  width: '100%', background: 'none', color: 'var(--text-muted)',
                  border: '1px solid var(--border)', borderRadius: 12,
                  padding: '12px 20px', fontSize: 13, cursor: 'pointer',
                }}>
                  Already sent — Mark as Submitted
                </button>
              </div>
            )}

            <div style={{ paddingBottom: 40 }} />
          </>
        ) : view === 'dashboard' ? (
          <Dashboard currentWeekHours={totalHours} currentWeekKey={weekKey} onWeekSelect={handleWeekSelect} />
        ) : (
          <PayTab settings={settings} />
        )}
      </div>

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

      {showImport && (
        <ImportSheet
          settings={settings}
          onImported={handleImported}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  </>
  );
}
