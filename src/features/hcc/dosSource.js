// DOS-source classifier — shared by the worklist source badge
// (HccWorklistRow) and the "DOS Source" filter (filters.js) so both agree on
// which source (D=Clinical Document, C=Claims, M=Manual Entry) a given DOS
// maps to. Deterministic per date so the demo stays stable.

export const DOS_SOURCES = ['D', 'C', 'M'];

// Sources that remain valid when the record has no document on file — a
// row with no upload cannot possibly have a Document-sourced DOS.
const DOS_SOURCES_NO_DOC = DOS_SOURCES.filter(l => l !== 'D');

/**
 * Classify a DOS date to a source letter (D=Document, C=Claim, M=Manual).
 * Deterministic per date so the demo stays stable across renders.
 *
 * @param {string} date    The DOS date string used as the hash seed.
 * @param {boolean} hasDoc Whether the record has any document on file.
 *                         When false, 'D' is excluded — a DOS cannot be
 *                         document-sourced if the row has no document.
 */
export function dosSourceLetter(date, hasDoc = true) {
  let h = 0;
  const s = String(date || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  const pool = hasDoc ? DOS_SOURCES : DOS_SOURCES_NO_DOC;
  return pool[Math.abs(h) % pool.length];
}

// What each DOS-source letter means — drives the badge colour + the hover
// tooltip (source of the encounter) and the filter option labels.
export const DOS_SOURCE_META = {
  D: { cls: 'srcDoc',    label: 'Clinical Document', hint: 'Extracted from an uploaded document' },
  C: { cls: 'srcClaims', label: 'Claims',            hint: 'Claims document from Astrana' },
  M: { cls: 'srcManual', label: 'Manual Entry',      hint: 'Added manually by a coder' },
};

// Canonical DOS Source filter labels, in D/C/M order.
export const DOS_SOURCE_LABELS = DOS_SOURCES.map(l => DOS_SOURCE_META[l].label);

// Reverse map: filter label → the source letter it represents.
export const DOS_SOURCE_LABEL_TO_LETTER = Object.fromEntries(
  DOS_SOURCES.map(l => [DOS_SOURCE_META[l].label, l]),
);
