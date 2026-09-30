import { describe, expect, it } from 'vitest';
import { fromPickerValue, toPickerValue, activeOooFor, canDelete, canEdit, daySpan, formatDateTime, oooStatus, rangeChange, recordsOnDate, sortRecords, validateOoo } from './oooUtils';

const at = (d, h = 0, m = 0) => new Date(2026, 8, d, h, m).toISOString(); // Sept 2026, local time
const rec = (id, s, e, userName = 'Richard Willson') => ({ id, userName, startAt: s, endAt: e });
const now = new Date(2026, 8, 10, 12, 0);

describe('oooStatus', () => {
  it('is Upcoming, Ongoing or Past relative to now', () => {
    expect(oooStatus(rec('a', at(11), at(12)), now)).toBe('Upcoming');
    expect(oooStatus(rec('b', at(10), at(11)), now)).toBe('Ongoing');
    expect(oooStatus(rec('c', at(5), at(6)), now)).toBe('Past');
  });
  it('lets ongoing records be edited but only upcoming ones deleted', () => {
    const ongoing = rec('b', at(10), at(11));
    expect(canEdit(ongoing, now)).toBe(true);
    expect(canDelete(ongoing, now)).toBe(false);
    expect(canEdit(rec('c', at(5), at(6)), now)).toBe(false);
  });
});

describe('activeOooFor', () => {
  it('finds the ongoing record by name, ignoring case', () => {
    const list = [rec('x', at(11), at(12)), rec('y', at(9), at(11))];
    expect(activeOooFor(list, 'richard willson', now)?.id).toBe('y');
    expect(activeOooFor(list, 'Someone Else', now)).toBeNull();
  });
});

describe('recordsOnDate and daySpan', () => {
  const r = rec('a', at(8, 18), at(10, 6));
  it('matches every day the record touches', () => {
    expect(recordsOnDate([r], '2026-09-08')).toHaveLength(1);
    expect(recordsOnDate([r], '2026-09-10')).toHaveLength(1);
    expect(recordsOnDate([r], '2026-09-11')).toHaveLength(0);
  });
  it('gives the part of each day that is out of office', () => {
    expect(daySpan(r, '2026-09-08')).toEqual({ start: 0.75, end: 1 });
    expect(daySpan(r, '2026-09-09')).toEqual({ start: 0, end: 1 });
    expect(daySpan(r, '2026-09-10')).toEqual({ start: 0, end: 0.25 });
  });
});

describe('rangeChange', () => {
  const original = rec('a', at(11), at(20));
  it('flags removed dates as reduced and new dates as extended', () => {
    expect(rangeChange(original, { startAt: at(11), endAt: at(18) })).toEqual({ reduced: true, extended: false });
    expect(rangeChange(original, { startAt: at(11), endAt: at(24) })).toEqual({ reduced: false, extended: true });
    expect(rangeChange(original, { startAt: at(13), endAt: at(24) })).toEqual({ reduced: true, extended: true });
    expect(rangeChange(original, { startAt: at(11), endAt: at(20) })).toEqual({ reduced: false, extended: false });
  });
});

describe('validateOoo', () => {
  it('rejects dates that overlap the same provider\'s other records', () => {
    const existing = [rec('x', at(12), at(15)), rec('y', at(12), at(15), 'Someone Else')];
    const base = { userName: 'Richard Willson' };
    expect(validateOoo({ ...base, startAt: at(14), endAt: at(16) }, { now, existing }).startAt).toMatch(/Overlaps/);
    // Touching end to start is fine, as is another provider's time or the record itself.
    expect(validateOoo({ ...base, startAt: at(15), endAt: at(16) }, { now, existing })).toEqual({});
    expect(validateOoo({ userName: 'Someone Else 2', startAt: at(13), endAt: at(14) }, { now, existing })).toEqual({});
    expect(validateOoo({ ...base, startAt: at(12), endAt: at(16) }, { now, existing, original: existing[0] })).toEqual({});
  });
  it('allows today, not earlier days, and needs the end after the start', () => {
    expect(validateOoo({ startAt: at(10, 8), endAt: at(12) }, { now })).toEqual({});
    expect(validateOoo({ startAt: at(9, 8), endAt: at(12) }, { now }).startAt).toBeTruthy();
    expect(validateOoo({ startAt: at(12), endAt: at(11) }, { now }).endAt).toBeTruthy();
  });
  it('keeps an ongoing record\'s past start valid when editing', () => {
    const original = rec('b', at(8), at(12));
    expect(validateOoo({ startAt: original.startAt, endAt: at(14) }, { now, original })).toEqual({});
  });
  it('needs a message when auto reply is on', () => {
    expect(validateOoo({ startAt: at(11), endAt: at(12), autoReply: true, autoReplyMessage: ' ' }, { now }).autoReplyMessage).toBeTruthy();
  });
});

describe('sortRecords and formatDateTime', () => {
  it('orders ongoing, upcoming (soonest first), then past (latest first)', () => {
    const list = [rec('past1', at(1), at(2)), rec('up2', at(20), at(21)), rec('on', at(9), at(11)), rec('up1', at(12), at(13)), rec('past2', at(5), at(6))];
    expect(sortRecords(list, now).map(r => r.id)).toEqual(['on', 'up1', 'up2', 'past2', 'past1']);
  });
  it('formats like the Figma', () => {
    expect(formatDateTime(at(11, 2))).toBe('09/11/2026, 02:00AM');
    expect(formatDateTime(at(18, 23, 30))).toBe('09/18/2026, 11:30PM');
  });
});

describe('picker values', () => {
  it('leaves an unset date empty so the placeholder shows', () => {
    expect(toPickerValue(null)).toBe('');
    expect(toPickerValue(undefined)).toBe('');
  });
  it('round-trips through the DateTimePicker format', () => {
    expect(toPickerValue(at(11, 14, 5))).toBe('09/11/2026, 14:05');
    expect(fromPickerValue('09/11/2026, 14:05')).toBe(at(11, 14, 5));
    expect(fromPickerValue('')).toBeNull();
  });
});
