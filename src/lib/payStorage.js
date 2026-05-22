import { getAllWeeksWithEntries } from './storage.js';
import { parseHoursFromTimes } from './dates.js';

const PAYCHECKS_KEY = 'timecard-paychecks';

function calcEntryHoursLocal(entry) {
  if (!entry) return 0;
  const sessionHours = (entry.sessions || []).reduce((sum, s) => {
    if (s.startTime && s.endTime) return sum + (parseHoursFromTimes(s.startTime, s.endTime) || 0);
    return sum;
  }, 0);
  if (sessionHours > 0) return sessionHours;
  return parseFloat(entry.hours) || 0;
}

export function getCurrentPayPeriod(date = new Date()) {
  const y = date.getFullYear(), mo = date.getMonth(), d = date.getDate();
  if (d <= 15) {
    return {
      start: new Date(y, mo, 1),
      end: new Date(y, mo, 15),
      payDate: new Date(y, mo, 15),
    };
  }
  return {
    start: new Date(y, mo, 16),
    end: new Date(y, mo, 30),
    payDate: new Date(y, mo, 30),
  };
}

export function getPreviousPayPeriod(date = new Date()) {
  const y = date.getFullYear(), mo = date.getMonth(), d = date.getDate();
  if (d <= 15) {
    const prevMo = mo === 0 ? 11 : mo - 1;
    const prevY = mo === 0 ? y - 1 : y;
    return {
      start: new Date(prevY, prevMo, 16),
      end: new Date(prevY, prevMo, 30),
      payDate: new Date(prevY, prevMo, 30),
    };
  }
  return {
    start: new Date(y, mo, 1),
    end: new Date(y, mo, 15),
    payDate: new Date(y, mo, 15),
  };
}

export function getHoursInPeriod(periodStart, periodEnd) {
  const allWeeks = getAllWeeksWithEntries();
  let total = 0;
  for (const { entries } of allWeeks) {
    for (const [dateKey, entry] of Object.entries(entries)) {
      if (!entry) continue;
      const [y, m, d] = dateKey.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      date.setHours(0, 0, 0, 0);
      const start = new Date(periodStart); start.setHours(0, 0, 0, 0);
      const end = new Date(periodEnd); end.setHours(23, 59, 59, 999);
      if (date >= start && date <= end) {
        total += calcEntryHoursLocal(entry);
      }
    }
  }
  return total;
}

export function getPaychecks() {
  try {
    return JSON.parse(localStorage.getItem(PAYCHECKS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function savePaycheck(paycheck) {
  const existing = getPaychecks().filter((p) => p.id !== paycheck.id);
  existing.unshift(paycheck);
  localStorage.setItem(PAYCHECKS_KEY, JSON.stringify(existing));
}

export function deletePaycheck(id) {
  const existing = getPaychecks().filter((p) => p.id !== id);
  localStorage.setItem(PAYCHECKS_KEY, JSON.stringify(existing));
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
