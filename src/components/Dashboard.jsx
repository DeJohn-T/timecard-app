import React, { useMemo, useState } from 'react';
import { getAllWeeksWithEntries, getAllSubmittedWeeks, computeStreak } from '../lib/storage.js';
import { parseHoursFromTimes, getWeekDates, getWeekKey } from '../lib/dates.js';

function calcEntryHours(entry) {
  if (!entry) return 0;
  const sessionHours = (entry.sessions || []).reduce((sum, s) => {
    if (s.startTime && s.endTime) return sum + (parseHoursFromTimes(s.startTime, s.endTime) || 0);
    return sum;
  }, 0);
  if (sessionHours > 0) return sessionHours;
  return parseFloat(entry.hours) || 0;
}

function extractBullets(allWeeks) {
  const bullets = [];
  for (const { entries } of allWeeks) {
    for (const entry of Object.values(entries)) {
      if (!entry) continue;
      for (const s of (entry.sessions || [])) {
        if (s.bullets) bullets.push(...s.bullets);
      }
      if (entry.notes) bullets.push(entry.notes);
    }
  }
  return bullets;
}

function weekKeyToOffset(weekKey) {
  const currentStart = getWeekDates()[0];
  const [, y, m, d] = weekKey.match(/week-(\d+)-(\d+)-(\d+)/);
  const targetStart = new Date(Number(y), Number(m) - 1, Number(d));
  return Math.round((currentStart - targetStart) / (7 * 86400000));
}

function weekLabel(weekKey) {
  const [, y, m, d] = weekKey.match(/week-(\d+)-(\d+)-(\d+)/);
  const start = new Date(Number(y), Number(m) - 1, Number(d));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.getMonth() + 1}/${start.getDate()} – ${end.getMonth() + 1}/${end.getDate()}`;
}

function weekDayKeys(weekKey) {
  const [, y, m, d] = weekKey.match(/week-(\d+)-(\d+)-(\d+)/);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(Number(y), Number(m) - 1, Number(d) + i);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  });
}

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'i','my','we','our','is','was','were','are','be','been','have','had',
  'did','do','does','will','would','could','should','it','its','this','that',
  'from','by','up','as','so','if','not','all','also','into','about','than',
  'more','over','after','before','some','out','then','there','no','new','just',
  'been','has','their','them','they','he','she','his','her','worked','work',
  'working','created','added','updated','fixed','made','got','set','put','use',
]);

function topKeywords(bullets, n = 8) {
  const freq = {};
  for (const b of bullets) {
    const words = b.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
    for (const w of words) {
      if (w.length < 3 || STOP_WORDS.has(w)) continue;
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function getNextPayday() {
  const now = new Date();
  const y = now.getFullYear(), mo = now.getMonth(), day = now.getDate();
  const candidates = [
    new Date(y, mo, 15), new Date(y, mo, 30),
    new Date(y, mo + 1, 15), new Date(y, mo + 1, 30),
  ];
  for (const c of candidates) {
    c.setHours(0, 0, 0, 0);
    if (c >= new Date(y, mo, day)) return c;
  }
  return candidates[2];
}

function DonutChart({ segments, size = 120, thickness = 28 }) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const COLORS = ['#c87941','#a85c28','#d4924e','#e8a96a','#8f5220','#b86c32','#f0b87a','#7a3f18'];
  let offset = 0;
  const arcs = segments.map((seg, i) => {
    const dash = (seg.value / total) * circ;
    const arc = (
      <circle key={i} cx={cx} cy={cx} r={r} fill="none"
        stroke={COLORS[i % COLORS.length]} strokeWidth={thickness}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${cx} ${cx})`} />
    );
    offset += dash;
    return arc;
  });
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--surface)" strokeWidth={thickness} />
      {arcs}
    </svg>
  );
}

function StatCard({ label, value, sub, accent, payday }) {
  return (
    <div
      className={payday ? 'payday-today' : accent ? 'payday-card' : ''}
      style={{
        background: payday ? 'linear-gradient(135deg, #2a1a08 0%, #1a1008 100%)' : 'var(--surface)',
        border: `1.5px solid ${payday ? 'var(--pay)' : accent ? 'rgba(212,168,75,0.5)' : 'var(--border)'}`,
        borderRadius: 12, padding: '14px 16px',
      }}
    >
      <p style={{ margin: 0, fontSize: 12, color: payday || accent ? 'var(--pay)' : 'var(--text-muted)' }}>{label}</p>
      <p style={{ margin: '4px 0 2px', fontSize: 22, fontWeight: 700, lineHeight: 1, fontFamily: 'var(--serif)', color: payday ? 'var(--pay)' : accent ? 'var(--pay)' : 'var(--text)' }}>
        {value}
      </p>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  );
}

function SubToggle({ subView, setSubView }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
      {['stats', 'history'].map((v) => (
        <button key={v} onClick={() => setSubView(v)} style={{
          flex: 1, padding: '7px 0', borderRadius: 7, border: 'none',
          background: subView === v ? 'var(--surface2)' : 'transparent',
          color: subView === v ? 'var(--text)' : 'var(--text-muted)',
          fontWeight: subView === v ? 600 : 400,
          fontSize: 13, cursor: 'pointer',
        }}>
          {v === 'stats' ? 'Stats' : 'History'}
        </button>
      ))}
    </div>
  );
}

const fmtH = (h) => (h % 1 === 0 ? `${h}.0` : h.toFixed(1));
const sectionHead = { margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };

export default function Dashboard({ currentWeekHours, currentWeekKey, onWeekSelect }) {
  const [subView, setSubView] = useState('stats');
  const allWeeks = useMemo(() => getAllWeeksWithEntries(), []);
  const submittedWeeks = useMemo(() => getAllSubmittedWeeks(), []);
  const streak = useMemo(() => computeStreak(allWeeks), [allWeeks]);

  const totalSubmittedHours = useMemo(() =>
    allWeeks
      .filter(({ weekKey }) => submittedWeeks.includes(weekKey))
      .reduce((sum, { entries }) => sum + Object.values(entries).reduce((s, e) => s + calcEntryHours(e), 0), 0),
    [allWeeks, submittedWeeks]
  );

  const recentWeeks = useMemo(() =>
    allWeeks
      .map(({ weekKey, entries }) => ({
        weekKey,
        hours: Object.values(entries).reduce((s, e) => s + calcEntryHours(e), 0),
        submitted: submittedWeeks.includes(weekKey),
      }))
      .filter((w) => w.hours > 0)
      .slice(0, 8)
      .reverse(),
    [allWeeks, submittedWeeks]
  );

  const keywords = useMemo(() => topKeywords(extractBullets(allWeeks)), [allWeeks]);
  const nextPayday = getNextPayday();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysUntilPay = Math.round((nextPayday - today) / (1000 * 60 * 60 * 24));
  const maxHours = Math.max(...recentWeeks.map((w) => w.hours), 1);

  if (subView === 'history') {
    return (
      <div style={{ padding: '8px 0 40px' }}>
        <SubToggle subView={subView} setSubView={setSubView} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allWeeks.map(({ weekKey, entries }) => {
            const totalHrs = Object.values(entries).reduce((s, e) => s + calcEntryHours(e), 0);
            if (totalHrs === 0) return null;
            const submitted = submittedWeeks.includes(weekKey);
            const isCurrent = weekKey === currentWeekKey;
            const offset = weekKeyToOffset(weekKey);
            const dayKeys = weekDayKeys(weekKey);
            return (
              <div
                key={weekKey}
                onClick={() => onWeekSelect(offset)}
                style={{
                  background: isCurrent ? 'var(--accent-dim)' : 'var(--surface)',
                  border: `1.5px solid ${isCurrent ? 'rgba(200,121,65,0.4)' : 'var(--border)'}`,
                  borderRadius: 12, padding: '12px 14px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--serif)' }}>
                    {weekLabel(weekKey)}
                  </p>
                  <p style={{ margin: '2px 0 8px', fontSize: 11, color: 'var(--text-muted)' }}>
                    {isCurrent ? 'Current week' : submitted ? '✓ Submitted' : 'Not submitted'}
                  </p>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {dayKeys.map((dk) => {
                      const hrs = calcEntryHours(entries[dk]);
                      return (
                        <div key={dk} style={{
                          flex: 1, height: 18, borderRadius: 4,
                          background: hrs > 0 ? 'rgba(200,121,65,0.2)' : 'rgba(255,255,255,0.03)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 7, color: hrs > 0 ? 'var(--accent)' : 'transparent',
                        }}>
                          {hrs > 0 ? `${Math.round(hrs)}h` : '·'}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--serif)', lineHeight: 1 }}>
                    {fmtH(totalHrs)}h
                  </p>
                  {submitted && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--success)' }}>sent</p>}
                </div>
              </div>
            );
          }).filter(Boolean)}
          {allWeeks.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
              No past weeks yet. Start logging!
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0 40px' }}>
      <SubToggle subView={subView} setSubView={setSubView} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        <StatCard label="This week" value={`${fmtH(currentWeekHours)}h`} sub="logged so far" />
        <StatCard
          label="Next payday" sub={nextPayday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          value={daysUntilPay === 0 ? '💰 Today!' : `${daysUntilPay}d`}
          payday={daysUntilPay === 0} accent={daysUntilPay <= 2 && daysUntilPay > 0}
        />
        <StatCard label="Total submitted" value={`${fmtH(totalSubmittedHours)}h`} sub={`${submittedWeeks.length} weeks`} />
        <StatCard label={streak > 0 ? `🔥 ${streak} wk streak` : 'Streak'} value={streak > 0 ? `${streak}` : '—'} sub={streak > 0 ? 'consecutive weeks' : 'log this week to start'} />
      </div>

      {recentWeeks.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h3 style={sectionHead}>Hours per week</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {recentWeeks.map((w) => {
              const label = w.weekKey.replace('week-', '').slice(5).replace('-', '/');
              return (
                <div key={w.weekKey} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 36, flexShrink: 0, textAlign: 'right' }}>{label}</span>
                  <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 4, height: 18, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${(w.hours / maxHours) * 100}%`,
                      background: w.submitted ? 'var(--accent)' : 'var(--today-bg)',
                      borderRadius: 4, transition: 'width 0.4s ease',
                      border: w.submitted ? 'none' : '1px solid var(--border)',
                    }} />
                  </div>
                  <span style={{ fontSize: 12, color: w.submitted ? 'var(--accent)' : 'var(--text-muted)', width: 36, flexShrink: 0 }}>
                    {fmtH(w.hours)}h
                  </span>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Amber = submitted</p>
        </section>
      )}

      {keywords.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h3 style={sectionHead}>Top activities</h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <DonutChart segments={keywords.map(([word, count]) => ({ label: word, value: count }))} size={110} thickness={24} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {keywords.map(([word, count], i) => {
                const COLORS = ['#c87941','#a85c28','#d4924e','#e8a96a','#8f5220','#b86c32','#f0b87a','#7a3f18'];
                return (
                  <div key={word} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{word}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>×{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>Based on keywords across all logged entries.</p>
        </section>
      )}

      {allWeeks.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
          No data yet. Start logging and the dashboard fills in.
        </p>
      )}
    </div>
  );
}
