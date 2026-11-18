import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROGRAM_CONFIG, deadlineAlerts, earlyRefillWindow, ivrCreatesTask, ivrLine, lastWorker,
  longerFillLabel, longerFillTarget, programConfig, refillReminder,
} from './programAutomation';
import { PHARMACY_WORKLIST_MEMBERS } from './data/mock';

const open = { gap: 'Open', label: 'In Progress' };

describe('program settings', () => {
  it('fills what an org has not saved from the defaults', () => {
    const cfg = programConfig({ alertDays: 14, fluSeason: { start: '11/01' } });
    expect(cfg).toMatchObject({ alertDays: 14, reminderDays: 10, fluSeason: { start: '11/01', end: '03/31' } });
    expect(programConfig(null)).toEqual(DEFAULT_PROGRAM_CONFIG);
  });
});

describe('refill reminder', () => {
  it('is sent the configured days before the next fill, or scheduled', () => {
    const r = refillReminder({ nextFillDue: '11/25/2026', status: open }, DEFAULT_PROGRAM_CONFIG, '11/18/2026');
    expect(r).toMatchObject({ on: '11/15/2026', sent: true });
    expect(r.label).toBe('Sent 11/15/2026 (10 days before 11/25/2026)');
    expect(refillReminder({ nextFillDue: '12/31/2026', status: open }, { ...DEFAULT_PROGRAM_CONFIG, reminderDays: 7 }, '11/18/2026').label).toMatch(/^Scheduled 12\/24\/2026/);
  });
});

describe('IVR pickup check', () => {
  it('only a missed pickup makes a task', () => {
    expect(ivrCreatesTask('Not picked up')).toBe(true);
    expect(ivrCreatesTask('No answer')).toBe(false);
    expect(ivrLine({ date: '11/12/2026', result: 'Not picked up' })).toBe('11/12/2026: Not picked up · follow-up task created');
  });

  it('is on the samples', () => {
    const robert = PHARMACY_WORKLIST_MEMBERS.find(m => m.id === '19402');
    expect(robert.measures.find(x => x.code === 'MAH').ivrCheck.result).toBe('Not picked up');
  });
});

describe('early refill window', () => {
  const holidays = [{ name: 'Thanksgiving', date: '2026-11-26' }];
  it('flags a fill due within the window before a holiday', () => {
    expect(earlyRefillWindow('11/22/2026', holidays, DEFAULT_PROGRAM_CONFIG, '11/18/2026')).toEqual({ kind: 'holiday', label: 'Thanksgiving on 11/26: refill before' });
    expect(earlyRefillWindow('11/10/2026', holidays, DEFAULT_PROGRAM_CONFIG, '11/01/2026')).toBeNull();
    // Already overdue: too late to push earlier.
    expect(earlyRefillWindow('11/22/2026', holidays, DEFAULT_PROGRAM_CONFIG, '11/23/2026')).toBeNull();
    expect(earlyRefillWindow('11/27/2026', holidays, DEFAULT_PROGRAM_CONFIG, '11/18/2026')).toBeNull();
  });

  it('reads holiday configurations by their start', () => {
    expect(earlyRefillWindow('11/24/2026', [{ name: 'Thanksgiving', startAt: new Date(2026, 10, 26, 0, 0).toISOString() }], DEFAULT_PROGRAM_CONFIG, '11/18/2026')?.kind).toBe('holiday');
  });

  it('flags flu season only when it is on, across the new year', () => {
    const on = { ...DEFAULT_PROGRAM_CONFIG, fluSeasonOn: true };
    expect(earlyRefillWindow('01/15/2027', [], DEFAULT_PROGRAM_CONFIG, '11/18/2026')).toBeNull();
    expect(earlyRefillWindow('01/15/2027', [], on, '11/18/2026')).toMatchObject({ kind: 'flu' });
    expect(earlyRefillWindow('06/15/2027', [], on, '11/18/2026')).toBeNull();
  });
});

describe('longer fill', () => {
  it('moves 30 or 60 days to 90, and 90 to 180', () => {
    expect([30, 60, 90, 180].map(longerFillTarget)).toEqual([90, 90, 180, null]);
    expect(longerFillLabel({ days: 90, status: 'Requested' })).toBe('90-day requested');
    expect(longerFillLabel({ days: 180, status: 'Approved' })).toBe('180-day approved');
  });
});

describe('deadline alerts', () => {
  const gap = (code, days, extra = {}) => ({ code, status: open, savability: 'Savable', allowableGapDays: days, failDate: '12/01/2026', ...extra });
  const members = [
    { id: '1', name: 'Ana', priority: 'P1', assigneeName: 'Priya', callHistory: [{ by: 'Marcus' }], gaps: [gap('MAD', 4), gap('MAH', 20)], alertOutcomes: { 'MAD|alert': { outcome: 'Accepted', by: 'Marcus' } } },
    { id: '2', name: 'Ben', priority: 'P2', gaps: [gap('MAC', 3)] },
    { id: '3', name: 'Cy', priority: 'P1', assigneeName: 'Priya', gaps: [gap('MAC', 8), gap('MAD', 2, { savability: 'Not Savable' })] },
  ];

  it('alerts the last worker and escalates the closest to the manager, P1 only', () => {
    const alerts = deadlineAlerts(members, { ...DEFAULT_PROGRAM_CONFIG, managerName: 'Dana' });
    expect(alerts.map(a => [a.member, a.code, a.kind, a.to])).toEqual([
      ['Ana', 'MAD', 'alert', 'Marcus'],
      ['Ana', 'MAD', 'escalation', 'Dana'],
      ['Cy', 'MAC', 'alert', 'Priya'],
    ]);
    expect(alerts[0]).toMatchObject({ outcome: 'Accepted', outcomeBy: 'Marcus' });
    expect(alerts[1].outcome).toBe('Pending');
  });

  it('takes every priority when high priority only is off', () => {
    expect(deadlineAlerts(members, { ...DEFAULT_PROGRAM_CONFIG, highPriorityOnly: false }).some(a => a.member === 'Ben')).toBe(true);
  });

  it('names the last person who worked the member, else the assignee', () => {
    expect(lastWorker(members[0])).toBe('Marcus');
    expect(lastWorker(members[2])).toBe('Priya');
  });
});
