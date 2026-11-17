import { describe, it, expect } from 'vitest';
import { callTargets, demoPhone } from './callTargets';

const members = [
  { id: 1, memberId: '11', name: 'Bea Lane', rp: 'Dr. Park' },
  { id: 2, memberId: '11', name: 'Bea Lane', rp: 'Dr. Park' },
  { id: 3, memberId: '12', name: 'Al Moss', rp: 'Dr. Okafor' },
];

describe('callTargets', () => {
  it('lists each member once, A to Z, with their record', () => {
    const t = callTargets('member', members);
    expect(t.map(x => x.name)).toEqual(['Al Moss', 'Bea Lane']);
    expect(t[1].member.id).toBe(1);
  });

  it('lists each PCP once', () => {
    expect(callTargets('pcp', members).map(x => x.pcp)).toEqual(['Dr. Okafor', 'Dr. Park']);
  });

  it('lists staff with their role', () => {
    expect(callTargets('user', [], [{ id: 'EJ', name: 'E. Johnson', roleLabel: 'Support' }])[0].name).toBe('E. Johnson (Support)');
  });

  it('gives a stable number per person', () => {
    expect(demoPhone('11')).toBe(demoPhone('11'));
    expect(demoPhone('11')).toMatch(/^\(702\) 555-\d{4}$/);
  });
});
