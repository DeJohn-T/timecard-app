export function getWeekDates(referenceDate = new Date()) {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0=Sun
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(d);
    date.setDate(d.getDate() + i);
    return date;
  });
}

export function getWeekKey(weekDates) {
  const sun = weekDates[0];
  return `week-${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(2, '0')}-${String(sun.getDate()).padStart(2, '0')}`;
}

export function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatDayLabel(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${days[date.getDay()]} (${date.getMonth() + 1}/${date.getDate()})`;
}

export function formatWeekRange(weekDates) {
  const start = weekDates[0];
  const end = weekDates[6];
  const startStr = `${start.getMonth() + 1}/${start.getDate()}`;
  const endStr = `${end.getMonth() + 1}/${end.getDate()}`;
  return `${startStr} - ${endStr}`;
}

export function formatDateForSubject(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function isTodayFridayAfter8AM(tz = 'America/Chicago') {
  const now = new Date();
  const localStr = now.toLocaleString('en-US', { timeZone: tz, weekday: 'long', hour: 'numeric', hour12: false });
  const parts = localStr.split(', ');
  const weekday = parts[0];
  const hour = parseInt(parts[1], 10);
  return weekday === 'Friday' && hour >= 8;
}

export function isToday(date) {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function parseHoursFromTimes(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const toMinutes = (t) => {
    const s = t.trim().toUpperCase();
    const isPM = s.includes('PM');
    const isAM = s.includes('AM');
    const clean = s.replace(/[APM\s]/g, '');
    const [hStr, mStr] = clean.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr || '0', 10);
    if (isNaN(h)) return null;
    if (isPM && h !== 12) h += 12;
    if (isAM && h === 12) h = 0;
    return h * 60 + m;
  };
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null) return null;
  const diff = (end - start) / 60;
  return diff > 0 ? diff : null;
}

export function formatHours(hours) {
  if (hours === null || hours === undefined) return null;
  return Number.isInteger(hours) ? `${hours}.0` : hours.toFixed(2).replace(/\.?0+$/, (m) => (m === '.00' ? '.0' : m));
}

export function formatTimeDisplay(time24) {
  if (!time24) return null;
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  const mins = m ? `:${String(m).padStart(2, '0')}` : ':00';
  return `${hour}${mins} ${period}`;
}

export const DAY_ABBREVS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
