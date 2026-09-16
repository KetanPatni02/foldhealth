import { FIELD_BY_KEY, ruleSummary } from './fieldCatalog';

/** Plain-text lines for a rule tree (field headings, values, combinators). */
export function ruleSummaryLines(query) {
  const lines = [];
  const walk = (group, depth) => {
    const combinator = (group.combinator || 'and').toUpperCase();
    (group.rules || []).forEach((node, i) => {
      if (i > 0) lines.push({ text: combinator, kind: 'combinator', depth });
      if (Array.isArray(node.rules)) {
        walk(node, depth + 1);
        return;
      }
      const field = FIELD_BY_KEY[node.field];
      if (!field) return;
      lines.push({ text: field.label, kind: 'field', depth });
      ruleSummary(node).forEach((b) => lines.push({ text: b.text, kind: 'value', depth }));
    });
  };
  if (query) walk(query, 0);
  return lines;
}
