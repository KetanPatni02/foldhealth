import { normalizeAiRuleQuery } from './normalizeAiRuleQuery';

/**
 * @param {{ prompt: string, messages?: { role: string, content: string }[], currentRule?: object }} params
 * @returns {Promise<{ rule: object, summary: string }>}
 */
export async function fetchRuleFromNaturalLanguage({ prompt, messages, currentRule }) {
  const res = await fetch('/api/pop-group-rule-from-nl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, messages, currentRule }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || 'Could not generate a rule. Please try again.';
    const err = new Error(msg);
    err.details = data?.error?.details;
    throw err;
  }
  const { query, errors } = normalizeAiRuleQuery(data.rule);
  if (!query) {
    const err = new Error(errors[0] || 'Generated rule was invalid.');
    err.details = errors;
    throw err;
  }
  return { rule: query, summary: data.summary || '' };
}
