import { describe, expect, it } from 'vitest';
import { channelOf, escalationSaves, lateness, savedGaps, savedOn, starContribution, starsFor } from './pharmacyImpact';
import { reportMembers } from './pharmacyReports';
import { PHARMACY_WORKLIST_MEMBERS } from './data/mock';

const status = (gap) => ({ gap, label: gap });
const gap = (code, s, extra = {}) => ({ code, status: status(s), medications: [], pdc: 85, ...extra });
const member = (extra) => ({ id: 'm1', name: 'Ana', callHistory: [], gaps: [], ...extra });

describe('saved gaps', () => {
  it('counts a saved gap with a Fold touch on or before the save, by its channel', () => {
    const m = member({
      callHistory: [
        { date: '10/20/2026', result: 'success', type: 'SMS', by: 'Priya', measures: ['MAD'] },
        { date: '10/01/2026', result: 'success', type: 'Call', by: 'Marcus', measures: ['MAD'] },
        { date: '10/05/2026', result: 'failed', type: 'Call', measures: ['MAH'] },
      ],
      gaps: [
        gap('MAD', 'Met for Year', { pickupConfirmed: '10/10/2026' }),
        gap('MAH', 'Closed', { pickupConfirmed: '10/12/2026' }),
        gap('MAC', 'In Progress'),
      ],
    });
    expect(savedGaps([m])).toEqual([
      expect.objectContaining({ code: 'MAD', savedOn: '10/10/2026', channel: 'Call', touchDate: '10/01/2026', by: 'Marcus' }),
    ]);
  });

  it('dates a save by the confirmed pickup, else the newest fill', () => {
    expect(savedOn({ medications: [{ recentFill: '09/01/2026', lastFill: '08/01/2026' }, { lastFill: '09/15/2026' }] })).toBe('09/15/2026');
  });

  it('names the channel of a touch', () => {
    expect(channelOf({ kind: 'pharmacy-verification' })).toBe('Assessment call');
    expect(channelOf({ type: 'SMS' })).toBe('SMS');
    expect(channelOf({ type: 'Letter' })).toBe('Letter or email');
    expect(channelOf({})).toBe('Call');
  });
});

describe('saved after an alert', () => {
  it('lists accepted or approved alerts with how late they came and whether the gap is saved', () => {
    const m = member({
      gaps: [gap('MAD', 'Met for Year'), gap('MAH', 'In Progress')],
      alertOutcomes: {
        'MAD|escalation': { outcome: 'Approved', by: 'Dana', daysLeft: 3 },
        'MAH|alert': { outcome: 'Accepted', by: 'Priya', daysLeft: -20 },
        'MAC|alert': { outcome: 'Ignored' },
      },
    });
    expect(escalationSaves([m])).toEqual([
      expect.objectContaining({ code: 'MAD', kind: 'escalation', when: '5 days left or less', saved: true }),
      expect.objectContaining({ code: 'MAH', kind: 'alert', when: '20 days overdue', saved: false }),
    ]);
    expect(lateness(12)).toBe('6 to 15 days left');
    expect(lateness(null)).toBe('Not recorded');
  });
});

describe('star contribution', () => {
  it('compares the rate with and without the gaps Fold saved', () => {
    const members = [member({ gaps: [gap('MAD', 'Met for Year'), gap('MAD', 'Met for Year', { pdc: 70 }), gap('MAD', 'In Progress', { pdc: 70 }), gap('MAD', 'Excluded')] })];
    const [mad] = starContribution(members, [{ code: 'MAD' }]);
    expect(mad).toMatchObject({ gaps: 3, adherent: 2, foldSaved: 1, rate: 66.7, without: 33.3, lift: 33.4 });
  });

  it('reads stars from the cut points', () => {
    expect(starsFor('MAD', 88)).toBe(4);
    expect(starsFor('MAD', 79)).toBe(2);
    expect(starsFor('MAD', null)).toBeNull();
  });

  it('runs on the sample members', () => {
    const enriched = reportMembers(PHARMACY_WORKLIST_MEMBERS);
    const rows = starContribution(enriched);
    expect(rows.map(r => r.code)).toEqual(['MAC', 'MAD', 'MAH']);
    expect(rows.every(r => r.rate >= r.without)).toBe(true);
  });
});
