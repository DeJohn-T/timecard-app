const EXTRACTION_PROMPT = `Extract timecard data from the following timecard email. Return ONLY valid JSON with no other text, markdown, or explanation:
{
  "weekStart": "YYYY-MM-DD",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "hours": 5.0,
      "startTime": "9:00 PM",
      "endTime": "11:00 PM",
      "bullets": ["bullet 1", "bullet 2"]
    }
  ]
}

Rules:
- weekStart is the Saturday that begins the work week (format YYYY-MM-DD)
- date is each worked day (format YYYY-MM-DD)
- hours is a number (float). Calculate from start/end times if provided, otherwise use stated hours
- startTime and endTime should be in "H:MM AM/PM" format, or "" if not stated
- bullets is an array of activity descriptions for that day
- Only include days that have logged work
- If the year is not shown, assume 2026`;

async function callClaude(endpoint, apiKey, messages) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }
  const data = await response.json();
  const text = data.content[0].text.trim();
  const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(clean);
}

async function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 1200;
        const scale = img.width > MAX ? MAX / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
        resolve({ base64, mediaType: 'image/jpeg' });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function extractFromImage(file, apiKey) {
  const endpoint = import.meta.env.DEV ? '/api/anthropic/v1/messages' : '/api/anthropic';
  const { base64, mediaType } = await resizeImage(file);
  return callClaude(endpoint, apiKey, [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
      { type: 'text', text: EXTRACTION_PROMPT },
    ],
  }]);
}

export async function extractFromText(text, apiKey) {
  const endpoint = import.meta.env.DEV ? '/api/anthropic/v1/messages' : '/api/anthropic';
  return callClaude(endpoint, apiKey, [{
    role: 'user',
    content: `${EXTRACTION_PROMPT}\n\nTimecard email content:\n${text}`,
  }]);
}

export function extractedToEntries(extractedData) {
  const { weekStart, days } = extractedData;
  const weekKey = `week-${weekStart}`;
  const entries = {};
  for (const day of days) {
    entries[day.date] = {
      sessions: [{
        id: crypto.randomUUID(),
        startTime: day.startTime || '',
        endTime: day.endTime || '',
        bullets: day.bullets || [],
      }],
      hours: (!day.startTime && day.hours) ? String(day.hours) : '',
    };
  }
  return { weekKey, entries };
}
