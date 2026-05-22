import React, { useState, useMemo } from 'react';
import {
  getCurrentPayPeriod, getPreviousPayPeriod,
  getHoursInPeriod, getPaychecks, savePaycheck,
  deletePaycheck, formatCurrency, getTotalLoggedHours,
} from '../lib/payStorage.js';

function fmtDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function PeriodCard({ period, hoursLogged, hourlyRate, label, loggedCheck, lastCheck }) {
  const estimated = hourlyRate && hoursLogged ? hoursLogged * parseFloat(hourlyRate) : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysLeft = Math.max(0, Math.round((period.end - today) / 86400000));

  return (
    <div style={{
      background: 'var(--surface)', border: `1.5px solid ${loggedCheck ? 'rgba(109,200,109,0.3)' : 'var(--border)'}`,
      borderRadius: 14, padding: '16px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </p>
        {lastCheck && (
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
            Last: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{formatCurrency(lastCheck.amount)}</span>
          </p>
        )}
      </div>
      <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--serif)' }}>
        {fmtDate(period.start)} – {fmtDate(period.end)}
      </p>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
        <Stat label="Hours logged" value={`${hoursLogged.toFixed(1)}h`} />
        {loggedCheck
          ? <Stat label="Check received" value={formatCurrency(loggedCheck.amount)} success />
          : estimated !== null
            ? <Stat label="Est. check" value={formatCurrency(estimated)} accent />
            : <Stat label="Est. check" value="Set rate →" muted />}
        {daysLeft > 0 && <Stat label="Days left" value={`${daysLeft}d`} />}
        <Stat label="Payday" value={fmtDate(period.payDate)} />
      </div>
      {loggedCheck && (
        <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--success)' }}>
          ✓ {loggedCheck.hoursLogged.toFixed(1)}h logged for this period
          {loggedCheck.notes ? ` · ${loggedCheck.notes}` : ''}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, accent, muted, success }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, lineHeight: 1, fontFamily: 'var(--serif)', color: success ? 'var(--success)' : accent ? 'var(--accent)' : muted ? 'var(--text-muted)' : 'var(--text)' }}>
        {value}
      </p>
    </div>
  );
}

function LogPaycheckForm({ currentPeriod, onSave, onCancel, existing }) {
  const [amount, setAmount] = useState(() => existing ? String(existing.amount) : '');
  const [periodStart, setPeriodStart] = useState(() => existing ? existing.periodStart : isoDate(currentPeriod.start));
  const [periodEnd, setPeriodEnd] = useState(() => existing ? existing.periodEnd : isoDate(currentPeriod.end));
  const [notes, setNotes] = useState(() => existing ? existing.notes : '');
  const [hours, setHours] = useState(() => {
    if (existing) return String(existing.hoursLogged);
    const start = isoDate(currentPeriod.start);
    const end = isoDate(currentPeriod.end);
    const h = getHoursInPeriod(new Date(start), new Date(end));
    return h > 0 ? h.toFixed(1) : '';
  });

  const recalcHours = () => {
    const h = getHoursInPeriod(new Date(periodStart), new Date(periodEnd));
    setHours(h > 0 ? h.toFixed(1) : '0');
  };

  const save = () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    savePaycheck({
      id: existing ? existing.id : crypto.randomUUID(),
      date: existing ? existing.date : new Date().toISOString().slice(0, 10),
      amount: parseFloat(amount),
      periodStart,
      periodEnd,
      hoursLogged: parseFloat(hours) || 0,
      notes,
    });
    onSave();
  };

  const inputStyle = { width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px', marginBottom: 16 }}>
      <p style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--serif)' }}>
        {existing ? 'Edit Paycheck' : 'Log Paycheck'}
      </p>

      <label style={{ display: 'block', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Amount received ($)</span>
        <input type="number" step="0.01" min="0" placeholder="500.00" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <label>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Period start</span>
          <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} style={inputStyle} />
        </label>
        <label>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Period end</span>
          <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <label style={{ display: 'block', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hours worked this period</span>
          <button onClick={recalcHours} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0 }}>
            ↺ Recalculate from logs
          </button>
        </div>
        <input type="number" step="0.5" min="0" placeholder="0" value={hours} onChange={(e) => setHours(e.target.value)} style={inputStyle} />
      </label>

      <label style={{ display: 'block', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes (optional)</span>
        <input type="text" placeholder="e.g. May 1–15 paycheck" value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} />
      </label>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
        <button onClick={save} disabled={!amount} style={{ flex: 2, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, cursor: amount ? 'pointer' : 'default', opacity: amount ? 1 : 0.5 }}>Save Check</button>
      </div>
    </div>
  );
}

export default function PayTab({ settings }) {
  const [showForm, setShowForm] = useState(false);
  const [editingPaycheck, setEditingPaycheck] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const currentPeriod = useMemo(() => getCurrentPayPeriod(), [refresh]);
  const prevPeriod = useMemo(() => getPreviousPayPeriod(), [refresh]);
  const currentHours = useMemo(() => getHoursInPeriod(currentPeriod.start, currentPeriod.end), [refresh]);
  const prevHours = useMemo(() => getHoursInPeriod(prevPeriod.start, prevPeriod.end), [refresh]);
  const paychecks = useMemo(() => getPaychecks(), [refresh]);
  const hourlyRate = settings.hourlyRate;

  const totalPaid = paychecks.reduce((sum, p) => sum + p.amount, 0);
  const totalHoursPaid = paychecks.reduce((sum, p) => sum + p.hoursLogged, 0);
  const totalLoggedHours = useMemo(() => getTotalLoggedHours(), [refresh]);
  const hoursBehind = Math.max(0, totalLoggedHours - totalHoursPaid);

  // Match logged paychecks to period cards
  const currentMatchedCheck = paychecks.find(p => p.periodStart === isoDate(currentPeriod.start) && p.periodEnd === isoDate(currentPeriod.end));
  const prevMatchedCheck = paychecks.find(p => p.periodStart === isoDate(prevPeriod.start) && p.periodEnd === isoDate(prevPeriod.end));

  const onSave = () => { setShowForm(false); setEditingPaycheck(null); setRefresh(r => r + 1); };
  const onCancel = () => { setShowForm(false); setEditingPaycheck(null); };

  return (
    <div style={{ padding: '8px 0 60px' }}>

      <PeriodCard
        period={currentPeriod} hoursLogged={currentHours} hourlyRate={hourlyRate}
        label="Current period" loggedCheck={currentMatchedCheck} lastCheck={prevMatchedCheck}
      />
      <PeriodCard
        period={prevPeriod} hoursLogged={prevHours} hourlyRate={hourlyRate}
        label="Previous period" loggedCheck={prevMatchedCheck}
      />

      {/* Outstanding hours card */}
      <div style={{
        background: hoursBehind > 0 ? 'rgba(200,121,65,0.08)' : 'var(--surface)',
        border: `1.5px solid ${hoursBehind > 0 ? 'rgba(200,121,65,0.35)' : 'var(--border)'}`,
        borderRadius: 14, padding: '14px 16px', marginBottom: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hours not yet paid</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
            {totalLoggedHours.toFixed(1)}h logged · {totalHoursPaid.toFixed(1)}h paid
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 700, fontFamily: 'var(--serif)', color: hoursBehind > 0 ? 'var(--accent)' : 'var(--success)', lineHeight: 1 }}>
            {hoursBehind > 0 ? `${hoursBehind.toFixed(1)}h` : '✓'}
          </p>
          {hoursBehind > 0 && hourlyRate && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
              ≈ {formatCurrency(hoursBehind * parseFloat(hourlyRate))}
            </p>
          )}
        </div>
      </div>

      {!hourlyRate && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 16 }}>
          Add your hourly rate in ⚙️ Settings to see estimated checks.
        </p>
      )}

      {(showForm || editingPaycheck) ? (
        <LogPaycheckForm
          currentPeriod={currentPeriod}
          existing={editingPaycheck}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: '100%', background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--serif)', marginBottom: 20,
          }}
        >
          + Log Paycheck
        </button>
      )}

      {paychecks.length > 0 && (
        <section>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            History
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {paychecks.map((p) => (
              <div key={p.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--serif)' }}>
                    {formatCurrency(p.amount)}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                    {p.periodStart} – {p.periodEnd} · {p.hoursLogged.toFixed(1)}h
                  </p>
                  {p.notes && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{p.notes}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-muted)' }}>Received {p.date}</p>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }}>
                    <button onClick={() => setEditingPaycheck(p)} style={{ background: 'var(--accent-dim)', border: '1px solid rgba(200,121,65,0.3)', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>
                      Edit
                    </button>
                    <button onClick={() => { deletePaycheck(p.id); setRefresh(r => r + 1); }} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, padding: '3px 10px', borderRadius: 6 }}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{paychecks.length} paychecks · {totalHoursPaid.toFixed(1)}h total</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--serif)' }}>{formatCurrency(totalPaid)}</span>
          </div>
        </section>
      )}

      {paychecks.length === 0 && !showForm && (
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', paddingTop: 8, fontStyle: 'italic' }}>
          Log your first paycheck to start tracking earnings.
        </p>
      )}
    </div>
  );
}
