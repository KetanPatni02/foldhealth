/**
 * Bridges the builder's field shape (uses `options`) to the scoring engine /
 * FHIR-ish shape it expects (uses `answerOption`). Pure helpers.
 */

function toItem(f) {
  const out = { linkId: f.linkId, type: f.type, text: f.text, required: !!f.required };
  if (Array.isArray(f.options)) {
    out.answerOption = f.options.map((o) => (o.score == null ? { value: o.value } : { value: o.value, score: o.score }));
  }
  if (Array.isArray(f.items)) out.item = f.items.map(toItem);
  if (Array.isArray(f.enableWhen)) out.enableWhen = f.enableWhen;
  return out;
}

/** Builder fields → { item: [...] } questionnaire the engine evaluates. */
export function toQuestionnaire(fields) {
  return { item: (fields || []).map(toItem) };
}

/** Flat index { linkId: engineItem } including nested group items. */
export function buildIndex(fields) {
  const index = {};
  const walk = (list) => (list || []).forEach((f) => {
    index[f.linkId] = f;
    if (f.items) walk(f.items);
  });
  walk(fields);
  return index;
}

/** Flat index { linkId: engineItem } (engine shape, with answerOption). */
export function engineItemIndex(fields) {
  const index = {};
  const walk = (list) => (list || []).forEach((f) => {
    index[f.linkId] = toItem(f);
    if (f.items) walk(f.items);
  });
  walk(fields);
  return index;
}

/** Fields that carry at least one scored option (i.e. are scorable). */
export function scorableFields(fields) {
  const out = [];
  const walk = (list) => (list || []).forEach((f) => {
    if (Array.isArray(f.options) && f.options.some((o) => typeof o.score === 'number')) out.push(f);
    if (f.items) walk(f.items);
  });
  walk(fields);
  return out;
}
