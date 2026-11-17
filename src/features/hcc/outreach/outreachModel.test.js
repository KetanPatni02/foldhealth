import { describe, expect, it } from 'vitest';
import {
  outcomesFor, outcomesForProgram, validateOutreach, sequenceLabels, groupByMonth, structuredSummary,
  canLogOutreach, parseFormDatetime, lastOutreachOf,
} from './outreachModel';

const NOW = new Date(2026, 10, 17, 12, 0);
const base = {
  receivedBy: 'Dr. Roland G. (PCP)', mode: 'Call', datetime: '11/17/2026, 10:00',
  category: 'Successful', outcome: 'Spoke with Provider', notes: 'Asked for notes',
};

describe('outcomesFor', () => {
  it('filters by category and recipient', () => {
    expect(outcomesFor('Successful', 'pcp')).toEqual(['Spoke with Provider', 'Face-to-Face Visit with Provider', 'Provider Declined']);
    expect(outcomesFor('Successful', 'member')).toEqual(['Spoke with Patient']);
    expect(outcomesFor('Unsuccessful', 'member')).toHaveLength(3);
  });
  it('uses a program’s own outcomes, else the launch list', () => {
    const list = [{ program: 'AWV', category: 'Successful', label: 'Visit Booked', recipients: ['member'], active: true }];
    expect(outcomesFor('Successful', 'member', outcomesForProgram(list, 'AWV'))).toEqual(['Visit Booked']);
    expect(outcomesFor('Successful', 'member', outcomesForProgram(list, 'RA'))).toEqual(['Spoke with Patient']);
  });
  it('leaves out deactivated outcomes', () => {
    const list = [
      { category: 'Successful', label: 'A', recipients: ['pcp'], active: true },
      { category: 'Successful', label: 'B', recipients: ['pcp'], active: false },
    ];
    expect(outcomesFor('Successful', 'pcp', list)).toEqual(['A']);
  });
  it('gives Note no outcomes', () => {
    expect(outcomesFor('Note', 'pcp')).toEqual([]);
  });
});

describe('validateOutreach', () => {
  it('passes a complete call', () => {
    expect(validateOutreach(base, NOW)).toBeNull();
  });
  it('names the missing outcome', () => {
    expect(validateOutreach({ ...base, outcome: '' }, NOW)).toBe('Select an outcome.');
  });
  it('does not need an outcome for a Note', () => {
    expect(validateOutreach({ ...base, category: 'Note', outcome: '' }, NOW)).toBeNull();
  });
  it('blocks a future date', () => {
    expect(validateOutreach({ ...base, datetime: '11/18/2026, 09:00' }, NOW)).toMatch(/future/);
  });
  it('needs the email To and Subject in Email mode', () => {
    expect(validateOutreach({ ...base, mode: 'Email', emailTo: '' }, NOW)).toMatch(/To address/);
    expect(validateOutreach({ ...base, mode: 'Email', emailTo: 'a@b.co', emailSubject: '' }, NOW)).toMatch(/subject/);
  });
  it('accepts a call transcript in place of notes', () => {
    expect(validateOutreach({ ...base, notes: '', transcript: 'Hello' }, NOW)).toBeNull();
    expect(validateOutreach({ ...base, notes: '' }, NOW)).toBe('Add notes or a call transcript.');
  });
});

describe('sequenceLabels', () => {
  it('counts each care program on its own', () => {
    const entries = [
      { id: 'r1', program: 'RA', category: 'Successful', loggedAt: '2026-01-01T10:00:00' },
      { id: 'a1', program: 'AWV', category: 'Successful', loggedAt: '2026-01-02T10:00:00' },
      { id: 'r2', program: 'RA', category: 'Unsuccessful', loggedAt: '2026-01-03T10:00:00' },
    ];
    expect(sequenceLabels(entries)).toEqual({ r1: '1st Outreach', a1: '1st Outreach', r2: '2nd Outreach' });
  });
  it('counts Successful and Unsuccessful only, oldest first', () => {
    const entries = [
      { id: 'a', category: 'Unsuccessful', loggedAt: '2026-01-01T10:00:00' },
      { id: 'b', category: 'Note', loggedAt: '2026-02-01T10:00:00' },
      { id: 'c', category: 'Successful', loggedAt: '2026-03-01T10:00:00' },
    ];
    expect(sequenceLabels(entries)).toEqual({ a: '1st Outreach', c: '2nd Outreach' });
  });
});

describe('groupByMonth', () => {
  it('groups newest month first', () => {
    const groups = groupByMonth([
      { id: 'a', loggedAt: '2026-01-05T10:00:00' },
      { id: 'b', loggedAt: '2026-03-05T10:00:00' },
      { id: 'c', loggedAt: '2026-03-01T10:00:00' },
    ]);
    expect(groups.map(g => g.label)).toEqual(['Mar 2026', 'Jan 2026']);
    expect(groups[0].entries.map(e => e.id)).toEqual(['b', 'c']);
  });
});

describe('structuredSummary', () => {
  it('fills the rows the entry has and leaves out the rest', () => {
    const rows = structuredSummary({
      loggedBy: 'Ketan Patni', loggedByRole: 'Coder', recipientType: 'pcp', receivedBy: 'Dr. Roland G. (PCP)',
      mode: 'In Person', loggedAt: '2026-11-17T10:00:00', category: 'Note',
    });
    const labels = rows.map(r => r.label);
    expect(labels).toContain('Called By');
    expect(labels).not.toContain('Duration');
    expect(labels).not.toContain('Outcome');
  });
});

describe('lastOutreachOf', () => {
  it('takes the latest contact attempt and skips Notes', () => {
    expect(lastOutreachOf([
      { category: 'Successful', outcome: 'Spoke with Provider', loggedAt: '2026-01-01T10:00:00' },
      { category: 'Unsuccessful', outcome: 'Wrong Number', loggedAt: '2026-02-01T10:00:00' },
      { category: 'Note', loggedAt: '2026-03-01T10:00:00' },
    ])).toEqual({ loggedAt: '2026-02-01T10:00:00', category: 'Unsuccessful', outcome: 'Wrong Number' });
    expect(lastOutreachOf([{ category: 'Note', loggedAt: '2026-03-01' }])).toBeNull();
  });
});

describe('roles and dates', () => {
  it('makes Physician view-only', () => {
    expect(canLogOutreach('Physician')).toBe(false);
    expect(canLogOutreach('Coder')).toBe(true);
  });
  it('parses the picker format', () => {
    expect(parseFormDatetime('11/17/2026, 10:05')?.getHours()).toBe(10);
    expect(parseFormDatetime('nope')).toBeNull();
  });
});
