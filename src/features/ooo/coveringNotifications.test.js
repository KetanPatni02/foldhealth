import { describe, expect, it } from 'vitest';
import { coverageStarted, coveredEfax, coveredMessage, coveredMissedCall, itemsPhrase, reassignedToMe, welcomeBack } from './coveringNotifications';

const record = { id: 'r1', userName: 'Navin Jethwani', startAt: '2026-11-11T00:00:00', endAt: '2026-11-24T00:00:00' };
const conv = { id: 'c1', channel: 'sms', patient_name: 'Amy Phillips', last_message_at: '2026-11-15T10:00:00Z' };

describe('covering notifications', () => {
  it('coverage started names who and when', () => {
    const n = coverageStarted(record);
    expect(n.title).toBe("You're covering for Navin Jethwani.");
    expect(n.body).toBe('Navin is out of office 11/11/2026 – 11/24/2026. Their messages, calls and new work come to you.');
    expect(n.id).toBe('cov:start:r1');
  });

  it('coverage started says what was assigned to me and by whom', () => {
    const mine = [{ kind: 'appointment' }, { kind: 'appointment' }, { kind: 'task' }, { kind: 'program' }];
    const n = coverageStarted(record, { job: { id: 'j1', createdBy: 'Devanshi Sharma', createdAt: '2026-11-11T09:00:00' }, mine });
    expect(n.title).toBe("You're covering for Navin Jethwani.");
    expect(n.body).toBe('Devanshi Sharma assigned you 2 appointments, 1 task and 1 care program from Navin, out of office 11/11/2026 – 11/24/2026.');
    expect(n.linkLabel).toBe('View Summary');
  });

  it('message, eFax and missed call say why they reached me', () => {
    const sms = coveredMessage({ conversation: conv, coveredName: 'Navin Jethwani', inboxName: 'Main Line' });
    expect(sms.title).toBe('New SMS from Amy Phillips.');
    expect(sms.body).toBe("In Main Line, assigned to Navin Jethwani. You're receiving this because you're covering for them.");
    expect(coveredMessage({ conversation: { ...conv, channel: 'email' }, coveredName: 'Navin Jethwani' }).title).toBe('New email from Amy Phillips.');
    expect(coveredMissedCall({ conversation: conv, coveredName: 'Navin Jethwani' }).title).toBe('Missed call from Amy Phillips.');
    expect(coveredEfax({ fax: { id: 'f1', receivedAt: '2026-11-15T10:00:00Z' }, inboxName: 'Billing', coveredName: 'Navin Jethwani' }).title)
      .toBe('New eFax in Billing.');
  });

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
