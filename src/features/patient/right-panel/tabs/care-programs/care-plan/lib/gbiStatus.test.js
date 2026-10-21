import { describe, expect, it } from 'vitest';
import {
  BARRIER_STATUSES, GBI_STATUSES, GBI_STATUS_META, gbiCompletion, gbiStatusesFor,
  isClosedStatus, isExcludedStatus, isFailedStatus,
} from './gbiStatus';
import { isCompletedStatus, isPastDue } from '../tables/carePlanTableModel';
import { computeGoalProgress } from './goalMetrics';
import { instanceOutcome } from './templateRenewal';

const items = (...statuses) => statuses.map((status, i) => ({ id: `x${i}`, status }));

describe('GBI status vocabulary', () => {
  it('offers Resolved on barriers only', () => {
    expect(GBI_STATUSES).not.toContain('Resolved');
    expect(BARRIER_STATUSES).toContain('Resolved');
    expect(gbiStatusesFor('goal')).toBe(GBI_STATUSES);
    expect(gbiStatusesFor('intv')).toBe(GBI_STATUSES);
    expect(gbiStatusesFor('barrier')).toBe(BARRIER_STATUSES);
  });

  it('gives every pickable status an icon and a tone', () => {
    for (const s of BARRIER_STATUSES) {
      expect(GBI_STATUS_META[s].icon).toBeTruthy();
      expect(GBI_STATUS_META[s].tone).toBeTruthy();
    }
  });

  it('never paints Discontinued or Not Applicable as a failure', () => {
    expect(GBI_STATUS_META.Discontinued.tone).not.toBe('error');
    expect(GBI_STATUS_META['Not Applicable'].tone).not.toBe('error');
    expect(isFailedStatus('Discontinued')).toBe(false);
    expect(isFailedStatus('Not Applicable')).toBe(false);
    expect(isFailedStatus('Not Met')).toBe(true);
  });
});

describe('gbiCompletion', () => {
  it('leaves Discontinued and Not Applicable out of the denominator', () => {
    const r = gbiCompletion(items('Met', 'Not Met', 'Discontinued', 'Not Applicable'));
    expect(r).toEqual({ achieved: 1, failed: 1, excluded: 2, counted: 2, rate: 50 });
  });

  it('counts Resolved as achieved', () => {
    expect(gbiCompletion(items('Resolved', 'In Progress')).rate).toBe(50);
  });

  it('is 0 when nothing is judged', () => {
    expect(gbiCompletion(items('Discontinued', 'Not Applicable')).rate).toBe(0);
    expect(gbiCompletion([]).rate).toBe(0);
  });

  it('keeps On Hold open', () => {
    expect(isClosedStatus('On Hold')).toBe(false);
    expect(gbiCompletion(items('On Hold', 'Met')).counted).toBe(2);
  });
});

describe('closing rules', () => {
  it('moves achieved and excluded items off the active list, but not Not Met', () => {
    for (const s of ['Met', 'Resolved', 'Discontinued', 'Not Applicable']) expect(isCompletedStatus(s)).toBe(true);
    for (const s of ['Not Started', 'In Progress', 'On Hold', 'Not Met']) expect(isCompletedStatus(s)).toBe(false);
  });

  it('never marks a closed item overdue', () => {
    for (const s of ['Met', 'Resolved', 'Not Met', 'Discontinued', 'Not Applicable']) {
      expect(isPastDue('2020-01-01', s)).toBe(false);
    }
    expect(isPastDue('2020-01-01', 'On Hold')).toBe(true);
    expect(isExcludedStatus('On Hold')).toBe(false);
  });

  it('stops a Discontinued or Not Applicable barrier capping its goal', () => {
    const goal = { id: 'g1' };
    const iv = [{ goalId: 'g1', adherence: 100 }];
    expect(computeGoalProgress(goal, iv, [{ goalIds: ['g1'], status: 'In Progress' }])).toBe(80);
    expect(computeGoalProgress(goal, iv, [{ goalIds: ['g1'], status: 'Discontinued' }])).toBe(100);
    expect(computeGoalProgress(goal, iv, [{ goalIds: ['g1'], status: 'Not Applicable' }])).toBe(100);
  });

  it('completes a template run whose only unmet items are not judged', () => {
    const out = instanceOutcome({ goals: items('Met', 'Not Applicable'), interventions: items('Met', 'Discontinued') });
    expect(out).toEqual({ status: 'completed', done: 2, total: 2 });
    expect(instanceOutcome({ goals: items('Met', 'Not Met') }).status).toBe('closed');
  });
});
