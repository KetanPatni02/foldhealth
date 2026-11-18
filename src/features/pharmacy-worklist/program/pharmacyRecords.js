import { parseLocalDate } from '../../../lib/localDate';
import { MEASURE_NAMES, MEASURE_ORDER } from '../pharmacyWorklist.utils';

// The member's saved Assessments and outreaches (call history) as records for
// the Assessments tab and the PDF downloads (Suresh).

export const isAssessment = (c) => c.kind === 'pharmacy-verification';

const newestFirst = (a, b) => (parseLocalDate(b.date) || 0) - (parseLocalDate(a.date) || 0);
const touches = (c, codes) => !codes || !c.measures?.length || c.measures.some(code => codes.has(code));

// `codes`: a Set of gap codes to keep (the drawer's picked gaps); all when null.
export const assessmentRecords = (member, codes = null) =>
  (member?.callHistory || []).filter(c => isAssessment(c) && touches(c, codes)).toSorted(newestFirst);

export const outreachRecords = (member, codes = null) =>
  (member?.callHistory || []).filter(c => !isAssessment(c) && touches(c, codes)).toSorted(newestFirst);

// An Assessment's steps grouped by gap, in MAC, MAD, MAH order: what the
// consolidated note shows under each gap. Gaps with nothing ticked say so.
export function stepsByGap(record) {
  const outcomes = record.outcomes || {};
  // Assessments saved before the schema form kept per-drug answers instead.
  const legacy = (code) => (record.items || []).filter(it => it.measure === code).flatMap(it => it.steps || []);
  const codes = (record.measures?.length ? record.measures : Object.keys(outcomes))
    .toSorted((a, b) => MEASURE_ORDER.indexOf(a) - MEASURE_ORDER.indexOf(b));
  return codes.map(code => ({
    code,
    name: MEASURE_NAMES[code] || code,
    steps: outcomes[code]?.length ? outcomes[code] : legacy(code),
  }));
}

// "Pharmacy: CVS Pharmacy #3301 · Telephonic, Outbound · Reached".
export function assessmentContactLine(r) {
  const how = [r.action, r.direction].filter(Boolean).join(', ');
  const reached = !r.contactOutcome || r.contactOutcome === 'Reached' ? 'Reached' : r.contactOutcome;
  return [`${r.party || 'Pharmacy'}: ${r.contact || '-'}`, how, reached].filter(Boolean).join(' · ');
}

// The audit evidence an outreach can carry (Session 7): label and value,
// only the ones it has.
const EVIDENCE = [
  ['pickupDate', 'Pickup date'],
  ['discussion', 'Discussed'],
  ['barriers', 'Barriers'],
  ['transcript', 'Call transcript'],
];
export const outreachEvidence = (c) => EVIDENCE
  .map(([k, label]) => [label, Array.isArray(c[k]) ? c[k].join(', ') : c[k]])
  .filter(([, v]) => v);
