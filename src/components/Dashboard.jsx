import React, { useMemo } from 'react';
import { getAllEntriesAcrossWeeks, getAllSubmittedWeeks } from '../lib/storage.js';
import { parseHoursFromTimes } from '../lib/dates.js';

function getNextPayday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  const candidates = [
    new Date(year, month, 15),
    new Date(year, month, 30),
    new Date(year, month + 1, 15),
    new Date(year, month + 1, 30),
  ];

  for (const d of candidates) {
    d.setHours(0, 0, 0, 0);
    if (d >= new Date(year, month, day)) return d;
  }
  return candidates[2];
}

function calcEntryHours(entry) {
  if (!entry) return 0;
  if (entry.startTime && entry.endTime) {
    return parseHoursFromTimes(entry.startTime, entry.endTime) || 0;
  }
  return parseFloat(entry.hours) || 0;
}

function extractBullets(allWeeks) {
  const bullets = [];
  for (const { entries } of allWeeks) {
    for (const entry of Object.values(entries)) {
      if (!entry) continue;
      if (entry.bullets) bullets.push(...entry.bullets);
      else if (entry.notes) bullets.push(entry.notes);
    }
  }
  return bullets;
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
    const words = b.toLowerCase().replace(/[^a-z0-9\s+]/g, ' ').split(/\s+/);
    for (const w of words) {
      if (w.length < 3 || STOP_WORDS.has(w)) continue;
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function DonutChart({ segments, size = 120, thickness = 28 }) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  let offset = 0;
  const COLORS = ['#5b7cf6', '#7c9ef8', '#a0b8fa', '#c4d4fc', '#3d64e6', '#9bb0fa', '#6b90f8', '#b8c8fb'];

  const arcs = segments.map((seg, i) => {
    const dash = (seg.value / total) * circumference;
    const gap = circumference - dash;
    const arc = (
      <circle
        key={i}
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={COLORS[i % COLORS.length]}
        strokeWidth={thickness}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${cx} ${cx})`}
      />
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

export default function Dashboard({ currentWeekHours, currentWeekKey }) {
  const allWeeks = useMemo(() => getAllEntriesAcrossWeeks(), []);
  const submittedWeeks = useMemo(() => getAllSubmittedWeeks(), []);

  const totalSubmittedHours = useMemo(() => {
    return allWeeks
      .filter(({ weekKey }) => submittedWeeks.includes(weekKey))
      .reduce((sum, { entries }) => {
        return sum + Object.values(entries).reduce((s, e) => s + calcEntryHours(e), 0);
      }, 0);
  }, [allWeeks, submittedWeeks]);

  const recentWeeks = useMemo(() => {
    return allWeeks
      .map(({ weekKey, entries }) => {
        const hours = Object.values(entries).reduce((s, e) => s + calcEntryHours(e), 0);
        const sunDate = weekKey.replace('week-', '');
        return { weekKey, hours, sunDate, submitted: submittedWeeks.includes(weekKey) };
      })
      .filter((w) => w.hours > 0)
      .sort((a, b) => b.sunDate.localeCompare(a.sunDate))
      .slice(0, 8)
      .reverse();
  }, [allWeeks, submittedWeeks]);

  const allBullets = useMemo(() => extractBullets(allWeeks), [allWeeks]);
  const keywords = useMemo(() => topKeywords(allBullets), [allBullets]);

  const nextPayday = getNextPayday();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilPay = Math.round((nextPayday - today) / (1000 * 60 * 60 * 24));

  const maxHours = Math.max(...recentWeeks.map((w) => w.hours), 1);
  const maxKeyword = keywords[0]?.[1] || 1;

  const fmtH = (h) => (h % 1 === 0 ? `${h}.0` : h.toFixed(1));

  return (
    <div style={{ padding: '8px 0 40px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Dashboard</h2>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        <StatCard label="This week" value={`${fmtH(currentWeekHours)}h`} sub="logged so far" />
        <StatCard
          label="Next payday"
          value={daysUntilPay === 0 ? '💰 Today!' : `${daysUntilPay}d`}
          sub={nextPayday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          payday={daysUntilPay === 0}
          accent={daysUntilPay <= 2 && daysUntilPay > 0}
        />
        <StatCard label="Total submitted" value={`${fmtH(totalSubmittedHours)}h`} sub={`${submittedWeeks.length} weeks`} />
        <StatCard label="Weeks logged" value={allWeeks.filter((w) => Object.values(w.entries).some((e) => calcEntryHours(e) > 0)).length} sub="all time" />
      </div>

      {/* Hours per week bar chart */}
      {recentWeeks.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h3 style={sectionHead}>Hours per week</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {recentWeeks.map((w) => {
              const label = w.sunDate.slice(5).replace('-', '/');
              const pct = (w.hours / maxHours) * 100;
              return (
                <div key={w.weekKey} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 36, flexShrink: 0, textAlign: 'right' }}>
                    {label}
                  </span>
                  <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 4, height: 18, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: w.submitted ? 'var(--accent)' : 'var(--today-bg)',
                      borderRadius: 4,
                      transition: 'width 0.4s ease',
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
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Blue = submitted</p>
        </section>
      )}

      {/* Top activities */}
      {keywords.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h3 style={sectionHead}>Top activities</h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <DonutChart
              segments={keywords.map(([word, count]) => ({ label: word, value: count }))}
              size={110}
              thickness={24}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {keywords.map(([word, count], i) => {
                const COLORS = ['#5b7cf6','#7c9ef8','#a0b8fa','#c4d4fc','#3d64e6','#9bb0fa','#6b90f8','#b8c8fb'];
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
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
            Based on keywords across all logged entries.
          </p>
        </section>
      )}

      {allWeeks.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
          No data yet. Start logging your work and the dashboard will fill in.
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, accent, payday }) {
  return (
    <div
      className={payday ? 'payday-today' : accent ? 'payday-card' : ''}
      style={{
        background: payday ? 'linear-gradient(135deg, #2a2210 0%, #1a1a0e 100%)' : 'var(--surface)',
        border: `1.5px solid ${payday ? 'var(--pay)' : accent ? 'rgba(246,201,78,0.5)' : 'var(--border)'}`,
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <p style={{ margin: 0, fontSize: 12, color: payday || accent ? 'var(--pay)' : 'var(--text-muted)' }}>{label}</p>
      <p style={{ margin: '4px 0 2px', fontSize: 22, fontWeight: 700, lineHeight: 1, color: payday ? 'var(--pay)' : accent ? 'var(--pay)' : 'var(--text)' }}>
        {value}
      </p>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  );
}

const sectionHead = { margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };
