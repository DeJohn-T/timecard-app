import { describe, it, expect } from 'vitest';

function buildRawData(entryLines) {
  return entryLines
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
}

describe('buildRawData', () => {
  it('formats a single session with times and bullets', () => {
    const lines = [{
      label: 'Monday (5/18)',
      sessions: [{ startTime: '8:00 AM', endTime: '12:00 PM', bullets: ['Loom submissions', 'Brand normalization'] }],
      hours: '',
    }];
    const result = buildRawData(lines);
    expect(result).toContain('Day: Monday (5/18)');
    expect(result).toContain('Session time: 8:00 AM - 12:00 PM');
    expect(result).toContain('- Loom submissions');
    expect(result).toContain('- Brand normalization');
  });

  it('labels sessions when multiple exist', () => {
    const lines = [{
      label: 'Tuesday (5/19)',
      sessions: [
        { startTime: '9:00 AM', endTime: '1:00 PM', bullets: ['Morning work'] },
        { startTime: '6:00 PM', endTime: '9:00 PM', bullets: ['Evening work'] },
      ],
      hours: '',
    }];
    const result = buildRawData(lines);
    expect(result).toContain('Session 1 time: 9:00 AM - 1:00 PM');
    expect(result).toContain('Session 2 time: 6:00 PM - 9:00 PM');
  });

  it('uses manual hours when no times', () => {
    const lines = [{
      label: 'Wednesday (5/20)',
      sessions: [{ startTime: '', endTime: '', bullets: ['Some work'] }],
      hours: '5',
    }];
    const result = buildRawData(lines);
    expect(result).toContain('Hours: 5');
    expect(result).not.toContain('Session time:');
  });
});
