import { addDaysMdy, parseMdy } from './pharmacyWorklist.utils';

// Fill events that ripple through a pharmacy member's record.
//
// Two kinds of fill live in each medication's refill history: claims (no
// `source`) and fills confirmed in Fold (`source` set: a pickup confirmed by
// call or verification, a refill approval, or a date entered by hand). Last
// Fill stays the claims date. Recent Fill is the latest confirmed fill.
//
// One shifted supply schedule (supplySchedule) drives both each drug's next
// fill and the projected PDC, so the two always agree: an early refill
// starts when the prior supply runs out, and a confirmed fill that is the
// same fill as a claim (claim dated 7 days before to 3 days after it) is not
// counted twice.

const earliest = (dates) => dates.reduce((min, d) => (!min || parseMdy(d) < parseMdy(min) ? d : min), null);
const later = (a, b) => (!b ? a : !a ? b : parseMdy(b) > parseMdy(a) ? b : a);
const DAY = 86_400_000;
const SAME_FILL_BEFORE_DAYS = 7;
const SAME_FILL_AFTER_DAYS = 3;
const pad2 = (n) => String(n).padStart(2, '0');
const fmt = (t) => { const d = new Date(t); return `${pad2(d.getUTCMonth() + 1)}/${pad2(d.getUTCDate())}/${d.getUTCFullYear()}`; };

const confirmedFills = (d) => (d.refills || []).filter(r => r.source);
const latestConfirmed = (d) => confirmedFills(d).reduce((best, r) => (!best || parseMdy(r.date) > parseMdy(best.date) ? r : best), null);

// The latest fill on record, claims or confirmed. Automations only add a
// confirmed fill that is newer than this.
export const effectiveFill = (d) => later(d.lastFill, latestConfirmed(d)?.date);

// Claims plus confirmed fills, minus confirmed fills that duplicate a claim
// or each other, oldest first.
function countedFills(d) {
  const claims = (d.refills || []).filter(r => !r.source && parseMdy(r.date) != null);
  const claimAt = claims.map(r => parseMdy(r.date));
  const seen = new Set();
  const confirmed = confirmedFills(d).filter(r => {
    const at = parseMdy(r.date);
    if (at == null || seen.has(at)) return false;
    seen.add(at);
    return !claimAt.some(c => c >= at - SAME_FILL_BEFORE_DAYS * DAY && c <= at + SAME_FILL_AFTER_DAYS * DAY);
  });
  return [...claims, ...confirmed]
    .map(r => ({ at: parseMdy(r.date), ds: r.daysSupply || d.daysSupply }))
    .sort((a, b) => a.at - b.at);
}

// Supply intervals [start, end) with each refill shifted past the prior supply.
function supplySchedule(d) {
  let supplyEnd = -Infinity;
  return countedFills(d).map(f => {
    const start = Math.max(f.at, supplyEnd);
    supplyEnd = start + f.ds * DAY;
    return { start, end: supplyEnd };
  });
}

// Projected PDC for the measure year: days from the first fill of the year to
// Dec 31 covered by the schedule of every drug in the measure. A drug
// discontinued later still covered the days it was dispensed for.
export function projectedPdc(x) {
  const year = Number((x.failDate || '').slice(6)) || new Date().getFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const yearEnd = Date.UTC(year, 11, 31);
  const intervals = (x.medications || []).flatMap(supplySchedule).filter(i => i.end > yearStart && i.start <= yearEnd);
  if (!intervals.length) return null;
  const start = Math.max(yearStart, Math.min(...intervals.map(i => i.start)));
  const covered = new Set();
  for (const i of intervals) {
    for (let t = Math.max(i.start, start); t < Math.min(i.end, yearEnd + DAY); t += DAY) covered.add(t);
  }
  return Math.round((covered.size / ((yearEnd - start) / DAY + 1)) * 100);
}

// Re-derive everything that follows from the fills: each drug's Recent Fill
// and next fill, the gap's Next Fill Due (active drugs), and, once a drug
// has a confirmed fill, the projected PDC. Run after any fill or medication
// change.
export function recomputeMeasure(x) {
  const medications = x.medications.map(d => {
    const recent = latestConfirmed(d);
    const schedule = supplySchedule(d);
    const nextFill = schedule.length ? fmt(schedule[schedule.length - 1].end) : addDaysMdy(d.lastFill, d.daysSupply);
    return {
      ...d,
      nextFill,
      recentFill: recent?.date || null,
      recentFillSource: recent ? { outcome: recent.source, date: recent.enteredOn || recent.date, manual: !!recent.manual } : null,
    };
  });
  const active = medications.filter(d => d.status !== 'Discontinued');
  const hasConfirmed = active.some(d => d.recentFill);
  const next = { ...x, medications, nextFillDue: earliest(active.map(d => d.nextFill)) || x.nextFillDue };
  return { ...next, pdcProjected: hasConfirmed ? projectedPdc(next) : null };
}

const fillRow = (d, date, source, extra = {}) => ({
  date, qty: d.qty, daysSupply: d.daysSupply,
  pharmacy: d.pharmacy?.name, prescriber: d.prescriber?.name,
  prescriberAddress: d.refills?.[0]?.prescriberAddress || '',
  source, ...extra,
});

// Add a confirmed fill to every active drug of the gap whose latest fill is
// older than `date`; drugs already filled on or after it are left alone.
function addConfirmedFill(x, date, source, changes) {
  const medications = x.medications.map(d => {
    if (d.status === 'Discontinued' || parseMdy(date) <= parseMdy(effectiveFill(d))) return d;
    changes?.push(`${x.code} ${d.name}: recent fill ${date}`);
    return { ...d, refills: [fillRow(d, date, source), ...(d.refills || [])] };
  });
  return recomputeMeasure({ ...x, medications });
}

// A date entered by hand replaces the drug's latest confirmed fill (or adds
// one); an empty date removes it. No newer-date check: the user may correct
// a fill to an earlier day.
export function withManualRecentFill(x, medId, date) {
  const enteredOn = fmt(Date.now());
  return recomputeMeasure({
    ...x,
    medications: x.medications.map(d => {
      if (d.id !== medId) return d;
      const latest = latestConfirmed(d);
      const others = (d.refills || []).filter(r => r !== latest);
      if (!date) return { ...d, refills: others };
      return { ...d, refills: [fillRow(d, date, latest?.source || 'Entered by hand', { manual: true, enteredOn }), ...others] };
    }),
  });
}

export function applyPickup(member, codes, date, source) {
  const changes = [];
  const measures = member.measures.map(x => (codes.includes(x.code)
    ? { ...addConfirmedFill(x, date, source, changes), pickupConfirmed: date, pendingPickupSince: null }
    : x));
  return { measures, changes };
}

export function applyPendingPickup(member, codes, date) {
  return member.measures.map(x => (codes.includes(x.code) ? { ...x, pendingPickupSince: date } : x));
}

// Outcome text → fill event. Covers the schema's pickup outcomes
// ("Confirmed medication pickup", "…pickup date") and "Pending — Pick up".
export function fillEventFor(outcome) {
  const o = (outcome || '').toLowerCase();
  if (o.includes('confirmed medication pickup')) return 'pickup';
  if (o.includes('pending — pick up')) return 'pending-pickup';
  return null;
}

// Outcomes that mean the medication was just filled; the outreach date
// becomes the gap's Recent Fill Date (editable later in Gap Closure).
export function setsRecentFill(outcome) {
  const o = (outcome || '').toLowerCase();
  return o.includes('confirmed medication pickup') || o.includes('refill approval received');
}

// Recent-fill outcomes ("Confirmed medication pickup", "Refill approval
// received"): add the confirmed fill to the listed gaps, newer dates only.
export function applyRecentFill(member, codes, date, outcome, changes) {
  return member.measures.map(x => (codes.includes(x.code) ? addConfirmedFill(x, date, outcome, changes) : x));
}
