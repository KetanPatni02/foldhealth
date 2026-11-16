import { describe, expect, it } from 'vitest';
import { itemsPhrase, reassignedToMe, welcomeBack } from './coveringNotifications';

const record = { id: 'r1', userName: 'Navin Jethwani', startAt: '2026-11-11T00:00:00', endAt: '2026-11-24T00:00:00' };

describe('covering notifications', () => {
  it('reassignment lists every module', () => {
    const mine = [
      ...Array(8).fill({ kind: 'appointment' }),
      ...Array(6).fill({ kind: 'task' }),
      ...Array(4).fill({ kind: 'program' }),
    ];
    const n = reassignedToMe({ job: { id: 'j1', createdBy: 'Devanshi Sharma', fromUser: 'Aditi Kalegaonkar' }, mine });
    expect(n.title).toBe('18 items assigned to you.');
    expect(n.body).toBe('Devanshi Sharma reassigned 8 appointments, 6 tasks and 4 care programs from Aditi Kalegaonkar to you.');
    expect(itemsPhrase([{ kind: 'task' }])).toBe('1 task');
  });

  it('welcome back counts what happened', () => {
    const job = { id: 'j1', results: Array(18).fill({ outcome: 'reassigned' }) };
    expect(welcomeBack({ record, job, completed: 12, autoReplies: 3 }).body)
      .toBe('18 items reassigned, 12 completed by your covering providers, 3 auto-replies sent.');
  });
});
