/**
 * Flow control helpers for the paged renderer: condition matching (shared shape
 * with enableWhen), jump-to-ending rules, and the endings list.
 *
 * A jump rule lives on a field:
 *   field.jump = [{ to: <endingId>, behavior: 'all'|'any',
 *                   conditions: [{ question, operator, answer }] }]
 * After the respondent answers that field, the first rule whose conditions match
 * ends the form on ending `to` (forward-only, Typeform-style).
 */
import { OPERATOR } from '../scoring/types';

/** Compare one answer value against a condition value with the given operator. */
function compare(operator, answer, expected) {
  const answered = answer != null && answer !== '' && !(Array.isArray(answer) && answer.length === 0);
  switch (operator) {
    case OPERATOR.EXISTS: return answered;
    case OPERATOR.EQ: return Array.isArray(answer) ? answer.map(String).includes(String(expected)) : String(answer) === String(expected);
    case OPERATOR.NE: return Array.isArray(answer) ? !answer.map(String).includes(String(expected)) : String(answer) !== String(expected);
    case OPERATOR.GT: return Number(answer) > Number(expected);
    case OPERATOR.LT: return Number(answer) < Number(expected);
    case OPERATOR.GTE: return Number(answer) >= Number(expected);
    case OPERATOR.LTE: return Number(answer) <= Number(expected);
    default: return false;
  }
}

/** Evaluate a condition group (all/any) against the answers map. */
export function matchConditions(conditions, behavior = 'all', answers = {}) {
  if (!conditions || !conditions.length) return false;
  const results = conditions.map((c) => compare(c.operator, answers[c.question], c.answer));
  return behavior === 'any' ? results.some(Boolean) : results.every(Boolean);
}

/** First matching jump rule's target ending id, or null. */
export function evalJump(field, answers = {}) {
  for (const rule of field?.jump || []) {
    if (rule.to && matchConditions(rule.conditions, rule.behavior, answers)) return rule.to;
  }
  return null;
}

/**
 * Normalized endings list (always ≥1). Prefers `settings.endings[]`; falls back
 * to the legacy single `settings.end` as the lone default ending.
 */
export function endingsOf(settings) {
  const list = Array.isArray(settings?.endings) ? settings.endings.filter(Boolean) : null;
  if (list && list.length) return list;
  const e = settings?.end || {};
  return [{ id: 'default', title: e.title || 'Thank you!', description: e.description || '', enabled: e.enabled !== false }];
}

/** Resolve an ending by id (falls back to the first/default ending). */
export function findEnding(settings, id) {
  const list = endingsOf(settings);
  return (id && list.find((e) => e.id === id)) || list[0];
}
