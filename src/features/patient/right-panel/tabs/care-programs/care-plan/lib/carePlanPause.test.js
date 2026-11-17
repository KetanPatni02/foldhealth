import { describe, expect, it } from 'vitest';
import {
  isCarePlanPaused, isDueToAutoResume, nextTouchpoint, pauseAuditEntry, pauseFields,
  pauseFormProblem, pauseReasonFromLabel, pauseSummary, resumeAuditEntry,
} from './carePlanPause';

const today = new Date(2026, 9, 19); // Oct 19 2026, local
const paused = (pause) => ({ status: 'paused', pause: { reason: 'hospitalized', pausedOn: '2026-10-10', ...pause } });

describe('auto-resume', () => {
  it('is due on or after the resume date, only with auto-resume on', () => {
    expect(isDueToAutoResume(paused({ resumeOn: '2026-10-19', autoResume: true }), today)).toBe(true);
    expect(isDueToAutoResume(paused({ resumeOn: '2026-10-18', autoResume: true }), today)).toBe(true);
    expect(isDueToAutoResume(paused({ resumeOn: '2026-10-20', autoResume: true }), today)).toBe(false);
    expect(isDueToAutoResume(paused({ resumeOn: '2026-10-01', autoResume: false }), today)).toBe(false);
    expect(isDueToAutoResume({ status: 'active' }, today)).toBe(false);
  });
});

describe('pause form', () => {
  it('needs a start date, a resume date not before it, and a date for auto-resume', () => {
    expect(pauseFormProblem({ pausedOn: '' })).toMatch(/start/);
    expect(pauseFormProblem({ pausedOn: '2026-10-19', resumeOn: '2026-10-18' })).toMatch(/before/);
    expect(pauseFormProblem({ pausedOn: '2026-10-19', autoResume: true })).toMatch(/resume date/);
    expect(pauseFormProblem({ pausedOn: '2026-10-19', resumeOn: '2026-10-30', autoResume: true })).toBeNull();
  });

  it('never stores auto-resume without a resume date', () => {
    expect(pauseFields({ reason: 'traveling', pausedOn: '2026-10-19', autoResume: true }).autoResume).toBe(false);
  });

  it('maps the picked label to its value', () => {
    expect(pauseReasonFromLabel('Patient request')).toBe('patient_request');
    expect(pauseReasonFromLabel('anything else')).toBe('other');
  });
});

describe('nextTouchpoint', () => {
  const plan = { status: 'active' };
  it('is the earliest open intervention due date, today when one is past due', () => {
    const interventions = [
      { status: 'In Progress', config: { dueDate: '2026-10-25' } },
      { status: 'Met', config: { dueDate: '2026-10-20' } },
    ];
    expect(nextTouchpoint({ plan, interventions }, { today })).toBe('2026-10-25');
    const late = [{ status: 'Not Started', config: { dueDate: '2026-10-01' } }];
    expect(nextTouchpoint({ plan, interventions: late }, { today })).toBe('2026-10-19');
  });

  it('falls back to the soonest open goal cadence', () => {
    const goals = [{ status: 'In Progress', frequency: 'Monthly' }, { status: 'Not Started', frequency: 'Weekly' }];
    expect(nextTouchpoint({ plan, goals }, { today })).toBe('2026-10-26');
  });

  it('has none while paused or with nothing open', () => {
    expect(nextTouchpoint({ plan: { status: 'paused' }, goals: [{ frequency: 'Daily' }] }, { today })).toBeNull();
    expect(nextTouchpoint({ plan, goals: [{ status: 'Discontinued', frequency: 'Daily' }] }, { today })).toBeNull();
  });
});

describe('audit and summary', () => {
  it('records why, when and how it resumes', () => {
    const e = pauseAuditEntry('p1', { reason: 'hospitalized', pausedOn: '2026-10-19', resumeOn: '2026-10-30', autoResume: true });
    expect(e).toMatchObject({ entityType: 'plan', entityId: 'p1', action: 'paused', summary: 'Paused: Hospitalized' });
    expect(e.detail).toContain('Resumes 10/30/2026 automatically');
    expect(resumeAuditEntry('p1', { auto: true, nextTouchpoint: '2026-10-25' })).toMatchObject({
      action: 'resumed', summary: 'Resumed automatically on the resume date', detail: 'Next touchpoint 10/25/2026',
    });
  });

  it('reads as one line, with the note standing in for Other', () => {
    expect(pauseSummary({ reason: 'other', note: 'Family emergency', pausedOn: '2026-10-19' }))
      .toBe('Family emergency · since 10/19/2026 · no resume date');
    expect(isCarePlanPaused({ status: 'paused' })).toBe(true);
  });
});
