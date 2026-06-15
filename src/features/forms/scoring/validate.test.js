import { describe, it, expect } from 'vitest';
import { validateForm } from './validate.js';
import { AGGREGATION, SEVERITY, ACTION_TYPE, DIAGNOSTIC_CODE } from './types.js';

const choice03 = (linkId) => ({
  linkId, type: 'choice', required: true,
  answerOption: [0, 1, 2, 3].map((n) => ({ value: n, score: n })),
});

const hasCode = (out, code) => out.some((d) => d.code === code);

function cleanForm() {
  return {
    questionnaire: { item: [choice03('a'), choice03('b')] },
    scores: [{
      id: 's', label: 's', aggregation: AGGREGATION.SUM,
      sources: [{ linkId: 'a' }, { linkId: 'b' }],
      range: { min: 0, max: 6 },
      interpretations: [
        { min: 0, max: 3, label: 'low', severity: SEVERITY.NEUTRAL },
        { min: 4, max: 6, label: 'high', severity: SEVERITY.WARNING },
      ],
    }],
    criticalTriggers: [],
  };
}

describe('validateForm', () => {
  it('passes a clean form with no errors', () => {
    expect(validateForm(cleanForm()).filter((d) => d.level === 'error')).toHaveLength(0);
  });

  it('flags a band gap', () => {
    const f = cleanForm();
    f.scores[0].interpretations[1].min = 5; // leaves 4 uncovered
    expect(hasCode(validateForm(f), DIAGNOSTIC_CODE.BAND_GAP)).toBe(true);
  });

  it('flags a band overlap', () => {
    const f = cleanForm();
    f.scores[0].interpretations[0].max = 4; // overlaps [4..6]
    expect(hasCode(validateForm(f), DIAGNOSTIC_CODE.BAND_OVERLAP)).toBe(true);
  });

  it('flags a stale stored range', () => {
    const f = cleanForm();
    f.scores[0].range = { min: 0, max: 9 }; // computed is 0..6
    expect(hasCode(validateForm(f), DIAGNOSTIC_CODE.RANGE_STALE)).toBe(true);
  });

  it('flags a dangling field source', () => {
    const f = cleanForm();
    f.scores[0].sources.push({ linkId: 'nope' });
    expect(hasCode(validateForm(f), DIAGNOSTIC_CODE.DANGLING_SOURCE)).toBe(true);
  });

  it('flags a composite cycle as depth overflow', () => {
    const f = cleanForm();
    f.scores = [
      { id: 'p', label: 'p', aggregation: AGGREGATION.COMPOSITE, sources: [{ scoreId: 'q' }], range: { min: 0, max: 0 }, interpretations: [] },
      { id: 'q', label: 'q', aggregation: AGGREGATION.COMPOSITE, sources: [{ scoreId: 'p' }], range: { min: 0, max: 0 }, interpretations: [] },
    ];
    expect(hasCode(validateForm(f), DIAGNOSTIC_CODE.COMPOSITE_DEPTH)).toBe(true);
  });

  it('flags a section/score visibility cycle', () => {
    const f = {
      questionnaire: { item: [{ linkId: 'sec', type: 'group', defaultVisibility: 'hidden', item: [choice03('f')] }] },
      scores: [{
        id: 'sc', label: 'sc', aggregation: AGGREGATION.SUM, sources: [{ linkId: 'f' }], range: { min: 0, max: 3 },
        interpretations: [{ min: 0, max: 3, label: 'b', severity: SEVERITY.INFO, actions: [{ type: ACTION_TYPE.BRANCH, reveal: ['sec'] }] }],
      }],
      criticalTriggers: [],
    };
    expect(hasCode(validateForm(f), DIAGNOSTIC_CODE.CYCLE)).toBe(true);
  });
});
