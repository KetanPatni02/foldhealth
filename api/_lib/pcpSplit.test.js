import { describe, expect, it } from 'vitest';
import { buildSplit } from './pcpSplit.js';

const patients = [
  { key: 'A1', name: 'Annette Brave', memberId: 'A1', records: { hccs: ['HCC 18'], icds: [], dos: ['08/26/2026'] } },
  { key: 'B2', name: 'Brian Carter', memberId: 'B2', records: { hccs: ['HCC 238'], icds: [], dos: ['09/02/2026'] } },
];

describe('buildSplit', () => {
  it('keeps one draft per selected patient and drops unselected ones', () => {
    const out = buildSplit({
      drafts: [
        { patientKey: 'A1', summary: 'Will send the 08/26 note.', confidence: 'high', actions: [{ text: 'Send note', refs: [{ type: 'HCC', id: '18' }] }] },
        { patientKey: 'ZZ', summary: 'Not selected', confidence: 'high', actions: [] },
      ],
    }, patients);
    expect(out.drafts.map(d => d.patientKey)).toEqual(['A1', 'B2']);
    expect(out.drafts[0].actions[0].refs[0]).toEqual({ type: 'HCC', id: 'HCC 18', matched: true });
    expect(out.drafts[1]).toMatchObject({ noDiscussion: true, summary: '' });
  });

  it('flags a low-confidence part and suggests the patient with the DOS mentioned', () => {
    const out = buildSplit({
      drafts: [{ patientKey: 'A1', summary: 'Records for Brian', confidence: 'low', flagReason: 'First name only', mentionedDos: '9/2/2026', actions: [] }],
    }, patients);
    expect(out.drafts[0]).toMatchObject({ flagged: true, flagReason: 'First name only', suggestedKey: 'B2' });
  });

  it('suggests a patient for unassigned parts and lists mentioned patients not selected', () => {
    const out = buildSplit({
      drafts: [],
      unassigned: [{ text: 'The 08/26 visit note', mentionedDos: '08/26/2026', purpose: 'document retrieval' }],
      mentionedNotSelected: [{ name: 'Frank Green' }, { name: 'frank green' }, { name: 'Annette Brave' }],
    }, patients);
    expect(out.unassigned).toEqual([{ text: 'The 08/26 visit note', purpose: 'document retrieval', suggestedKey: 'A1' }]);
    expect(out.mentionedNotSelected).toEqual([{ name: 'Frank Green', memberId: null }]);
  });
});
