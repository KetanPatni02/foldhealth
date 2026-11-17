import { describe, it, expect } from 'vitest';
import { parseTranscript, formatTranscript, formatTranscriptBlock, speakerInitials } from './transcript';

describe('parseTranscript', () => {
  it('reads speaker, time and text', () => {
    expect(parseTranscript('Delores Conn (07:09): Hi, Annette.\nDr. Katherine Moss: Hi.')).toEqual([
      { speaker: 'Delores Conn', t: '07:09', text: 'Hi, Annette.' },
      { speaker: 'Dr. Katherine Moss', t: '', text: 'Hi.' },
    ]);
  });

  it('joins a line without a speaker to the turn above', () => {
    expect(parseTranscript('Ann: one\nand two')).toEqual([{ speaker: 'Ann', t: '', text: 'one and two' }]);
  });

  it('reads the note block format and round-trips it', () => {
    const block = 'Delores Conn - 00:09\nHi, Dr. Moss.\nDr. Katherine Moss - 00:27\nHi.';
    expect(parseTranscript(block)).toEqual([
      { speaker: 'Delores Conn', t: '00:09', text: 'Hi, Dr. Moss.' },
      { speaker: 'Dr. Katherine Moss', t: '00:27', text: 'Hi.' },
    ]);
    expect(formatTranscriptBlock(parseTranscript(block))).toBe(block);
  });

  it('keeps leading text with no speaker', () => {
    expect(parseTranscript('just notes')).toEqual([{ speaker: '', t: '', text: 'just notes' }]);
  });

  it('round-trips through formatTranscript', () => {
    const text = 'Delores Conn (07:09): Hi.\nAnnette Brave (07:10): Hello.';
    expect(formatTranscript(parseTranscript(text))).toBe(text);
  });
});

describe('speakerInitials', () => {
  it('skips titles', () => {
    expect(speakerInitials('Dr. Katherine Moss')).toBe('KM');
    expect(speakerInitials('Delores Conn')).toBe('DC');
    expect(speakerInitials('')).toBe('?');
  });
});
