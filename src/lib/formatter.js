import { formatDayLabel, getDateKey } from './dates.js';

export async function generateEmail({ entries, weekDates, settings }) {
  const { myName, apiKey } = settings;

  const entryLines = weekDates
    .map((date) => {
      const key = getDateKey(date);
      const entry = entries[key];
      if (!entry) return null;
      const sessions = entry.sessions || [];
      const hasContent =
        sessions.some((s) => s.bullets?.length > 0 || s.startTime) ||
        parseFloat(entry.hours) > 0;
      if (!hasContent) return null;
      return { label: formatDayLabel(date), sessions, hours: entry.hours || '' };
    })
    .filter(Boolean);

  if (entryLines.length === 0) throw new Error('No entries to format.');

  const rawData = entryLines
    .map((e) => {
      const lines = [`Day: ${e.label}`];
      e.sessions.forEach((s, i) => {
        const prefix = e.sessions.length > 1 ? `Session ${i + 1}` : 'Session';
        if (s.startTime && s.endTime) lines.push(`${prefix} time: ${s.startTime} - ${s.endTime}`);
        if (s.bullets?.length > 0) lines.push(`${prefix} work:\n${s.bullets.map((b) => `- ${b}`).join('\n')}`);
      });
      if (e.hours && !e.sessions.some((s) => s.startTime)) lines.push(`Hours: ${e.hours}`);
      return lines.join('\n');
    })
    .join('\n\n');

  const systemPrompt = `You are a timecard email formatter. Format raw work notes into a professional weekly hours email.

Rules:
- Use ONLY hyphens (-), never em dashes (—)
- Day header format: "DayName (M/D) - X.X hours"
- Time format: "HH:MM AM - HH:MM PM CT" on its own line after the day header
- If a day has multiple sessions, list each session's time range on its own line with bullets under it
- Bullet points use "- " prefix
- Calculate total hours from all session start/end times. Format to one decimal (e.g. 8.0, 10.5)
- Omit days with no work
- Total hours at end

Email structure (follow EXACTLY):
Hi All,

Please find my work log for the week below:

[each day worked, in chronological order]
[DayName (M/D) - X.X hours]
[HH:MM AM - HH:MM PM CT]
- [bullet 1]
- [bullet 2]

Total Hours: [sum]

Please let me know if you would like any additional details. Have a good weekend!

Best,
${myName || '[Name]'}`;

  const userPrompt = `Format the following work notes into the weekly timecard email:\n\n${rawData}`;

  const endpoint = import.meta.env.DEV ? '/api/anthropic/v1/messages' : '/api/anthropic';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}
