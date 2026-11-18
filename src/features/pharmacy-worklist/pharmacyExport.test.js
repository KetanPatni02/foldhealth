import { describe, expect, it } from 'vitest';
import { outreachExportRows, outreachLink, outreachLinkTarget, toCsv } from './pharmacyExport';

const members = [
  {
    id: '19401', memberId: '19401', name: 'Maria Gonzalez', callHistory: [
      { id: 'out-1', date: '11/03/2026', time: '9:10 AM', type: 'Call', contact: 'CVS Pharmacy #9921', measures: ['MAD'], outcome: 'Pickup confirmed', by: 'Priya', note: 'Ready Thursday' },
      { id: 'ver-2', kind: 'pharmacy-verification', date: '10/02/2026', action: 'Telephonic', party: 'Pharmacy', contact: 'CVS', measures: ['MAD', 'MAH'], outcome: 'Interventions logged', by: 'Priya' },
    ],
  },
  { id: '19402', name: 'Robert Tanaka', callHistory: [{ id: 'out-3', date: '11/10/2026', type: 'SMS', measures: ['MAC'], outcome: 'Left message, "call back"', by: 'Marcus' }] },
];

describe('outreach export', () => {
  it('keeps the records in the date range, newest first, each with its link', () => {
    const rows = outreachExportRows(members, ['2026-11-01', '2026-11-30'], 'https://app.fold.health');
    expect(rows.map(r => r.member)).toEqual(['Robert Tanaka', 'Maria Gonzalez']);
    expect(rows[1]).toMatchObject({ kind: 'Outreach', gaps: 'MAD', link: 'https://app.fold.health/#/population/pharmacy?member=19401&outreach=out-1' });
  });

  it('labels assessments and names who was contacted', () => {
    const [row] = outreachExportRows(members, ['2026-10-01', '2026-10-31'], 'x');
    expect(row).toMatchObject({ kind: 'Assessment', type: 'Telephonic', contact: 'Pharmacy: CVS', gaps: 'MAD, MAH' });
  });

  it('quotes cells that need it', () => {
    const csv = toCsv(outreachExportRows(members, ['2026-11-10', '2026-11-10'], 'x'));
    expect(csv.split('\n')[1]).toContain('"Left message, ""call back"""');
  });

  it('reads the member and outreach back from a link', () => {
    const link = outreachLink('https://app.fold.health', '19401', 'out-1');
    expect(outreachLinkTarget(link.split('#')[1])).toEqual({ member: '19401', outreach: 'out-1' });
    expect(outreachLinkTarget('#/population/pharmacy')).toBeNull();
  });
});
