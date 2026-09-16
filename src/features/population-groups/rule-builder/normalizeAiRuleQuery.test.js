import { describe, it, expect } from 'vitest';
import { normalizeAiRuleQuery } from './normalizeAiRuleQuery';

describe('normalizeAiRuleQuery', () => {
  it('accepts a simple AND rule', () => {
    const { query, errors } = normalizeAiRuleQuery({
      combinator: 'and',
      rules: [
        { field: 'patientAge', operator: '>=', value: { amount: 65, asOfMode: 'today' } },
        { field: 'membershipStatus', operator: '=', value: { text: 'Active' } },
      ],
    });
    expect(errors).toHaveLength(0);
    expect(query.combinator).toBe('and');
    expect(query.rules).toHaveLength(2);
    expect(query.rules[0].field).toBe('patientAge');
    expect(query.rules[0].value.amount).toBe(65);
    expect(query.rules[1].value.text).toBe('Active');
  });

  it('rejects unknown fields', () => {
    const { query, errors } = normalizeAiRuleQuery({
      combinator: 'and',
      rules: [{ field: 'notAField', operator: '=', value: { text: 'x' } }],
    });
    expect(query).toBeNull();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('normalizes select option casing', () => {
    const { query, errors } = normalizeAiRuleQuery({
      combinator: 'and',
      rules: [{ field: 'sexAtBirth', operator: '=', value: { text: 'female' } }],
    });
    expect(errors).toHaveLength(0);
    expect(query.rules[0].value.text).toBe('Female');
  });
});
