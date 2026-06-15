/* ─── Excel date helper ──────────────────────────────────────────────────── */
export function parseXlsxDate(val) {
  if (val instanceof Date) {
    const y = val.getUTCFullYear(), m = String(val.getUTCMonth()+1).padStart(2,'0'), d = String(val.getUTCDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number' && val > 1000) {
    // Excel serial → JS Date (Excel epoch: Dec 30 1899)
    const dt = new Date(Math.round((val - 25569) * 86400 * 1000));
    const y = dt.getUTCFullYear(), m = String(dt.getUTCMonth()+1).padStart(2,'0'), d = String(dt.getUTCDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  return String(val || '').trim();
}

/* ─── Age formatter ─────────────────────────────────────────────────────── */
export function fmtAge(dob) {
  if (!dob) return '';
  const b = new Date(dob);
  if (isNaN(b)) return '';
  const now = new Date();
  const age = now.getFullYear() - b.getFullYear() - (now < new Date(now.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
  const m = String(b.getMonth()+1).padStart(2,'0'), d = String(b.getDate()).padStart(2,'0');
  return `${age}Y(${m}/${d}/${b.getFullYear()})`;
}
