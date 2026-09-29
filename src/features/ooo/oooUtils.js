/**
 * Out of Office (OOO) records: statuses, formatting and the edit-diff rules.
 *
 * A record is { id, userId, userName, userEmail, userRole, startAt, endAt,
 * reason, autoReply, autoReplyMessage, createdBy, createdAt, updatedAt },
 * with startAt / endAt as ISO strings. Users are matched by name, the same
 * key appointments use for their provider (`primary_user`).
 */

export const OOO_ICON = 'solar:square-arrow-right-linear';
export const DEFAULT_AUTO_REPLY = 'Hi! Thanks for reaching out. I\'m currently unavailable but will get back to you as soon as I can.';

const toMs = (v) => (v instanceof Date ? v.getTime() : new Date(v).getTime());

/** 'Upcoming' | 'Ongoing' | 'Past' at `now`. */
export function oooStatus(record, now = new Date()) {
  const t = toMs(now);
  if (toMs(record.endAt) <= t) return 'Past';
  if (toMs(record.startAt) <= t) return 'Ongoing';
  return 'Upcoming';
}

export const STATUS_TONE = { Upcoming: 'success', Ongoing: 'primary', Past: 'grey' };

/** Past records are read-only; an ongoing one can be edited but not deleted. */
export const canEdit = (record, now) => oooStatus(record, now) !== 'Past';
export const canDelete = (record, now) => oooStatus(record, now) === 'Upcoming';

const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

export const recordsFor = (records, userName) => (records || []).filter(r => sameName(r.userName, userName));

/** The record a user is out on right now, if any. */
export function activeOooFor(records, userName, now = new Date()) {
  if (!userName) return null;
  return (records || []).find(r => sameName(r.userName, userName) && oooStatus(r, now) === 'Ongoing') || null;
}

/** Local-day bounds of an ISO date ("2026-09-08"). */
function dayBounds(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return [new Date(y, m - 1, d).getTime(), new Date(y, m - 1, d + 1).getTime()];
}

/** Records that overlap any part of the local day `isoDate`. */
export function recordsOnDate(records, isoDate) {
  const [from, to] = dayBounds(isoDate);
  return (records || []).filter(r => toMs(r.startAt) < to && toMs(r.endAt) > from);
}

/**
 * The part of a record inside the local day `isoDate`, as fractions of the
 * day (0–1), or null when it doesn't touch that day. For drawing the block
 * in Day / Week views.
 */
export function daySpan(record, isoDate) {
  const [from, to] = dayBounds(isoDate);
  const s = Math.max(from, toMs(record.startAt));
  const e = Math.min(to, toMs(record.endAt));
  if (e <= s) return null;
  return { start: (s - from) / (to - from), end: (e - from) / (to - from) };
}

const pad = (n) => String(n).padStart(2, '0');

/** "09/11/2026" */
export function formatDate(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

/** "09/11/2026, 02:00AM" */
export function formatDateTime(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours() % 12 || 12;
  return `${formatDate(d)}, ${pad(h)}:${pad(d.getMinutes())}${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/** ISO ↔ DateTimePicker's value, "MM/DD/YYYY, HH:MM" (local, 24-hour). */
export function toPickerValue(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${formatDate(d)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fromPickerValue(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}), (\d{1,2}):(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  return new Date(+m[3], +m[1] - 1, +m[2], +m[4], +m[5]).toISOString();
}

/**
 * How an edit changes the dates: `reduced` when some previously covered
 * time is no longer out of office (its appointments can be restored),
 * `extended` when new time is added (its appointments need reassigning).
 * Both can be true (e.g. the start moves later and the end moves later).
 */
export function rangeChange(original, next) {
  if (!original || !next?.startAt || !next?.endAt) return { reduced: false, extended: false };
  const os = toMs(original.startAt), oe = toMs(original.endAt);
  const ns = toMs(next.startAt), ne = toMs(next.endAt);
  return {
    reduced: ns > os || ne < oe,
    extended: ns < os || ne > oe,
  };
}

/**
 * Form problems, keyed by field. A record may start today (it's out of
 * office from now) but not on an earlier day, and must end after it starts.
 */
export function validateOoo(values, { now = new Date(), original = null } = {}) {
  const errors = {};
  const s = values.startAt ? toMs(values.startAt) : NaN;
  const e = values.endAt ? toMs(values.endAt) : NaN;
  if (Number.isNaN(s)) errors.startAt = 'Pick a start date and time.';
  if (Number.isNaN(e)) errors.endAt = 'Pick an end date and time.';
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  // An ongoing record keeps its start in the past.
  const startLocked = original && toMs(original.startAt) <= toMs(now) && s === toMs(original.startAt);
  if (!errors.startAt && !startLocked && s < today.getTime()) errors.startAt = 'Start can\'t be before today.';
  if (!errors.startAt && !errors.endAt && e <= s) errors.endAt = 'End must be after the start.';
  if (!errors.endAt && e <= toMs(now)) errors.endAt = 'End must be in the future.';
  if (values.autoReply && !String(values.autoReplyMessage || '').trim()) errors.autoReplyMessage = 'Add an auto reply message.';
  return errors;
}

/** Sort: ongoing, then upcoming (soonest first), then past (latest first). */
export function sortRecords(records, now = new Date()) {
  const rank = { Ongoing: 0, Upcoming: 1, Past: 2 };
  return [...(records || [])].sort((a, b) => {
    const ra = rank[oooStatus(a, now)], rb = rank[oooStatus(b, now)];
    if (ra !== rb) return ra - rb;
    return ra === 2 ? toMs(b.startAt) - toMs(a.startAt) : toMs(a.startAt) - toMs(b.startAt);
  });
}

export const initialsOf = (name) => String(name || '?').trim().split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
