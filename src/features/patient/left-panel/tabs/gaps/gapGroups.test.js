import { describe, expect, it } from 'vitest';
import { groupGapItems } from './gapGroups';

const items = [
  { id: 1, code: 'BCS' },
  { id: 2, code: 'CBP' },
  { id: 3, title: 'EED - Eye Exam for Patients With Diabetes' },
  { id: 4, code: 'ZZZ' },
];

describe('groupGapItems', () => {
  it('groups by the action that closes the gap, in a fixed order', () => {
    expect(groupGapItems(items, 'action').map(s => [s.title, s.items.map(i => i.id)]))
      .toEqual([['Vitals', [2]], ['Screenings', [1]], ['Referrals', [3]], ['Other', [4]]]);
  });
  it('groups by condition', () => {
    expect(groupGapItems(items, 'condition').map(s => s.title))
      .toEqual(['Diabetes', 'Cardiovascular', 'Cancer Screening', 'Other']);
  });
});
