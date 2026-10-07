import { describe, expect, it } from 'vitest';
import { formatIdleDuration, inactivitySecondsFor } from './inactivity';

describe('inactivity', () => {
  it('formats the threshold for the reminder text', () => {
    expect(formatIdleDuration(30)).toBe('30 seconds');
    expect(formatIdleDuration(60)).toBe('1 minute');
    expect(formatIdleDuration(600)).toBe('10 minutes');
  });
  it('is 30 seconds for the demo patient and 30 minutes for everyone else', () => {
    expect(inactivitySecondsFor('10042')).toBe(30);
    expect(inactivitySecondsFor(10042)).toBe(30);
    expect(inactivitySecondsFor('11089')).toBe(1800);
    expect(inactivitySecondsFor(null)).toBeNull();
  });
});
