import { formatDateForSubject } from './dates.js';

export function buildSubject(weekDates, myName) {
  const start = formatDateForSubject(weekDates[0]);
  const end = formatDateForSubject(weekDates[6]);
  return `Hours Worked ${start}-${end} ${myName || ''}`.trim();
}

export function openMailto(recipients, subject, body) {
  const to = Array.isArray(recipients) ? recipients.join(',') : recipients;
  const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}
