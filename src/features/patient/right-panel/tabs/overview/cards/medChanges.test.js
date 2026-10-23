import { describe, expect, it } from 'vitest';
import { medChangesSince, programContext } from './medChanges';

const programs = [
  { code: 'CCM', trigger: 1, status: 'New', startDate: '07/28/2026' },
  { code: 'DM', trigger: 1, status: 'Engaged', startDate: '07/31/2026' },
  { code: 'TOC IP', trigger: 1, status: 'Closed', startDate: '01/02/2026' },
];

describe('programContext', () => {
  it('uses the last-used program, else the earliest open one', () => {
    expect(programContext(programs, 'dm').code).toBe('DM');
    expect(programContext(programs, null).code).toBe('CCM');
    expect(programContext([{ code: 'X', status: 'New', startDate: '—' }], null)).toBeNull();
  });
});

describe('medChangesSince', () => {
  const meds = [
    { name: 'Old', start: '2025-11-04', stop: '' },
    { name: 'Losartan', start: '09/18/2026', stop: '2026-09-22', stopReason: 'Adverse Reaction' },
    { name: 'Nicotine', start: '2026-09-01', stop: '' },
  ];

  it('lists starts and stops on or after the date, newest first', () => {
    const changes = medChangesSince(meds, '07/28/2026');
    expect(changes.map(c => `${c.kind} ${c.med.name}`)).toEqual(['Stopped Losartan', 'Added Losartan', 'Added Nicotine']);
    expect(changes[0].reason).toBe('Adverse Reaction');
  });

  it('is empty without a usable start date', () => {
    expect(medChangesSince(meds, '—')).toEqual([]);
  });
});
