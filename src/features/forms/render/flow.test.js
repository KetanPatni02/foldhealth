import { describe, it, expect } from 'vitest';
import { matchConditions, evalJump, endingsOf, findEnding } from './flow';
import { OPERATOR } from '../scoring/types';

describe('matchConditions', () => {
  const ans = { pain: 'Yes', score: 8, multi: ['A', 'B'] };
  it('all behavior requires every condition', () => {
    expect(matchConditions([{ question: 'pain', operator: OPERATOR.EQ, answer: 'Yes' }, { question: 'score', operator: OPERATOR.GTE, answer: 5 }], 'all', ans)).toBe(true);
    expect(matchConditions([{ question: 'pain', operator: OPERATOR.EQ, answer: 'Yes' }, { question: 'score', operator: OPERATOR.GTE, answer: 9 }], 'all', ans)).toBe(false);
  });
  it('any behavior requires one', () => {
    expect(matchConditions([{ question: 'pain', operator: OPERATOR.EQ, answer: 'No' }, { question: 'score', operator: OPERATOR.GT, answer: 5 }], 'any', ans)).toBe(true);
  });
  it('multi-select EQ matches membership; exists checks answered', () => {
    expect(matchConditions([{ question: 'multi', operator: OPERATOR.EQ, answer: 'B' }], 'all', ans)).toBe(true);
    expect(matchConditions([{ question: 'pain', operator: OPERATOR.EXISTS }], 'all', ans)).toBe(true);
    expect(matchConditions([{ question: 'nope', operator: OPERATOR.EXISTS }], 'all', ans)).toBe(false);
  });
  it('empty / missing → false', () => {
    expect(matchConditions([], 'all', ans)).toBe(false);
    expect(matchConditions(undefined, 'all', ans)).toBe(false);
  });
});

describe('evalJump', () => {
  const field = { jump: [
    { to: 'crisis', behavior: 'all', conditions: [{ question: 'q9', operator: OPERATOR.GT, answer: 0 }] },
    { to: 'mild', behavior: 'all', conditions: [{ question: 'total', operator: OPERATOR.LT, answer: 5 }] },
  ] };
  it('returns the first matching rule target', () => {
    expect(evalJump(field, { q9: 1, total: 3 })).toBe('crisis'); // first match wins
    expect(evalJump(field, { q9: 0, total: 3 })).toBe('mild');
    expect(evalJump(field, { q9: 0, total: 10 })).toBe(null);
  });
  it('no jump rules → null', () => {
    expect(evalJump({}, { a: 1 })).toBe(null);
  });
});

describe('endingsOf / findEnding', () => {
  it('uses settings.endings when present', () => {
    const s = { endings: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }] };
    expect(endingsOf(s).map((e) => e.id)).toEqual(['a', 'b']);
    expect(findEnding(s, 'b').title).toBe('B');
    expect(findEnding(s, 'missing').id).toBe('a'); // fallback to first
  });
  it('falls back to legacy settings.end as the default ending', () => {
    const s = { end: { title: 'Thanks', description: 'Done' } };
    const list = endingsOf(s);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'default', title: 'Thanks', description: 'Done' });
  });
});
