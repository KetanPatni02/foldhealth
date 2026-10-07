/**
 * Reassignment planning: which of a provider's appointments are in scope,
 * how they group by department (the appointment's practice location), who
 * can cover each department, and what a plan adds up to. Pure functions,
 * shared by the Reassign Appointments drawer and the job that runs a plan.
 *
 * A plan maps appointment id → { action: 'reassign', to: userName } or
 * { action: 'cancel' }; anything not in it is left as is.
 */
import { apptPerson, personOf, recordPerson, sameName, samePerson } from './oooUtils';

export const NO_DEPARTMENT = 'No Department';

const toMs = (v) => (v instanceof Date ? v.getTime() : new Date(v).getTime());

// "10-02-2026" + "9:30 am" → that local moment (ms), or NaN.
function at(date, time) {
  const d = /^(\d{2})-(\d{2})-(\d{4})$/.exec(date || '');
  const t = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(String(time || '').trim());
  if (!d || !t) return NaN;
  const h = (Number(t[1]) % 12) + (t[3].toLowerCase() === 'pm' ? 12 : 0);
  return new Date(+d[3], +d[1] - 1, +d[2], h, +t[2]).getTime();
}

/** An appointment's start and end (ms); a missing end counts as 30 minutes. */
export function apptSpan(a) {
  const start = at(a?.date, a?.time_start);
  const end = at(a?.date, a?.time_end);
  return { start, end: Number.isNaN(end) || end <= start ? start + 30 * 60000 : end };
}

/**
 * The time a reassignment covers: an Out of Office record's dates, a
 * one-time start and end, or (permanent) from now on.
 */
export function reassignWindow({ type, record, startAt, endAt }, now = new Date()) {
  if (type === 'permanent') return { from: toMs(now), to: Infinity };
  if (type === 'ooo') return record ? { from: toMs(record.startAt), to: toMs(record.endAt) } : null;
  if (startAt && endAt && toMs(endAt) > toMs(startAt)) return { from: toMs(startAt), to: toMs(endAt) };
  return null;
}

/**
 * The provider's appointments to plan: theirs (an appointment already moved
 * to someone else no longer counts), not cancelled, starting inside the
 * window and not already in the past.
 */
export function scopeAppointments(appointments, fromUser, window, now = new Date()) {
  if (!fromUser || !window || !personOf(fromUser).name && !personOf(fromUser).id) return [];
  const from = Math.max(window.from, toMs(now));
  return (appointments || [])
    .filter((a) => {
      if (a.status === 'Cancelled' || !samePerson(apptPerson(a), fromUser)) return false;
      const { start } = apptSpan(a);
      return start >= from && start < window.to;
    })
    .sort((a, b) => apptSpan(a).start - apptSpan(b).start);
}

/** Appointments by department (location), departments A–Z. */
export function groupByDepartment(appts) {
  const map = new Map();
  (appts || []).forEach((a) => {
    const dept = (a.location || '').trim() || NO_DEPARTMENT;
    if (!map.has(dept)) map.set(dept, []);
    map.get(dept).push(a);
  });
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, list]) => ({ name, appointments: list }));
}

/**
 * Who can cover a department: people who work there (it's in their
 * locations), other than the provider who's away and anyone who is out of
 * office themselves at any point in the window.
 */
export function coveringProviders(dept, users, { awayUser, oooRecords = [], window }) {
  const out = (oooRecords || [])
    .filter(r => window && toMs(r.startAt) < window.to && toMs(r.endAt) > window.from)
    .map(recordPerson);
  return (users || []).filter(u =>
    (u.locations || []).some(l => sameName(l, dept))
    && !samePerson(u, awayUser)
    && !out.some(p => samePerson(u, p)));
}

/**
 * An appointment already on the covering provider's calendar that overlaps
 * this one, if any: the reassignment still goes ahead, flagged as a conflict.
 */
export function findConflict(appt, toUser, appointments) {
  const { start, end } = apptSpan(appt);
  return (appointments || []).find((b) => {
    if (b.id === appt.id || b.status === 'Cancelled' || !samePerson(apptPerson(b), toUser)) return false;
    const s = apptSpan(b);
    return s.start < end && s.end > start;
  }) || null;
}

/** Reassigning / cancelling / no-action counts for the appointments in scope. */
export function tallyPlan(plan, appts) {
  let reassigning = 0;
  let cancelling = 0;
  (appts || []).forEach((a) => {
    const p = plan[a.id];
    if (p?.action === 'reassign') reassigning += 1;
    else if (p?.action === 'cancel') cancelling += 1;
  });
  return { reassigning, cancelling, noAction: (appts || []).length - reassigning - cancelling };
}

/** "10 Appointments (9 Reassigned • 1 Cancelled)" detail for a group. */
export function planDetail(plan, appts) {
  const { reassigning, cancelling } = tallyPlan(plan, appts);
  const n = (appts || []).length;
  if (!reassigning && !cancelling) return '';
  if (reassigning === n) return 'All Reassigned';
  if (cancelling === n) return 'All Cancelled';
  return [reassigning && `${reassigning} Reassigned`, cancelling && `${cancelling} Cancelled`].filter(Boolean).join(' • ');
}

// "10-02-2026" → "10/02/2026"; "9:00 am"–"9:30 am" → "9:00-9:30 AM".
const slash = (d) => String(d || '').replace(/-/g, '/');
function timeRange(start, end) {
  const s = String(start || '').trim().toUpperCase();
  const e = String(end || '').trim().toUpperCase();
  if (!e) return s;
  const [sT, sM] = s.split(' ');
  const [eT, eM] = e.split(' ');
  return sM === eM ? `${sT}-${eT} ${eM}` : `${s}-${e}`;
}

/** "10/02/2026, 9:00-9:30 AM • LTC Initial Evaluation Visit" for an appointment or a job snapshot. */
export function apptLine(a) {
  const date = a.date;
  const start = a.time_start ?? a.timeStart;
  const end = a.time_end ?? a.timeEnd;
  const type = a.appointment_type_name ?? a.type;
  return [`${slash(date)}, ${timeRange(start, end)}`, type].filter(Boolean).join(' • ');
}
