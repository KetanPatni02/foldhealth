/**
 * Pure helpers for the form layout/view modes. No React.
 *
 * Three layouts: 'by-question' (Typeform-style, paged), 'by-section' (paged by
 * section), 'entire-page' (one scrolling page — the default + legacy behavior).
 */

export const LAYOUTS = { 'by-question': 1, 'by-section': 1, 'entire-page': 1 };

// Backward-compatible: unknown / absent / the old 'sectioned' constant all map
// to 'entire-page' so existing forms render exactly as they do today.
export function normalizeLayout(v) {
  return LAYOUTS[v] ? v : 'entire-page';
}

/**
 * Build the step list for a paged layout.
 * - A top-level `group` (health component / validated instrument) is always its
 *   own step rendering all its items.
 * - 'by-question': each loose top-level field is its own step.
 * - 'by-section': consecutive loose top-level fields bundle into one step.
 * `single` flags a step that is a single single-select choice → auto-advance.
 * @returns {{id:string,title:string|null,items:object[],single:boolean}[]}
 */
export function buildSteps(fields, mode) {
  const steps = [];
  let bucket = null;
  const flush = () => { if (bucket) { steps.push(bucket); bucket = null; } };
  for (const f of fields || []) {
    if (f.type === 'group') {
      flush();
      steps.push({ id: f.linkId, title: f.text || null, items: [f], single: false });
    } else if (mode === 'by-question') {
      flush();
      const single = f.type === 'choice' && f.control !== 'checkbox';
      steps.push({ id: f.linkId, title: null, items: [f], single });
    } else {
      if (!bucket) bucket = { id: `loose-${f.linkId}`, title: null, items: [], single: false };
      bucket.items.push(f);
    }
  }
  flush();
  return steps;
}

/**
 * Build the one-question-at-a-time flow used by the paged renderers.
 * Both modes show ONE question per screen; they differ in section metadata:
 * - 'by-question': flat list, no sections.
 * - 'by-section': questions grouped into sections (top-level group = a section;
 *   consecutive loose fields = a "Questions" section) for the top stepper.
 * @returns {{questions:{field:object,sectionIndex:number|null}[], sections:{title:string,count:number}[]|null}}
 */
export function buildFlow(fields, mode) {
  if (mode === 'by-question') {
    return { questions: leavesOf(fields).map((field) => ({ field, sectionIndex: null })), sections: null };
  }
  const sections = [];
  const questions = [];
  let bucket = null;
  const flush = () => {
    if (bucket && bucket.items.length) {
      const si = sections.length;
      sections.push({ title: bucket.title, count: bucket.items.length });
      bucket.items.forEach((field) => questions.push({ field, sectionIndex: si }));
    }
    bucket = null;
  };
  for (const f of fields || []) {
    if (f.type === 'group') {
      flush();
      const items = leavesOf(f.items);
      if (!items.length) continue;
      const si = sections.length;
      sections.push({ title: f.text || 'Section', count: items.length });
      items.forEach((field) => questions.push({ field, sectionIndex: si }));
    } else {
      if (!bucket) bucket = { title: 'Questions', items: [] };
      bucket.items.push(f);
    }
  }
  flush();
  return { questions, sections };
}

/** Flatten a list of items to their answerable leaves (descends into groups). */
export function leavesOf(items) {
  const out = [];
  const walk = (list) => (list || []).forEach((f) => (f.items ? walk(f.items) : out.push(f)));
  walk(items);
  return out;
}

/** Required, non-display leaves within a set of items (for validation). */
export function requiredLeaves(items) {
  return leavesOf(items).filter((f) => f.required && f.type !== 'display');
}
