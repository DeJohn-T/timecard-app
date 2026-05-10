import { formatDayLabel } from './dates.js';

export async function generateEmail({ entries, weekDates, settings }) {
  const { myName, apiKey } = settings;

  const entryLines = weekDates
    .map((date) => {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const entry = entries[key];
      const bullets = entry?.bullets || (entry?.notes ? [entry.notes] : []);
      if (!entry || (bullets.length === 0 && !entry.hours && !entry.startTime)) return null;
      return {
        label: formatDayLabel(date),
        bullets,
        startTime: entry.startTime || '',
        endTime: entry.endTime || '',
        hours: entry.hours || '',
      };
    })
    .filter(Boolean);

  if (entryLines.length === 0) throw new Error('No entries to format.');

  const rawData = entryLines
    .map((e) => {
      const lines = [`Day: ${e.label}`];
      if (e.startTime && e.endTime) lines.push(`Time: ${e.startTime} - ${e.endTime}`);
      else if (e.hours) lines.push(`Hours: ${e.hours}`);
      if (e.bullets.length > 0) lines.push(`Work done:\n${e.bullets.map((b) => `- ${b}`).join('\n')}`);
      return lines.join('\n');
    })
    .join('\n\n');

  const systemPrompt = `You are a timecard email formatter. Format raw work notes into a professional weekly hours email.

Rules:
- Use ONLY hyphens (-), never em dashes (—)
- Day format: "Monday (4/20) - X.X hours"
- Time format: "11:00 AM - 8:00 PM CT" on its own line after the day header (if times given)
- Bullet points use "- " prefix
- Calculate hours from start/end times if given (e.g., 11 AM to 8 PM = 9.0 hours). If only hours number given, use it directly.
- Format hours to one decimal (e.g., 8.0, 10.5, 9.33)
- Omit days with no work
- Keep bullet content concise but specific
- Total hours at end

Email structure (follow EXACTLY):
Hi All,

Hope your day is well. Here is my work log for this week:

[each day worked, in chronological order]
[DayName (M/D) - X.X hours]
[HH:MM AM - HH:MM PM CT]  <-- only if times were provided
- [bullet 1]
- [bullet 2 if applicable]

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
      model: 'claude-sonnet-4-20250514',
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
