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
  it('keeps the gap In Progress, with Claim matched as a done sub-status, while the fill covers today', () => {
    const st = measureStatus(matchedMeasure({ pickedUpDaysAgo: 10, supply: 30 }), { callHistory: [] });
    expect(st.gap).toBe('In Progress');
    expect(st.label).toBe('Claim matched');
    expect(st.done).toBe(true);
  });

  it('reopens once the supply has run out, even though the claim matched', () => {
    const st = measureStatus(matchedMeasure({ pickedUpDaysAgo: 60, supply: 30 }), { callHistory: [] });
    expect(st.gap).toBe('Open');
    expect(st.label).toBe('Refill overdue');
  });

  it('puts a covered gap back in play when someone sets it to Open by hand', () => {
    const x = { ...matchedMeasure({ pickedUpDaysAgo: 10, supply: 30 }), status: 'Open', statusManual: true };
    const st = measureStatus(x, { callHistory: [] });
    expect(st.gap).toBe('Open');
    expect(st.done).toBe(false);
    const m = enrichPharmacyMember({ id: 'm', memberId: 'm', measures: [x] });
    expect(m.progress.closed).toBe(0);
    expect(m.urgentOpen).toBe(true);
  });
});

describe('enrichPharmacyMember: other care gaps', () => {
  const member = {
    id: '19401', memberId: '19401', name: 'Test Member',
    measures: [matchedMeasure({ pickedUpDaysAgo: 10, supply: 30 })],
    otherCareGaps: [{ code: 'CBP', name: 'Controlling Blood Pressure', status: 'Open' }],
  };

  it('uses the live HEDIS gaps when the member has a HEDIS record, open ones only', () => {
    const hedisGapsByMember = new Map([['19401', [{ code: 'CBP', status: 'Open' }, { code: 'EED', status: 'Engaged' }, { code: 'COL', status: 'Completed' }, { code: 'BCS', status: 'Closed - Data' }]]]);
    const m = enrichPharmacyMember(member, { hedisGapsByMember });
    expect(m.otherCareGaps.map(g => g.code)).toEqual(['CBP', 'EED']);
  });

  it('falls back to the stored plan-file list without one', () => {
    const m = enrichPharmacyMember(member, { hedisGapsByMember: new Map() });
    expect(m.otherCareGapsCount).toBe(1);
  });

  it('ignores a member-level manual status', () => {
    const m = enrichPharmacyMember({ ...member, status: 'Open', statusManual: true });
    expect(m.status).toBe('In Progress');
  });
});
