import { describe, expect, it } from 'vitest';
import { assessmentContactLine, assessmentRecords, outreachEvidence, outreachRecords, stepsByGap } from './program/pharmacyRecords';
import { recordSections } from './program/pharmacyRecordsPdf';

const assessment = {
  id: 'ver-1', kind: 'pharmacy-verification', date: '10/14/2026', by: 'Marcus Reyes',
  action: 'Telephonic', direction: 'Outbound', contactOutcome: 'Reached', party: 'Pharmacy', contact: 'CVS #3301',
  outcome: 'Interventions logged', measures: ['MAH', 'MAD'],
  outcomes: { MAD: ['Cost or insurance coverage issues'], MAH: [] },
  note: 'Generic switch requested.',
};
const older = { id: 'ver-0', kind: 'pharmacy-verification', date: '09/02/2026', measures: ['MAC'], items: [{ measure: 'MAC', drug: 'Atorvastatin', steps: ['Confirmed medication pickup date'] }] };
const outreach = {
  id: 'out-1', date: '10/01/2026', time: '11:05 AM', type: 'Call', contact: 'Pharmacy', outcome: 'Pickup confirmed', measures: ['MAD'],
  pickupDate: '09/30/2026', barriers: ['Cost Issue'], transcript: 'Picked up yesterday.',
};
const member = { callHistory: [older, outreach, assessment] };

describe('assessment and outreach records', () => {
  it('splits assessments from outreaches, newest first, scoped to the picked gaps', () => {
    expect(assessmentRecords(member).map(r => r.id)).toEqual(['ver-1', 'ver-0']);
    expect(assessmentRecords(member, new Set(['MAC'])).map(r => r.id)).toEqual(['ver-0']);
    expect(outreachRecords(member).map(r => r.id)).toEqual(['out-1']);
  });

  it('groups steps by gap in MAC, MAD, MAH order, reading older per-drug answers too', () => {
    expect(stepsByGap(assessment)).toEqual([
      { code: 'MAD', name: expect.any(String), steps: ['Cost or insurance coverage issues'] },
      { code: 'MAH', name: expect.any(String), steps: [] },
    ]);
    expect(stepsByGap(older)[0].steps).toEqual(['Confirmed medication pickup date']);
  });

  it('names who was contacted and how', () => {
    expect(assessmentContactLine(assessment)).toBe('Pharmacy: CVS #3301 · Telephonic, Outbound · Reached');
  });

  it('lists only the audit evidence an outreach has', () => {
    expect(outreachEvidence(outreach)).toEqual([['Pickup date', '09/30/2026'], ['Barriers', 'Cost Issue'], ['Call transcript', 'Picked up yesterday.']]);
  });
});

describe('records PDF sections', () => {
  it('prints an assessment with its steps under each gap', () => {
    const [s] = recordSections('assessment', [assessment]);
    expect(s.heading).toBe('Assessment · 10/14/2026 · Marcus Reyes');
    expect(s.gaps.map(g => g.items)).toEqual([['Cost or insurance coverage issues'], ['No steps recorded']]);
    expect(s.note).toBe('Generic switch requested.');
  });

  it('prints an outreach with its audit evidence', () => {
    const [s] = recordSections('outreach', [outreach]);
    expect(s.heading).toBe('Outreach · 10/01/2026 11:05 AM');
    expect(s.lines).toContainEqual(['Pickup date', '09/30/2026']);
    expect(s.lines).toContainEqual(['Gaps', 'MAD']);
  });
});

describe('records PDF', () => {
  it('builds a PDF for each kind from the sample member', async () => {
    const { buildPharmacyRecordsPdf } = await import('./program/pharmacyRecordsPdf');
    const { PHARMACY_WORKLIST_MEMBERS } = await import('./data/mock');
    const m = PHARMACY_WORKLIST_MEMBERS.find(x => x.id === '19408');
    const a = await buildPharmacyRecordsPdf({ member: m, kind: 'assessment', records: assessmentRecords(m) });
    const o = await buildPharmacyRecordsPdf({ member: m, kind: 'outreach', records: outreachRecords(m) });
    expect(a.getNumberOfPages()).toBe(1);
    expect(o.output()).toContain('Call transcript');
  });
});
