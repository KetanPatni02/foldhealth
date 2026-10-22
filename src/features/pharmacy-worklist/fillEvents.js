import { addDaysMdy, parseMdy } from './pharmacyWorklist.utils';

// Fill events that ripple through a pharmacy member's record when someone
// confirms a fill (Outreach outcome or Pharmacy Verification). Last Fill stays
// the claims date; the confirmed fill goes to each active medication's Recent
// Fill, which then drives its next fill, the gap's Next Fill Due and the
// projected PDC (recomputeMeasure). A refill-history row marked as
// call-confirmed records it until the claim shows up.

const earliest = (dates) => dates.reduce((min, d) => (!min || parseMdy(d) < parseMdy(min) ? d : min), null);
const later = (a, b) => (!b ? a : !a ? b : parseMdy(b) > parseMdy(a) ? b : a);
const DAY = 86_400_000;

// The date a medication's current supply counts from: its claims last fill,
// or a more recent confirmed fill.
export const effectiveFill = (d) => later(d.lastFill, d.recentFill);

// Projected PDC for the measure year: share of days from the first fill of the
// year to Dec 31 covered by the known fills (claims plus recent fills),
// counting each medication's early refills from the end of its prior supply.
export function projectedPdc(x) {
  const year = Number((x.failDate || '').slice(6)) || new Date().getFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const yearEnd = Date.UTC(year, 11, 31);
  const meds = (x.medications || []).filter(d => d.status !== 'Discontinued');
  const fillsOf = (d) => [
    ...(d.refills || []).filter(r => !r.source).map(r => ({ at: parseMdy(r.date), ds: r.daysSupply || d.daysSupply })),
    ...(d.recentFill ? [{ at: parseMdy(d.recentFill), ds: d.daysSupply }] : []),
  ].filter(f => f.at != null && f.at <= yearEnd).sort((a, b) => a.at - b.at);
  const all = meds.flatMap(fillsOf).filter(f => f.at >= yearStart);
  if (!all.length) return null;
  const start = Math.min(...all.map(f => f.at));
  const covered = new Set();
  for (const d of meds) {
    let supplyEnd = -Infinity;
    for (const f of fillsOf(d)) {
      const s = Math.max(f.at, supplyEnd);
      const e = s + f.ds * DAY;
      for (let t = Math.max(s, start); t < Math.min(e, yearEnd + DAY); t += DAY) covered.add(t);
      supplyEnd = e;
    }
  }
  return Math.round((covered.size / ((yearEnd - start) / DAY + 1)) * 100);
}

// Re-derive everything that follows from the fill dates: each medication's
// next fill, the gap's Next Fill Due, and (once a recent fill exists) the
// projected PDC.
export function recomputeMeasure(x) {
  const medications = x.medications.map(d => ({ ...d, nextFill: addDaysMdy(effectiveFill(d), d.daysSupply) }));
  const active = medications.filter(d => d.status !== 'Discontinued');
  const hasRecent = active.some(d => d.recentFill);
  const next = { ...x, medications, nextFillDue: earliest(active.map(d => d.nextFill)) || x.nextFillDue };
  return { ...next, pdcProjected: hasRecent ? projectedPdc(next) : null };
}

// Set (or clear, with null) Recent Fill on one medication or, without
// `medId`, on every active medication of the gap.
export function withRecentFill(x, date, source, medId = null) {
  return recomputeMeasure({
    ...x,
    medications: x.medications.map(d => ((medId ? d.id === medId : d.status !== 'Discontinued')
      ? { ...d, recentFill: date || null, recentFillSource: date ? source : null }
      : d)),
  });
}

export function applyPickup(member, codes, date, source) {
  const changes = [];
  const measures = member.measures.map(x => {
    if (!codes.includes(x.code)) return x;
    const medications = x.medications.map(d => {
      if (d.status === 'Discontinued' || parseMdy(date) <= parseMdy(effectiveFill(d))) return d;
      changes.push(`${x.code} ${d.name}: recent fill ${date}, next fill ${addDaysMdy(date, d.daysSupply)}`);
      return {
        ...d,
        recentFill: date,
        recentFillSource: { outcome: source, date, manual: false },
        refills: [{
          date, qty: d.qty, daysSupply: d.daysSupply,
          pharmacy: d.pharmacy?.name, prescriber: d.prescriber?.name,
          prescriberAddress: d.refills?.[0]?.prescriberAddress || '',
          source,
        }, ...(d.refills || [])],
      };
    });
    return recomputeMeasure({ ...x, pickupConfirmed: date, pendingPickupSince: null, medications });
  });
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

export function applyRecentFill(member, codes, date, outcome) {
  return member.measures.map(x => (codes.includes(x.code)
    ? withRecentFill(x, date, { outcome, date, manual: false })
    : x));
}
