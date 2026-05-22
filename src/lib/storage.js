const SETTINGS_KEY = 'timecard-settings';
const SUBMITTED_KEY = 'timecard-submitted';

export const DEFAULT_SETTINGS = {
  myName: '',
  recipientEmails: '',
  apiKey: '',
  autoSend: false,
  timezone: 'America/Chicago',
  hourlyRate: '',
};

export function getSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function migrateEntry(entry) {
  if (!entry) return entry;
  if (entry.sessions) return entry;
  const bullets = entry.bullets || (entry.notes ? [entry.notes] : []);
  return {
    sessions: [{
      id: crypto.randomUUID(),
      startTime: entry.startTime || '',
      endTime: entry.endTime || '',
      bullets,
    }],
    hours: entry.hours || '',
  };
}

export function getEntries(weekKey) {
  try {
    const raw = JSON.parse(localStorage.getItem(`timecard-entries-${weekKey}`) || '{}');
    const migrated = {};
    for (const [key, entry] of Object.entries(raw)) {
      migrated[key] = migrateEntry(entry);
    }
    return migrated;
  } catch {
    return {};
  }
}

export function saveEntry(weekKey, dateKey, entry) {
  const entries = getEntries(weekKey);
  entries[dateKey] = entry;
  localStorage.setItem(`timecard-entries-${weekKey}`, JSON.stringify(entries));
}

export function isWeekSubmitted(weekKey) {
  try {
    const submitted = JSON.parse(localStorage.getItem(SUBMITTED_KEY) || '[]');
    return submitted.includes(weekKey);
  } catch {
    return false;
  }
}

export function markWeekSubmitted(weekKey) {
  try {
    const submitted = JSON.parse(localStorage.getItem(SUBMITTED_KEY) || '[]');
    if (!submitted.includes(weekKey)) {
      submitted.push(weekKey);
      localStorage.setItem(SUBMITTED_KEY, JSON.stringify(submitted));
    }
  } catch {
    localStorage.setItem(SUBMITTED_KEY, JSON.stringify([weekKey]));
  }
}

export function getAllSubmittedWeeks() {
  try {
    return JSON.parse(localStorage.getItem(SUBMITTED_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getAllWeeksWithEntries() {
  const weeks = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('timecard-entries-')) {
      try {
        const weekKey = key.replace('timecard-entries-', '');
        const raw = JSON.parse(localStorage.getItem(key) || '{}');
        const entries = {};
        for (const [dk, entry] of Object.entries(raw)) {
          entries[dk] = migrateEntry(entry);
        }
        weeks.push({ weekKey, entries });
      } catch {}
    }
  }
  weeks.sort((a, b) => b.weekKey.localeCompare(a.weekKey));
  return weeks;
}

export function getWeekNote(weekKey) {
  return localStorage.getItem(`timecard-weeknote-${weekKey}`) || '';
}

export function saveWeekNote(weekKey, note) {
  if (note) {
    localStorage.setItem(`timecard-weeknote-${weekKey}`, note);
  } else {
    localStorage.removeItem(`timecard-weeknote-${weekKey}`);
  }
}

export function computeStreak(allWeeks) {
  if (!allWeeks.length) return 0;
  let streak = 0;
  for (const { entries } of allWeeks) {
    const hasAny = Object.values(entries).some((e) => {
      if (!e) return false;
      const sessionHours = (e.sessions || []).some(
        (s) => s.bullets?.length > 0 || s.startTime || s.endTime
      );
      return sessionHours || parseFloat(e.hours) > 0;
    });
    if (!hasAny) break;
    streak++;
  }
  return streak;
}

// kept for any external callers — delegates to getAllWeeksWithEntries
export function getAllEntriesAcrossWeeks() {
  return getAllWeeksWithEntries();
}

export function exportAllData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('timecard')) {
      data[key] = localStorage.getItem(key);
    }
  }
  return data;
}

export function importAllData(data) {
  for (const [key, value] of Object.entries(data)) {
    if (typeof key === 'string' && key.startsWith('timecard') && typeof value === 'string') {
      localStorage.setItem(key, value);
    }
  }
}
