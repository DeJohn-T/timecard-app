import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const store = {};
vi.stubGlobal('localStorage', {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i) => Object.keys(store)[i] ?? null,
});

// Mock crypto.randomUUID
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });

import { migrateEntry, computeStreak } from '../storage.js';

beforeEach(() => { Object.keys(store).forEach(k => delete store[k]); });

describe('migrateEntry', () => {
  it('returns null unchanged', () => {
    expect(migrateEntry(null)).toBe(null);
  });

  it('passes through new-format entries unchanged', () => {
    const entry = { sessions: [{ id: '1', startTime: '9:00 AM', endTime: '5:00 PM', bullets: [] }], hours: '' };
    expect(migrateEntry(entry)).toBe(entry);
  });

  it('wraps old-format entry into sessions array', () => {
    const old = { bullets: ['did stuff'], startTime: '9:00 AM', endTime: '5:00 PM', hours: '' };
    const result = migrateEntry(old);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].startTime).toBe('9:00 AM');
    expect(result.sessions[0].endTime).toBe('5:00 PM');
    expect(result.sessions[0].bullets).toEqual(['did stuff']);
  });

  it('converts legacy notes string to bullets array', () => {
    const old = { notes: 'did some work', startTime: '', endTime: '', hours: '4' };
    const result = migrateEntry(old);
    expect(result.sessions[0].bullets).toEqual(['did some work']);
    expect(result.hours).toBe('4');
  });

  it('handles entry with no bullets and no notes', () => {
    const old = { startTime: '9:00 AM', endTime: '5:00 PM', hours: '' };
    const result = migrateEntry(old);
    expect(result.sessions[0].bullets).toEqual([]);
    expect(result.sessions[0].startTime).toBe('9:00 AM');
  });
});

describe('computeStreak', () => {
  const week = (hasBullets) => ({
    weekKey: 'week-2026-05-17',
    entries: {
      '2026-05-17': {
        sessions: hasBullets
          ? [{ id: '1', startTime: '', endTime: '', bullets: ['work'] }]
          : [],
        hours: '',
      },
    },
  });

  it('returns 0 for empty array', () => {
    expect(computeStreak([])).toBe(0);
  });

  it('returns 0 when first week has no entries', () => {
    expect(computeStreak([week(false)])).toBe(0);
  });

  it('counts 1 for single week with entries', () => {
    expect(computeStreak([week(true)])).toBe(1);
  });

  it('stops at first week with no entries', () => {
    const weeks = [
      { weekKey: 'w1', entries: { d1: { sessions: [{ id:'1', startTime:'9am', endTime:'5pm', bullets:[] }], hours: '' } } },
      { weekKey: 'w2', entries: { d2: { sessions: [], hours: '' } } },
      { weekKey: 'w3', entries: { d3: { sessions: [{ id:'3', startTime:'', endTime:'', bullets:['x'] }], hours: '' } } },
    ];
    expect(computeStreak(weeks)).toBe(1);
  });

  it('counts consecutive weeks correctly', () => {
    const weeks = [
      { weekKey: 'w1', entries: { d1: { sessions: [{ id:'1', startTime:'9am', endTime:'5pm', bullets:[] }], hours: '' } } },
      { weekKey: 'w2', entries: { d2: { sessions: [{ id:'2', startTime:'', endTime:'', bullets:['x'] }], hours: '' } } },
    ];
    expect(computeStreak(weeks)).toBe(2);
  });

  it('counts hours-only entry as valid', () => {
    const weeks = [
      { weekKey: 'w1', entries: { d1: { sessions: [], hours: '5' } } },
    ];
    expect(computeStreak(weeks)).toBe(1);
  });
});

import { getCurrentPayPeriod } from '../payStorage.js';

describe('getCurrentPayPeriod', () => {
  it('returns first half for day <= 15', () => {
    const period = getCurrentPayPeriod(new Date(2026, 4, 10));
    expect(period.start.getDate()).toBe(1);
    expect(period.end.getDate()).toBe(15);
    expect(period.payDate.getDate()).toBe(15);
  });

  it('returns second half for day > 15', () => {
    const period = getCurrentPayPeriod(new Date(2026, 4, 22));
    expect(period.start.getDate()).toBe(16);
    expect(period.end.getDate()).toBe(30);
    expect(period.payDate.getDate()).toBe(30);
  });
});
