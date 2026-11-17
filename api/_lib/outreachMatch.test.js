import { describe, expect, it } from 'vitest';
import { normalizeHcc, normalizeIcd, normalizeDate, matchActions } from './outreachMatch.js';

describe('normalizers', () => {
  it('normalizes HCC, ICD and dates', () => {
    expect(normalizeHcc('hcc18')).toBe('HCC 18');
    expect(normalizeHcc('HCC 018')).toBe('HCC 18');
    expect(normalizeIcd('e119')).toBe('E11.9');
    expect(normalizeIcd('E11.9')).toBe('E11.9');
    expect(normalizeDate('8/26/2026')).toBe('08/26/2026');
    expect(normalizeDate('2026-08-26')).toBe('08/26/2026');
    expect(normalizeDate('08/26/26')).toBe('08/26/2026');
    expect(normalizeDate('next week')).toBe('');
  });
});

describe('matchActions', () => {
  const records = { hccs: ['HCC 18'], icds: ['E11.9'], dos: ['08/26/2026'] };

  it('marks references the patient has as matched and others not', () => {
    const out = matchActions([
      { text: 'Send the 08/26 visit note for HCC 18', refs: [{ type: 'HCC', id: '18' }, { type: 'DOS', id: '2026-08-26' }] },
      { text: 'Check HCC 85', refs: [{ type: 'HCC', id: 'HCC 85' }] },
    ], records);
    expect(out[0].refs).toEqual([
      { type: 'HCC', id: 'HCC 18', matched: true },
      { type: 'DOS', id: '08/26/2026', matched: true },
    ]);
    expect(out[1].refs).toEqual([{ type: 'HCC', id: 'HCC 85', matched: false }]);
  });

  it('drops DOS references without DOS context, and junk', () => {
    const out = matchActions([
      { text: 'x', refs: [{ type: 'DOS', id: '08/26/2026' }, { type: 'NPI', id: '1' }, { type: 'ICD', id: '' }] },
      { text: '   ', refs: [] },
    ], records, { allowDos: false });
    expect(out).toEqual([{ text: 'x', refs: [] }]);
  });
});
