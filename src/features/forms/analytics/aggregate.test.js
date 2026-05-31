import { describe, it, expect } from 'vitest';
import {
  leafFields, completionStats, questionStats, scoreGroupStats, averageScoreSeries, answerAverage,
} from './aggregate';

const fields = [
  { linkId: 'rate', type: 'choice', control: 'radio', text: 'Rate', required: true, options: [{ value: 'Good' }, { value: 'Bad' }] },
  { linkId: 'age', type: 'integer', text: 'Age', required: true },
  { linkId: 'note', type: 'text', text: 'Notes' },
  { linkId: 'intro', type: 'display', text: 'Welcome' },
  { linkId: 'grp', type: 'group', text: 'Group', items: [{ linkId: 'g1', type: 'choice', control: 'radio', text: 'G1', options: [{ value: 'A' }, { value: 'B' }] }] },
];

const responses = [
  { id: 1, createdAt: '2023-03-10T10:00:00Z', answers: { rate: 'Good', age: 30, note: 'hi', g1: 'A' }, scores: { scores: [{ id: 's1', value: 8, band: { label: 'High', severity: 'high' } }] } },
  { id: 2, createdAt: '2023-04-10T10:00:00Z', answers: { rate: 'Bad', age: 40 }, scores: { scores: [{ id: 's1', value: 4, band: { label: 'Low', severity: 'neutral' } }] } },
  { id: 3, createdAt: '2023-04-20T10:00:00Z', answers: {}, scores: { scores: [] } },
];

describe('leafFields', () => {
  it('descends into groups and excludes display fields', () => {
    expect(leafFields(fields).map((f) => f.linkId)).toEqual(['rate', 'age', 'note', 'g1']);
  });
});

describe('completionStats', () => {
  it('classifies responded / in-progress / not-started', () => {
    const c = completionStats(fields, responses);
    expect(c.total).toBe(3);
    expect(c.questionCount).toBe(4);
    expect(c.responded).toBe(1);   // r1: all required (rate, age) answered
    expect(c.inProgress).toBe(1);  // r2: some answered, not all leaves
    expect(c.notStarted).toBe(1);  // r3: none
    expect(c.completionRate).toBeGreaterThan(0);
  });
});

describe('questionStats', () => {
  it('choice → distribution + most voted', () => {
    const s = questionStats(fields[0], responses);
    expect(s.kind).toBe('choice');
    expect(s.answeredCount).toBe(2);
    expect(s.distribution).toEqual([{ label: 'Good', count: 1 }, { label: 'Bad', count: 1 }]);
    expect(s.mostVoted.label).toBe('Good');
  });
  it('numeric → average + distribution', () => {
    const s = questionStats(fields[1], responses);
    expect(s.kind).toBe('numeric');
    expect(s.average).toBe(35);
    expect(s.distribution.map((d) => d.value)).toEqual([30, 40]);
  });
  it('text → answer list', () => {
    const s = questionStats(fields[2], responses);
    expect(s.kind).toBe('text');
    expect(s.answers).toEqual(['hi']);
  });
});

describe('scoreGroupStats', () => {
  it('averages a score and resolves its band', () => {
    const scoring = { scores: [{ id: 's1', label: 'Total', interpretations: [{ min: 0, max: 5, label: 'Low', severity: 'neutral' }, { min: 6, max: 10, label: 'High', severity: 'high' }] }] };
    const [g] = scoreGroupStats(scoring, responses);
    expect(g.average).toBe(6);       // (8 + 4) / 2
    expect(g.band.label).toBe('High');
    expect(g.count).toBe(2);
  });
});

describe('averageScoreSeries', () => {
  it('buckets the primary score by month in order', () => {
    const scoring = { scores: [{ id: 's1', label: 'Total', interpretations: [] }] };
    const series = averageScoreSeries(scoring, responses);
    expect(series.map((p) => p.month)).toEqual(['Mar 23', 'Apr 23']);
    expect(series[0].value).toBe(8);
    expect(series[1].value).toBe(4);
  });
  it('empty when no scores defined', () => {
    expect(averageScoreSeries({ scores: [] }, responses)).toEqual([]);
  });
});

describe('answerAverage', () => {
  it('numeric → ~mean, choice → most common', () => {
    expect(answerAverage(fields[1], responses)).toBe('~35');
    expect(answerAverage(fields[0], responses)).toBe('Good');
  });
});
