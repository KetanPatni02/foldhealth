// Date-only values ("2026-10-11": Postgres `date` columns, picker output,
// text fields holding a calendar day) are not instants. `new Date()` reads a
// bare YYYY-MM-DD as UTC midnight, so every browser west of UTC shows the
// previous day. Parse those as local midnight instead; anything else (real
// timestamps, Date objects, MM/DD/YYYY) goes through `new Date()` unchanged.

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A Date for `value`, or null when it's empty or unparseable. */
export function parseLocalDate(value) {
  if (value == null || value === '') return null;
  const m = DATE_ONLY_RE.exec(String(value).trim());
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Epoch ms for `value` (see parseLocalDate), or NaN. */
export function localDateMs(value) {
  return parseLocalDate(value)?.getTime() ?? NaN;
}
