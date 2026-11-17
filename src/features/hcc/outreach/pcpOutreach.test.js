import { describe, expect, it } from 'vitest';
import { isOpenRecord, pcpOptions, patientsForPcp, formatDob } from './pcpOutreach';

const members = [
  { id: 'r1', memberId: 'A1', name: 'Annette Brave', rp: 'Dr. Park', cdrS: 'In Progress', r2s: 'Assign' },
  { id: 'r2', memberId: 'A1', name: 'Annette Brave', rp: 'Dr. Park', cdrS: 'New', r2s: 'Assign' },
  { id: 'r3', memberId: 'B2', name: 'Brian Carter', rp: 'Dr. Park', r2s: 'Completed' },
  { id: 'r4', memberId: 'C3', name: 'Cara Diaz', rp: 'Dr. Okafor', supS: 'Billed' },
  { id: 'r5', memberId: 'D4', name: 'Dan Ell', rp: 'Dr. Okafor', cdrS: 'New' },
];

describe('PCP Outreach patient list', () => {
  it('treats billed, rejected and Compliance-completed records as closed', () => {
    expect(isOpenRecord(members[0])).toBe(true);
    expect(isOpenRecord(members[2])).toBe(false);
    expect(isOpenRecord(members[3])).toBe(false);
  });
  it('shows DOB as MM/DD/YYYY', () => {
    expect(formatDob('1961-05-22')).toBe('05/22/1961');
    expect(formatDob(null)).toBeNull();
  });
  it('lists PCPs with open records', () => {
    expect(pcpOptions(members)).toEqual(['Dr. Okafor', 'Dr. Park']);
  });
  it('lists each patient once, open records only', () => {
    expect(patientsForPcp(members, 'Dr. Park').map(p => p.key)).toEqual(['A1']);
    expect(patientsForPcp(members, 'Dr. Okafor').map(p => p.key)).toEqual(['D4']);
    expect(patientsForPcp(members, 'Nobody')).toEqual([]);
  });
});
