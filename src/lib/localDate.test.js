import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { localDateMs, parseLocalDate } from './localDate';

// West of UTC is where `new Date('YYYY-MM-DD')` shows the previous day.
// Node re-reads TZ on assignment, so this pins the zone for these tests.
let prevTz;
beforeAll(() => { prevTz = globalThis.process.env.TZ; globalThis.process.env.TZ = 'America/New_York'; });
afterAll(() => {
  if (prevTz === undefined) delete globalThis.process.env.TZ;
  else globalThis.process.env.TZ = prevTz;
});

describe('parseLocalDate', () => {
  it('reads a bare YYYY-MM-DD as that calendar day, not the day before', () => {
    expect(new Date('2026-10-11').getDate()).toBe(10);
    const d = parseLocalDate('2026-10-11');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 11, 0]);
  });

  it('leaves real timestamps and other formats to the Date constructor', () => {
    expect(parseLocalDate('2026-10-11T15:30:00Z').getTime()).toBe(Date.UTC(2026, 9, 11, 15, 30));
    expect(parseLocalDate('10/11/2026').getDate()).toBe(11);
    const src = new Date(2026, 0, 2);
    expect(parseLocalDate(src).getTime()).toBe(src.getTime());
  });

  it('returns null for empty or unparseable input', () => {
    expect(parseLocalDate(null)).toBeNull();
    expect(parseLocalDate(undefined)).toBeNull();
    expect(parseLocalDate('')).toBeNull();
    expect(parseLocalDate('—')).toBeNull();
    expect(localDateMs('nope')).toBeNaN();
  });
});
