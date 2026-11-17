// Tree helpers for RuleGroupBuilder, kept out of the component file so it
// only exports components (fast refresh).
let seq = 0;
export const nextId = () => `rgb-${Date.now().toString(36)}-${seq++}`;

/** An empty rule for the first of `fields`. */
export function blankRule(fields) {
  const f = fields[0];
  return { id: nextId(), field: f.value, op: f.ops[0], value: '' };
}

/** A blank `{ combinator, rules }` tree, optionally starting with one empty rule. */
export function emptyRuleGroup(fields, { withRule = false } = {}) {
  return { id: nextId(), combinator: 'and', rules: withRule && fields?.length ? [blankRule(fields)] : [] };
}
