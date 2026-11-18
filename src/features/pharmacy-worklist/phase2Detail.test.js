import { describe, expect, it } from 'vitest';
import { fillSourceTag, pdcRaisingOptions } from './pharmacyWorklist.utils';

const mdyIn = (days) => {
  const d = new Date(Date.now() + days * 86400000);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
};
const open = { gap: 'In Progress', done: false };

describe('fill source tag', () => {
  it('names where each fill came from', () => {
    expect(fillSourceTag({ manual: true, source: 'Entered by hand' }).label).toBe('Entered by hand');
    expect(fillSourceTag({ source: 'Surescripts fill record' }).label).toBe('Surescripts');
    expect(fillSourceTag({ source: 'Pickup confirmed by call' }).label).toBe('Pharmacy-confirmed');
    expect(fillSourceTag({ claimId: 'C1', coverage: 'Commercial' }).label).toBe('Non–Part D claim');
    expect(fillSourceTag({ claimId: 'C1' }).label).toBe('Part D claim');
  });
});

describe('ways to raise PDC', () => {
  it('suggests a longer fill, an early refill and a sync only when they apply', () => {
    const gaps = [
      { code: 'MAD', status: open, nextFillDue: mdyIn(3), medications: [{ daysSupply: 30, nextFill: mdyIn(3) }] },
      { code: 'MAH', status: open, nextFillDue: mdyIn(40), medications: [{ daysSupply: 90, nextFill: mdyIn(40) }] },
    ];
    expect(pdcRaisingOptions(gaps).map(o => o.key)).toEqual(['longer', 'early', 'sync', 'auto', 'mail']);
    const calm = [{ code: 'MAH', status: open, nextFillDue: mdyIn(40), medications: [{ daysSupply: 90, nextFill: mdyIn(40) }] }];
    expect(pdcRaisingOptions(calm).map(o => o.key)).toEqual(['auto', 'mail']);
  });

  it('suggests nothing when no gap is open', () => {
    expect(pdcRaisingOptions([{ code: 'MAD', status: { gap: 'Met for Year', done: true }, medications: [] }])).toEqual([]);
  });
});
