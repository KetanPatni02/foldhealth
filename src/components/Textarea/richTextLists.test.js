import { describe, it, expect } from 'vitest';
import { textToListHtml } from './richTextLists';

describe('pasting a plain-text list', () => {
  it('turns "1." and "-" / "•" lines into real lists and keeps other lines', () => {
    expect(textToListHtml('Conditions:\n1. Unpaid bills\n2. Started\n- a\n• b\nEnd\n'))
      .toBe('<div>Conditions:</div><ol><li>Unpaid bills</li><li>Started</li></ol><ul><li>a</li><li>b</li></ul><div>End</div>');
  });

  it('keeps a list\'s starting number and escapes text', () => {
    expect(textToListHtml('3) Third <b>\n4) Fourth')).toBe('<ol start="3"><li>Third &lt;b&gt;</li><li>Fourth</li></ol>');
  });

  it('leaves text with no list lines to a normal paste', () => {
    expect(textToListHtml('Just a sentence.\nAnd another.')).toBeNull();
  });
});
