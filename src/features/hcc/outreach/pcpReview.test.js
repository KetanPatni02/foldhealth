import { describe, expect, it } from 'vitest';
import {
  initReview, confirmFlag, moveDraft, unresolveDraft, placeUnassigned, unresolveUnassigned,
  removePatient, addPatient, reviewProblem,
} from './pcpReview';

const patients = [{ key: 'A', name: 'Annette' }, { key: 'B', name: 'Brian' }];
const split = {
  drafts: [
    { patientKey: 'A', summary: 'Send 08/26 note', actions: [], flagged: true, flagReason: 'First name only', suggestedKey: 'B', noDiscussion: false },
    { patientKey: 'B', summary: '', actions: [], noDiscussion: true },
  ],
  unassigned: [{ text: 'Echo report', purpose: 'document retrieval', suggestedKey: 'A' }],
  mentionedNotSelected: [{ name: 'Frank Green', memberId: null }],
};
const base = () => initReview({ split, patients, category: 'Successful', outcome: 'Spoke with Provider' });

describe('PCP review', () => {
  it('puts the outreach outcome on every patient', () => {
    expect(base().drafts.map(d => d.outcome)).toEqual(['Spoke with Provider', 'Spoke with Provider']);
  });

  it('blocks save until flags and unassigned parts are handled, naming the patient', () => {
    let s = base();
    expect(reviewProblem(s)).toMatch(/flagged part for Annette/);
    s = confirmFlag(s, 'A');
    expect(reviewProblem(s)).toMatch(/unassigned/);
    s = placeUnassigned(s, 0, 'A');
    expect(reviewProblem(s)).toMatch(/summary for Brian/);
    s = removePatient(s, 'B');
    expect(reviewProblem(s)).toBeNull();
    expect(s.drafts[0].summary).toBe('Send 08/26 note\n\nEcho report');
  });

  it('moves a flagged part to the right patient', () => {
    const s = moveDraft(base(), 'A', 'B');
    expect(s.drafts.find(d => d.patientKey === 'B').summary).toBe('Send 08/26 note');
    expect(s.drafts.find(d => d.patientKey === 'A')).toMatchObject({ summary: '', flagged: false, noDiscussion: true });
  });

  it('keeps Unresolved content off every patient', () => {
    let s = unresolveDraft(base(), 'A');
    s = unresolveUnassigned(s, 0);
    expect(s.unresolved.map(u => u.text)).toEqual(['Send 08/26 note', 'Echo report']);
    expect(s.drafts.every(d => !d.summary)).toBe(true);
  });

  it('adds a mentioned patient and drops them from the mentioned list', () => {
    const s = addPatient(base(), { key: 'F', name: 'Frank Green' }, { category: 'Successful', outcome: 'Spoke with Provider' });
    expect(s.drafts.map(d => d.patientKey)).toEqual(['A', 'B', 'F']);
    expect(s.mentioned).toEqual([]);
  });
});
