import { addDaysMdy, annotateClaims, confirmedFills, latestConfirmedFill as latestConfirmed, matchFill, parseMdy } from './pharmacyWorklist.utils';

// Fill events that ripple through a pharmacy member's record.
//
// Two kinds of fill live in each medication's refill history: claims (no
// `source`) and fills confirmed in Fold (`source` set: a pickup confirmed by
// call or verification, a refill approval, or a date entered by hand). Last
// Fill stays the claims date. Recent Fill is the latest confirmed fill.
//
// One shifted supply schedule (supplySchedule) drives each drug's next fill,
// the projected PDC and the projected fail date, so they always agree: an
// early refill starts when the prior supply runs out. Only claims that count
// (current version, paid, Part D, not reversed: see annotateClaims) are
// fills. A confirmed fill is not counted again once its claim matches, nor
// when its claim was reversed or billed to other coverage.

const earliest = (dates) => dates.reduce((min, d) => (!min || parseMdy(d) < parseMdy(min) ? d : min), null);
const later = (a, b) => (!b ? a : !a ? b : parseMdy(b) > parseMdy(a) ? b : a);
const DAY = 86_400_000;
// The measure threshold: 80% of the days from the first fill to Dec 31.
const PDC_TARGET = 0.8;
const pad2 = (n) => String(n).padStart(2, '0');
const fmt = (t) => { const d = new Date(t); return `${pad2(d.getUTCMonth() + 1)}/${pad2(d.getUTCDate())}/${d.getUTCFullYear()}`; };

// The latest fill on record, claims or confirmed. Automations only add a
// confirmed fill that is newer than this.
export const effectiveFill = (d) => later(d.lastFill, latestConfirmed(d)?.date);

// Counting claims plus confirmed fills still waiting for theirs (or never
// matched with no claim at all), oldest first.
function countedFills(d) {
  const all = annotateClaims(d.refills);
  const claims = all.filter(c => c.counts && parseMdy(c.date) != null);
  const seen = new Set();
  const confirmed = confirmedFills(d).filter(r => {
    const at = parseMdy(r.date);
    if (at == null || seen.has(at)) return false;
    seen.add(at);
    const { kind } = matchFill(r, all);
    return kind === 'pending' || kind === 'no-claim';
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

// Days of the measure year covered by the schedule of every drug in the
// measure, from the first fill of the year to Dec 31. A drug discontinued
// later still covered the days it was dispensed for.
function yearCoverage(x) {
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
  const coverEnd = Math.min(Math.max(...intervals.map(i => i.end)), yearEnd + DAY);
  return { start, yearEnd, covered, coverEnd, days: (yearEnd - start) / DAY + 1 };
}

// Projected PDC for the measure year.
export function projectedPdc(x) {
  const c = yearCoverage(x);
  return c ? Math.round((c.covered.size / c.days) * 100) : null;
}

// Projected absolute fail date: the last day the member can be without
// medication and still reach 80% if they never miss again. Null when the
// fills on record already reach 80% for the year.
export function projectedFailDate(x) {
  const c = yearCoverage(x);
  if (!c) return null;
  const allowedMiss = Math.floor(c.days * (1 - PDC_TARGET));
  const missedBeforeEnd = (c.coverEnd - c.start) / DAY - c.covered.size;
  const t = c.coverEnd + (allowedMiss - missedBeforeEnd) * DAY;
  return t > c.yearEnd ? null : fmt(t);
}

// Fills of the gap's usual days supply still needed to reach 80% by Dec 31.
export function fillsToStayCompliant(x) {
  const c = yearCoverage(x);
  if (!c) return null;
  const need = Math.ceil(c.days * PDC_TARGET) - c.covered.size;
  if (need <= 0) return 0;
  const ds = Math.max(0, ...(x.medications || []).filter(d => d.status !== 'Discontinued').map(d => d.daysSupply || 0));
  return ds ? Math.ceil(need / ds) : null;
}

// Re-derive everything that follows from the fills: each drug's Recent Fill
// and next fill, the gap's Next Fill Due (active drugs), and, once a drug
// has a confirmed fill, the projected PDC and fail date. Run after any fill,
// claim or medication change.
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
  // A fill confirmed in Fold moves PDC and the fail date; both stay
  // projected until its claim matches.
  return {
    ...next,
    pdcProjected: hasConfirmed ? projectedPdc(next) : null,
    failDateProjected: hasConfirmed ? projectedFailDate(next) : null,
  };
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
