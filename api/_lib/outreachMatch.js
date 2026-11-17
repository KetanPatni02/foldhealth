// Matching the records an outreach summary mentions against the patient's
// own open HCCs, ICDs and DOSs (outreach-summary, pcp-outreach-split). The
// model only reports what was mentioned; whether it matches a record is
// decided here, from the data, never by the model.

const norm = (v) => String(v ?? '').trim().toUpperCase();

/** "HCC 18", "hcc18", "18" → "HCC 18" */
export function normalizeHcc(v) {
  const m = /(\d+)/.exec(String(v ?? ''));
  return m ? `HCC ${Number(m[1])}` : norm(v);
}

/** "e11.9", "E119" → "E11.9" (dot after the third character) */
export function normalizeIcd(v) {
  const s = norm(v).replace(/[^A-Z0-9]/g, '');
  return s.length > 3 ? `${s.slice(0, 3)}.${s.slice(3)}` : s;
}

/** "8/26/2026", "2026-08-26", "08/26/26" → "08/26/2026", or '' */
export function normalizeDate(v) {
  const s = String(v ?? '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return `${m[2].padStart(2, '0')}/${m[3].padStart(2, '0')}/${m[1]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${y}`;
  }
  return '';
}

/**
 * Patient records as lookup sets.
 * @param {{ hccs?: string[], icds?: string[], dos?: string[] }} records
 */
export function recordIndex(records = {}) {
  return {
    HCC: new Set((records.hccs || []).map(normalizeHcc)),
    ICD: new Set((records.icds || []).map(normalizeIcd)),
    DOS: new Set((records.dos || []).map(normalizeDate).filter(Boolean)),
  };
}

const NORMALIZE = { HCC: normalizeHcc, ICD: normalizeIcd, DOS: normalizeDate };

/**
 * The model's patient actions with each reference normalized and marked
 * matched (it is one of this patient's records) or not. Unknown reference
 * types and empty ids are dropped. With `allowDos` false (no DOS context),
 * DOS references are dropped.
 */
export function matchActions(actions, records, { allowDos = true } = {}) {
  const index = recordIndex(records);
  return (Array.isArray(actions) ? actions : [])
    .filter(a => a && typeof a.text === 'string' && a.text.trim())
    .map(a => ({
      text: a.text.trim(),
      refs: (Array.isArray(a.refs) ? a.refs : [])
        .filter(r => r && NORMALIZE[r.type] && (allowDos || r.type !== 'DOS'))
        .map(r => {
          const id = NORMALIZE[r.type](r.id);
          return id ? { type: r.type, id, matched: index[r.type].has(id) } : null;
        })
        .filter(Boolean),
    }));
}
