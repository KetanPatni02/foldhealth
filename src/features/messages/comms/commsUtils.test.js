import { describe, it, expect } from 'vitest';
import { toE164, formatPhone, isMissedCall, callLook, initialsOf, isDialable } from './commsUtils';

describe('commsUtils', () => {
  it('normalises US numbers to E.164', () => {
    expect(toE164('(584) 555-0142')).toBe('+15845550142');
    expect(toE164('+44 20 7946 0958')).toBe('+442079460958');
    expect(toE164('')).toBe('');
    expect(toE164('1 584 555 0142')).toBe('+15845550142');
  });

  it('dials with the picked country code', () => {
    expect(toE164('020 7946 0958', '44')).toBe('+442079460958');
    expect(toE164('98765 43210', '91')).toBe('+919876543210');
    expect(isDialable('584555014', '1')).toBe(false);
    expect(isDialable('5845550142', '1')).toBe(true);
    expect(isDialable('20 7946 0958', '44')).toBe(true);
  });

  it('formats numbers for display', () => {
    expect(formatPhone('+15845550142')).toBe('+1 (584) 555-0142');
    expect(formatPhone('5845550142')).toBe('(584) 555-0142');
  });

  it('flags unanswered calls only on Calls threads', () => {
    expect(isMissedCall({ channel: 'call', last_preview: 'Missed Call' })).toBe(true);
    expect(isMissedCall({ channel: 'call', last_preview: 'Outgoing Call' })).toBe(false);
    expect(isMissedCall({ channel: 'sms', last_preview: 'Missed Call' })).toBe(false);
  });

  it('labels calls by outcome and direction', () => {
    expect(callLook({ direction: 'out', meta: { outcome: 'completed' } }).label).toBe('Outgoing Call');
    expect(callLook({ direction: 'in', meta: { outcome: 'missed' } }).tone).toBe('error');
  });

  it('takes initials from words, skipping symbols', () => {
    expect(initialsOf('Juanita Douglas Jr.')).toBe('JD');
    expect(initialsOf('+1 (584) 555-0142')).toBe('#');
  });
});
