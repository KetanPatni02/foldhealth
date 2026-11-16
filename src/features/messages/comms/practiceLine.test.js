import { describe, expect, it } from 'vitest';
import {
  isSmsMessage, lineName, lineSnapshot, lineText, messageLine, showPracticeLine, threadLine, validateLineLabel,
} from './practiceLine';

const main = { id: 'inbox-sms-main', name: 'Main Line', label: 'Main Clinic Line', address: '+17755550100' };
const care = { id: 'inbox-sms-care', name: 'Care Management', label: '', address: '+17755550142' };

describe('lines', () => {
  it('names a line by its label, else its inbox name', () => {
    expect(lineName(main)).toBe('Main Clinic Line');
    expect(lineName(care)).toBe('Care Management');
    expect(lineSnapshot(care)).toEqual({ number: '+17755550142', label: 'Care Management', inboxId: 'inbox-sms-care' });
    expect(lineSnapshot({ name: 'No number' })).toBeNull();
  });
});

describe('messageLine', () => {
  const convLine = lineSnapshot(main);

  it('reads the number a message recorded: to_addr inbound, from_addr outbound', () => {
    const inbound = { kind: 'message', direction: 'in', from_addr: '+15845550142', to_addr: '+17755550142', meta: { line_label: 'CCM Line' } };
    const outbound = { kind: 'message', direction: 'out', to_addr: '+15845550142', from_addr: '+17755550100', meta: { line_label: 'Main Clinic Line' } };
    expect(messageLine(inbound, convLine)).toEqual({ number: '+17755550142', label: 'CCM Line' });
    expect(messageLine(outbound, convLine)).toEqual({ number: '+17755550100', label: 'Main Clinic Line' });
  });

  it('keeps the label it was sent with after the line is relabelled', () => {
    const old = { kind: 'message', direction: 'out', from_addr: '+17755550100', meta: { line_label: 'Old Name' } };
    expect(messageLine(old, convLine).label).toBe('Old Name');
  });

  it('falls back to the conversation line for messages saved before lines were recorded', () => {
    expect(messageLine({ kind: 'message', direction: 'in', from_addr: '+15845550142' }, convLine))
      .toEqual({ number: '+17755550100', label: 'Main Clinic Line' });
  });

  it('skips calls and internal notes', () => {
    expect(isSmsMessage({ kind: 'call' })).toBe(false);
    expect(messageLine({ kind: 'message', internal: true, direction: 'out' }, convLine)).toBeNull();
  });
});

describe('lineText', () => {
  it('says where a message came in or went out', () => {
    expect(lineText({ direction: 'in' }, { number: '+17755550100', label: 'Main Clinic Line' })).toBe('Received on: +1 (775) 555-0100 · Main Clinic Line');
    expect(lineText({ direction: 'out' }, { number: '+17755550142', label: '' })).toBe('Sent from: +1 (775) 555-0142');
    expect(lineText({ direction: 'out' }, null)).toBe('');
  });
});

describe('threadLine', () => {
  it('shows the newest SMS line, else the conversation line', () => {
    const convLine = lineSnapshot(main);
    const messages = [
      { kind: 'message', direction: 'in', to_addr: '+17755550100', meta: { line_label: 'Main Clinic Line' } },
      { kind: 'message', direction: 'in', to_addr: '+17755550142', meta: { line_label: 'CCM Line' } },
      { kind: 'call', direction: 'in' },
    ];
    expect(threadLine(messages, convLine)).toEqual({ number: '+17755550142', label: 'CCM Line' });
    expect(threadLine([], convLine)).toBe(convLine);
  });
});

describe('settings', () => {
  it('always shows the line for multi-number practices', () => {
    expect(showPracticeLine(2, false)).toBe(true);
    expect(showPracticeLine(1, false)).toBe(false);
    expect(showPracticeLine(1, true)).toBe(true);
    expect(showPracticeLine(1, undefined)).toBe(true);
  });

  it('limits labels to 30 characters', () => {
    expect(validateLineLabel('AWV Line')).toBeNull();
    expect(validateLineLabel('x'.repeat(31))).toBe('Keep the label to 30 characters or fewer');
    expect(validateLineLabel('')).toBeNull();
  });
});
