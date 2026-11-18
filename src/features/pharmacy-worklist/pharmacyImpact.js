import { MEASURE_NAMES, MEASURE_ORDER, parseMdy } from './pharmacyWorklist.utils';

// Fold Impact reports (Ajay, Phase 6): which patients Fold saved, through
// which outreach, after which escalation, and what that is worth on the star
// rating. Read from the worklist as stored, like the other pharmacy reports.

// A gap counts as saved once it is Closed or Met for Year.
export const SAVED_STATUSES = ['Closed', 'Met for Year'];
const isSaved = (g) => SAVED_STATUSES.includes(g.status?.gap);

// The date a gap was saved: the pickup Fold confirmed, else its newest fill.
export function savedOn(g) {
  if (g.pickupConfirmed) return g.pickupConfirmed;
  const fills = (g.medications || []).flatMap(d => [d.recentFill, d.lastFill]).filter(Boolean);
  return fills.toSorted((a, b) => (parseMdy(b) ?? 0) - (parseMdy(a) ?? 0))[0] || null;
}

// The outreach a touch was, for the channel breakdown.
export function channelOf(c) {
  if (c.kind === 'pharmacy-verification') return 'Assessment call';
  const t = String(c.type || c.mode || 'Call');
  if (/sms|text/i.test(t)) return 'SMS';
  if (/email|letter|mail|fax/i.test(t)) return 'Letter or email';
  return 'Call';
}
export const CHANNELS = ['Call', 'Assessment call', 'SMS', 'Letter or email'];

// Fold's last successful touch on a gap on or before `by`: an outreach that
// reached someone, or a saved Assessment.
function lastTouch(m, code, by) {
  const until = parseMdy(by);
  return (m.callHistory || [])
    .filter(c => (c.result === 'success' || c.locked) && (!c.measures?.length || c.measures.includes(code)) && (until == null || (parseMdy(c.date) ?? 0) <= until))
    .toSorted((a, b) => (parseMdy(b.date) ?? 0) - (parseMdy(a.date) ?? 0))[0] || null;
}

// Gaps saved with Fold's help: saved, with a Fold touch on or before the
// day it was saved. `enriched`: reportMembers(...).
export function savedGaps(enriched) {
  const rows = [];
  for (const m of enriched) {
    for (const g of m.gaps) {
      if (!isSaved(g)) continue;
      const on = savedOn(g);
      const touch = lastTouch(m, g.code, on);
      if (!touch) continue;
      rows.push({ memberId: m.id, member: m.name, code: g.code, status: g.status.gap, savedOn: on, channel: channelOf(touch), touchDate: touch.date, by: touch.by || null });
    }
  }
  return rows.toSorted((a, b) => (parseMdy(b.savedOn) ?? 0) - (parseMdy(a.savedOn) ?? 0));
}

// How late an alert was: days left before the gap fails, or overdue.
export function lateness(daysLeft) {
  if (daysLeft == null) return 'Not recorded';
  if (daysLeft < 0) return `${-daysLeft} days overdue`;
  if (daysLeft <= 5) return '5 days left or less';
  if (daysLeft <= 15) return '6 to 15 days left';
  return 'More than 15 days left';
}

// Gaps acted on after a deadline alert (Phase 5): the alert was Accepted or
// Approved, with whether the gap is now saved. `alertOutcomes` keeps the days
// left when the outcome was set.
export function escalationSaves(enriched) {
  const rows = [];
  for (const m of enriched) {
    for (const [key, o] of Object.entries(m.alertOutcomes || {})) {
      if (!['Accepted', 'Approved'].includes(o.outcome)) continue;
      const [code, kind] = key.split('|');
      const g = m.gaps.find(x => x.code === code);
      if (!g) continue;
      rows.push({ memberId: m.id, member: m.name, code, kind, outcome: o.outcome, by: o.by, daysLeft: o.daysLeft ?? null, when: lateness(o.daysLeft), saved: isSaved(g) });
    }
  }
  return rows;
}

// Star cut points per measure, lowest rate for each star. A sample until
// Tahira and Monique agree on the year's published cut points.
export const SAMPLE_CUT_POINTS = {
  MAC: [[5, 91], [4, 88], [3, 85], [2, 80], [1, 0]],
  MAD: [[5, 91], [4, 87], [3, 84], [2, 79], [1, 0]],
  MAH: [[5, 92], [4, 89], [3, 86], [2, 81], [1, 0]],
};
export const starsFor = (code, rate, cuts = SAMPLE_CUT_POINTS) => (rate == null ? null : (cuts[code] || []).find(([, min]) => rate >= min)?.[0] ?? null);

// Per measure: the adherence rate (gaps saved or at 80% and up, of gaps
// counted), the rate without the gaps Fold saved, and the stars of each.
export function starContribution(enriched, saved = savedGaps(enriched), cuts = SAMPLE_CUT_POINTS) {
  return MEASURE_ORDER.map(code => {
    const gaps = enriched.flatMap(m => m.gaps.filter(g => g.code === code && g.status?.gap !== 'Excluded'));
    if (!gaps.length) return null;
    const adherent = gaps.filter(g => isSaved(g) || (g.pdc != null && g.pdc >= 80 && g.status?.gap !== 'Failed for Year')).length;
    const foldSaved = saved.filter(r => r.code === code).length;
    const rate = Math.round((adherent / gaps.length) * 1000) / 10;
    const without = Math.round(((adherent - foldSaved) / gaps.length) * 1000) / 10;
    return {
      code, name: MEASURE_NAMES[code], gaps: gaps.length, adherent, foldSaved,
      rate, without, lift: Math.round((rate - without) * 10) / 10,
      stars: starsFor(code, rate, cuts), starsWithout: starsFor(code, without, cuts),
    };
  }).filter(Boolean);
}
