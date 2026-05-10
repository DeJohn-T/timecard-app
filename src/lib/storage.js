const SETTINGS_KEY = 'timecard-settings';
const SUBMITTED_KEY = 'timecard-submitted';

export const DEFAULT_SETTINGS = {
  myName: '',
  recipientEmails: '',
  apiKey: '',
  autoSend: false,
  timezone: 'America/Chicago',
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

export function getEntries(weekKey) {
  try {
    return JSON.parse(localStorage.getItem(`timecard-entries-${weekKey}`) || '{}');
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

export function getAllEntriesAcrossWeeks() {
  const weeks = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('timecard-entries-')) {
      try {
        const weekKey = key.replace('timecard-entries-', '');
        const entries = JSON.parse(localStorage.getItem(key) || '{}');
        weeks.push({ weekKey, entries });
      } catch {}
    }
  }
  return weeks;
}
