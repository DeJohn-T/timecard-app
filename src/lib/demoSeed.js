import { saveSettings, saveEntry, markWeekSubmitted, saveWeekNote } from './storage.js';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function makeEntry(sessions) {
  return { sessions, hours: '' };
}

function session(start, end, bullets) {
  return { id: uuid(), startTime: start, endTime: end, bullets };
}

// Relative to today (2026-06-10 = Wednesday)
// Week starts Saturday. Current week: Sat Jun 6 - Fri Jun 12
// weekKey format: week-YYYY-MM-DD (Saturday start)

export function seedDemoData() {
  // Settings
  saveSettings({
    myName: 'DeJohn Thompson',
    recipientEmails: 'manager@bestomer.com, payroll@bestomer.com',
    apiKey: '',
    autoSend: false,
    timezone: 'America/Chicago',
    hourlyRate: '22.50',
  });

  // --- Current week: week-2026-06-06 ---
  const curWeek = 'week-2026-06-06';

  saveEntry(curWeek, '2026-06-08', makeEntry([
    session('9:00 AM', '5:30 PM', [
      'Reviewed pull request for niche search pagination fix',
      'Debugged session timeout issue in Flask crawler',
      'Synced with team on Loom integration architecture',
      'Added input validation to batch sourcer',
    ]),
  ]));

  saveEntry(curWeek, '2026-06-09', makeEntry([
    session('9:30 AM', '5:00 PM', [
      'Implemented retry logic for failed Shopify API calls',
      'Wrote unit tests for crawl state machine',
      'Fixed rate limiting bug in niche search loop',
      'Updated Loom intake endpoint documentation',
    ]),
  ]));

  saveEntry(curWeek, '2026-06-10', makeEntry([
    session('9:00 AM', '1:00 PM', [
      'Investigated Shopify detection false positives',
      'Reviewed data pipeline architecture with lead',
      'Fixed known_domains dedup logic',
    ]),
  ]));

  saveWeekNote(curWeek, 'Good week. Crawler is stable. Need to push the Loom review batch before Friday.');

  // --- Last week: week-2026-05-30 ---
  const w1 = 'week-2026-05-30';

  saveEntry(w1, '2026-06-01', makeEntry([
    session('9:00 AM', '5:00 PM', [
      'Refactored batch sourcer to use checkpoint system',
      'Added persistent crawl state tracking',
      'Synced with Bestomer team on training data priorities',
    ]),
  ]));

  saveEntry(w1, '2026-06-02', makeEntry([
    session('9:30 AM', '5:30 PM', [
      'Built Loom external intake integration',
      'Tested end-to-end brand submission flow',
      'Debugged Tailscale connection drop during long runs',
      'Added structured logging to crawler output',
    ]),
  ]));

  saveEntry(w1, '2026-06-03', makeEntry([
    session('10:00 AM', '5:00 PM', [
      'Ran first full 200-niche batch on GPU server',
      'Monitored crawl session for stability',
      'Wrote post-run summary for review',
    ]),
  ]));

  saveEntry(w1, '2026-06-04', makeEntry([
    session('9:00 AM', '4:30 PM', [
      'Addressed code review feedback on batch sourcer',
      'Fixed edge case in Shopify signal detection',
      'Cleaned up Flask routes for review pipeline',
    ]),
  ]));

  saveEntry(w1, '2026-06-05', makeEntry([
    session('9:00 AM', '1:00 PM', [
      'Closed out week — final testing of Loom pipeline',
      'Submitted timecard and run summary',
    ]),
  ]));

  markWeekSubmitted(w1);
  saveWeekNote(w1, 'First full batch run. 200 niches, 94% uptime. Loom pipeline working end to end.');

  // --- 2 weeks ago: week-2026-05-23 ---
  const w2 = 'week-2026-05-23';

  saveEntry(w2, '2026-05-25', makeEntry([
    session('9:00 AM', '5:00 PM', [
      'Set up Tailscale VPN access to GPU server',
      'Deployed Flask app to botbox',
      'Initial crawl test across 10 niches',
    ]),
  ]));

  saveEntry(w2, '2026-05-26', makeEntry([
    session('9:30 AM', '5:00 PM', [
      'Built niche sourcing pipeline skeleton',
      'Integrated Shopify detection logic',
      'Wrote config management for API keys',
    ]),
  ]));

  saveEntry(w2, '2026-05-27', makeEntry([
    session('9:00 AM', '4:00 PM', [
      'Added crawl history persistence to SQLite',
      'Designed domain deduplication system',
      'Met with mentor to align on scope',
    ]),
  ]));

  saveEntry(w2, '2026-05-28', makeEntry([
    session('9:30 AM', '5:30 PM', [
      'Implemented resume-from-checkpoint on crash',
      'Stress tested batch runner with 50 niches',
      'Fixed memory leak in domain buffer',
    ]),
  ]));

  saveEntry(w2, '2026-05-29', makeEntry([
    session('9:00 AM', '12:00 PM', [
      'Week wrap-up, code cleanup, submitted timecard',
    ]),
  ]));

  markWeekSubmitted(w2);

  // --- 3 weeks ago: week-2026-05-16 ---
  const w3 = 'week-2026-05-16';

  saveEntry(w3, '2026-05-18', makeEntry([
    session('9:00 AM', '5:00 PM', [
      'Onboarding week — codebase orientation',
      'Set up local dev environment',
      'Reviewed existing scraper architecture',
    ]),
  ]));

  saveEntry(w3, '2026-05-19', makeEntry([
    session('9:00 AM', '5:00 PM', [
      'Studied Loom API documentation',
      'Drafted initial crawler design spec',
      'Synced with internship lead on deliverables',
    ]),
  ]));

  saveEntry(w3, '2026-05-20', makeEntry([
    session('9:00 AM', '4:30 PM', [
      'First commit — basic Flask scaffold',
      'Prototyped Shopify domain signal detection',
      'Got access to training data repo',
    ]),
  ]));

  saveEntry(w3, '2026-05-21', makeEntry([
    session('9:30 AM', '5:30 PM', [
      'Built crawler core module skeleton',
      'Implemented basic niche keyword loader',
      'Paired with senior engineer on architecture review',
    ]),
  ]));

  saveEntry(w3, '2026-05-22', makeEntry([
    session('9:00 AM', '1:00 PM', [
      'First working prototype — single niche run end to end',
      'Submitted timecard, week 1 done',
    ]),
  ]));

  markWeekSubmitted(w3);
  saveWeekNote(w3, 'First week at Bestomer. Steep ramp but making progress.');

  // --- 4 weeks ago: week-2026-05-09 ---
  const w4 = 'week-2026-05-09';

  saveEntry(w4, '2026-05-11', makeEntry([
    session('10:00 AM', '4:00 PM', [
      'Pre-internship: portfolio updates',
      'Researched Shopify detection patterns',
    ]),
  ]));

  saveEntry(w4, '2026-05-12', makeEntry([
    session('10:00 AM', '3:00 PM', [
      'Pre-internship: reviewed Flask patterns',
      'Set up Python dev environment',
    ]),
  ]));

  markWeekSubmitted(w4);

  alert('Demo data loaded. Reload the page to see it.');
}
