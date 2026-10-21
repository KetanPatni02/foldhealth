import { describe, expect, it } from 'vitest';
import { addDaysMdy, enrichPharmacyMember, measureStatus, todayMdy } from './pharmacyWorklist.utils.js';

const daysAgo = (n) => addDaysMdy(todayMdy(), -n);

// One measure whose fill was picked up `pickedUpDaysAgo` days ago, with a
// paid claim the day after, and `supply` days on hand.
const matchedMeasure = ({ pickedUpDaysAgo, supply }) => ({
  code: 'MAD',
  pdc: 85,
  failDate: addDaysMdy(todayMdy(), 60),
  nextFillDue: addDaysMdy(daysAgo(pickedUpDaysAgo), supply),
  pickupConfirmed: daysAgo(pickedUpDaysAgo),
  claim: { status: 'Paid', date: daysAgo(pickedUpDaysAgo - 1) },
  medications: [{ id: 'm1', name: 'Metformin', strength: '500', unit: 'MG', daysSupply: supply, refills: [] }],
});

describe('measureStatus: matched claim', () => {
  it('closes the gap as Closed-Data while the fill still covers today', () => {
    const st = measureStatus(matchedMeasure({ pickedUpDaysAgo: 10, supply: 30 }), { callHistory: [] });
    expect(st.gap).toBe('Closed-Data');
    expect(st.label).toBe('Claim matched');
  });

  it('reopens once the supply has run out, even though the claim matched', () => {
    const st = measureStatus(matchedMeasure({ pickedUpDaysAgo: 60, supply: 30 }), { callHistory: [] });
    expect(st.gap).toBe('Open');
    expect(st.label).toBe('Refill overdue');
  });
});

describe('enrichPharmacyMember: other care gaps', () => {
  const member = {
    id: '19401', memberId: '19401', name: 'Test Member',
    measures: [matchedMeasure({ pickedUpDaysAgo: 10, supply: 30 })],
    otherCareGaps: [{ code: 'CBP', name: 'Controlling Blood Pressure', status: 'Open' }],
  };

  it('uses the live HEDIS gaps when the member has a HEDIS record', () => {
    const hedisGapsByMember = new Map([['19401', [{ code: 'CBP', status: 'Completed' }]]]);
    const m = enrichPharmacyMember(member, { hedisGapsByMember });
    expect(m.otherCareGaps).toEqual([{ code: 'CBP', status: 'Completed' }]);
  });

  it('falls back to the stored plan-file list without one', () => {
    const m = enrichPharmacyMember(member, { hedisGapsByMember: new Map() });
    expect(m.otherCareGapsCount).toBe(1);
  });

  it('ignores a member-level manual status', () => {
    const m = enrichPharmacyMember({ ...member, status: 'Open', statusManual: true });
    expect(m.status).toBe('Closed-Data');
  });
});
