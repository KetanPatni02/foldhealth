import { describe, expect, it } from 'vitest';
import { apptSpan, coveringProviders, findConflict, groupByDepartment, planDetail, reassignWindow, scopeAppointments, tallyPlan } from './reassignUtils';

const now = new Date(2026, 9, 1, 12, 0);
const appt = (id, date, time, extra = {}) => ({ id, primary_user: 'Abhay Chaudhary', date, time_start: time, status: 'Scheduled', location: '7 Hills Department', ...extra });

describe('reassignment scope', () => {
  const win = { from: new Date(2026, 9, 1).getTime(), to: new Date(2026, 9, 3).getTime() };
  it('keeps the provider\'s upcoming, uncancelled appointments in the window', () => {
    const list = [
      appt('a', '10-01-2026', '9:00 am'),             // already past (before noon)
      appt('b', '10-01-2026', '2:30 pm'),
      appt('c', '10-02-2026', '9:00 am', { status: 'Cancelled' }),
      appt('d', '10-02-2026', '11:00 am', { primary_user: 'Someone Else' }),
      appt('e', '10-03-2026', '9:00 am'),             // after the window
      appt('f', '10-02-2026', '11:00 am'),
    ];
    expect(scopeAppointments(list, 'abhay chaudhary', win, now).map(a => a.id)).toEqual(['b', 'f']);
  });
  it('works out the window for each type', () => {
    expect(reassignWindow({ type: 'permanent' }, now).to).toBe(Infinity);
    expect(reassignWindow({ type: 'ooo', record: { startAt: '2026-10-02T00:00:00', endAt: '2026-10-03T00:00:00' } }).from).toBe(new Date('2026-10-02T00:00:00').getTime());
    expect(reassignWindow({ type: 'other', startAt: '2026-10-03T00:00:00', endAt: '2026-10-02T00:00:00' })).toBeNull();
  });
  it('groups by department, A–Z', () => {
    const g = groupByDepartment([appt('a', '10-02-2026', '9:00 am', { location: 'Mary Health' }), appt('b', '10-02-2026', '9:00 am'), appt('c', '10-02-2026', '9:00 am', { location: '' })]);
    expect(g.map(d => d.name)).toEqual(['7 Hills Department', 'Mary Health', 'No Department']);
  });
});

describe('covering providers and conflicts', () => {
  const users = [
    { name: 'Abhay Chaudhary', locations: ['7 Hills Department'] },
    { name: 'James Will', locations: ['7 Hills Department', 'Mary Health'] },
    { name: 'Elena Smith', locations: ['7 Hills Department'] },
    { name: 'Emma Johnson', locations: ['Mary Health'] },
  ];
  const window = { from: new Date(2026, 9, 2).getTime(), to: new Date(2026, 9, 5).getTime() };
  it('lists the department\'s people, not the away provider or anyone also out', () => {
    const ooo = [{ userName: 'Elena Smith', startAt: '2026-10-04T00:00:00', endAt: '2026-10-06T00:00:00' }];
    expect(coveringProviders('7 Hills Department', users, { awayUser: 'Abhay Chaudhary', oooRecords: ooo, window }).map(u => u.name)).toEqual(['James Will']);
  });
  it('finds an overlapping appointment on the covering provider\'s calendar', () => {
    const a = appt('a', '10-02-2026', '9:00 am', { time_end: '9:30 am' });
    const theirs = [{ id: 'x', primary_user: 'James Will', date: '10-02-2026', time_start: '9:15 am', time_end: '9:45 am', status: 'Scheduled' }];
    expect(findConflict(a, 'James Will', theirs)?.id).toBe('x');
    expect(findConflict(a, 'Emma Johnson', theirs)).toBeNull();
    expect(apptSpan({ date: '10-02-2026', time_start: '9:00 am' }).end - apptSpan({ date: '10-02-2026', time_start: '9:00 am' }).start).toBe(30 * 60000);
  });
});

describe('plan tally', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  it('counts reassigning, cancelling and the rest', () => {
    const plan = { a: { action: 'reassign', to: 'James Will' }, b: { action: 'cancel' } };
    expect(tallyPlan(plan, list)).toEqual({ reassigning: 1, cancelling: 1, noAction: 1 });
    expect(planDetail(plan, list)).toBe('1 Reassigned • 1 Cancelled');
    expect(planDetail({ a: { action: 'cancel' }, b: { action: 'cancel' }, c: { action: 'cancel' } }, list)).toBe('All Cancelled');
  });
});

describe('buildJob', () => {
  it('reassigns, cancels, flags clashes and fails missing appointments', async () => {
    const { buildJob } = await import('./reassignJobs');
    const list = [
      { id: 'a', primary_user: 'Abhay', date: '10-02-2026', time_start: '9:00 am', time_end: '9:30 am', location: 'Mary Health' },
      { id: 'b', primary_user: 'Abhay', date: '10-02-2026', time_start: '11:00 am', location: 'Mary Health' },
      { id: 'c', primary_user: 'Abhay', date: '10-02-2026', time_start: '2:30 pm', location: 'Mary Health', ehr_missing: true },
      { id: 'd', primary_user: 'Abhay', date: '10-03-2026', time_start: '9:00 am', location: 'Rockwell Health' },
    ];
    const everyone = [...list, { id: 'x', primary_user: 'James Will', date: '10-02-2026', time_start: '9:00 am', time_end: '9:30 am', status: 'Scheduled' }];
    const plan = { a: { action: 'reassign', to: 'James Will' }, b: { action: 'reassign', to: 'James Will' }, c: { action: 'reassign', to: 'James Will' }, d: { action: 'cancel' } };
    const job = buildJob({ fromUser: 'Abhay', type: 'ooo', window: { from: 0, to: Infinity }, plan, appointments: list, everyone });
    expect([job.reassignedCount, job.cancelledCount, job.conflictingCount, job.failedCount]).toEqual([2, 1, 1, 1]);
    expect(job.results.find(r => r.appointmentId === 'a').conflict.appointmentId).toBe('x');
    expect(job.windowEnd).toBeNull();
  });
});
