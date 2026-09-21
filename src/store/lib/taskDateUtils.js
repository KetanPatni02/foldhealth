// Accept both the canonical MM-DD-YYYY and legacy ISO YYYY-MM-DD (and
// MM/DD/YYYY) so isPastDate flags overdue rows regardless of stored shape.
export function parseTaskDateStr(str) {
  if (!str || typeof str !== 'string') return null;
  let y, m, d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    [y, m, d] = str.split('-').map(Number);
  } else if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(str)) {
    [m, d, y] = str.split(/[-/]/).map(Number);
  } else {
    return null;
  }
  if ([y, m, d].some(n => Number.isNaN(n))) return null;
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isPastDate(str) {
  const d = parseTaskDateStr(str);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export function parseDuration(str) {
  const parts = (str || '00:00').split(':').map(Number);
  return parts[0] * 60 + (parts[1] || 0);
}

export function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
