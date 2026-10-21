const DAY_MS = 86_400_000;

// SUPD is out of scope for this worklist.
export const MEASURE_ORDER = ['MAD', 'MAH', 'MAC'];

export const MEASURE_NAMES = {
  MAD: 'Medication Adherence for Diabetes',
  MAH: 'Medication Adherence for Hypertension (RAS antagonists)',
  MAC: 'Medication Adherence for Cholesterol (Statins)',
};

export const medLabel = (d) => `${d.name} ${d.strength} ${d.unit}`;
export const measureDrugs = (x) => (x.medications || []).map(medLabel).join(', ');

export function parseMdy(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s || '');
  return m ? Date.UTC(+m[3], +m[1] - 1, +m[2]) : null;
}

const pad2 = (n) => String(n).padStart(2, '0');
const fmtUtc = (t) => {
  const d = new Date(t);
  return `${pad2(d.getUTCMonth() + 1)}/${pad2(d.getUTCDate())}/${d.getUTCFullYear()}`;
};
export const todayMdy = () => fmtUtc(todayUtc());
export const addDaysMdy = (mdy, days) => fmtUtc(parseMdy(mdy) + days * DAY_MS);

function todayUtc() {
  const d = new Date();
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysFromToday(mdy) {
  const t = parseMdy(mdy);
  return t == null ? null : Math.round((t - todayUtc()) / DAY_MS);
}

// Gaps still being worked. Only these may drive a row's headline numbers:
// a Completed MAD must not paint the row red while MAH is the real gap.
export const OPEN_GAPS = new Set(['Open', 'In Progress']);

// Earliest fail date wins; lower PDC breaks ties. Open gaps compete first,
// then non-excluded measures, then everything.
export function mostUrgentMeasure(measures, statuses) {
  const list = measures || [];
  const open = statuses ? list.filter(x => OPEN_GAPS.has(statuses[x.code]?.gap)) : [];
  const live = list.filter(x => !x.excluded);
  const pool = open.length ? open : live.length ? live : list;
  return pool.toSorted((a, b) => {
    const fa = parseMdy(a.failDate) ?? Infinity;
    const fb = parseMdy(b.failDate) ?? Infinity;
    if (fa !== fb) return fa - fb;
    return (a.pdc ?? 101) - (b.pdc ?? 101);
  })[0] || null;
}

// P1–P3 from fail-date proximity, PDC ≤ 90%, and prior-year non-compliance.
// Thresholds are a proposal (spec status: "Proposed").
export function derivePriority(measure) {
  if (!measure) return 'P3';
  const days = daysFromToday(measure.failDate);
  const lowPdc = measure.pdc != null && measure.pdc <= 90;
  let score = 0;
  if (days != null && days <= 14) score += 2;
  else if (days != null && days <= 45) score += 1;
  if (lowPdc) score += 1;
  if (measure.priorYearNonCompliant) score += 1;
  if (score >= 3) return 'P1';
  if (score >= 2) return 'P2';
  return 'P3';
}

// Color is reserved for "act now": PDC under the 80% measure threshold and
// fills already overdue. Everything else stays neutral.
export function pdcTone(pdc) {
  return pdc != null && pdc < 80 ? 'error' : null;
}

export function fillDueTone(mdy) {
  const days = daysFromToday(mdy);
  return days != null && days < 0 ? 'error' : null;
}

// ── Claim reconciliation ──
// A gap only closes once the plan sees a paid claim, so a pickup the pharmacy
// confirmed on the phone still has to show up in claims. Reconciliation is
// about that pickup: a measure with no confirmed pickup has nothing to match.
export const CLAIM_LAG_DAYS = 14;

// Most severe first; a member's row shows its worst measure.
export const RECON_STATUSES = ['Claim reversed', 'Claim overdue', 'Awaiting claim', 'Matched'];

export const RECON_TONE = {
  'Claim reversed': 'error',
  'Claim overdue': 'error',
  'Awaiting claim': 'grey',
  'Matched': 'success',
};

export function reconcileMeasure(x) {
  const claim = x.claim || null;
  if (claim?.status === 'Reversed') {
    return { status: 'Claim reversed', detail: `${claim.rxNumber || 'Claim'} reversed ${claim.date}` };
  }
  const pickup = parseMdy(x.pickupConfirmed);
  const claimAt = claim?.status === 'Paid' ? parseMdy(claim.date) : null;
  if (pickup != null && (claimAt == null || claimAt < pickup)) {
    const waited = -daysFromToday(x.pickupConfirmed);
    return {
      status: waited > CLAIM_LAG_DAYS ? 'Claim overdue' : 'Awaiting claim',
      detail: `Pickup ${x.pickupConfirmed} · no claim ${waited}d`,
    };
  }
  if (pickup != null && claimAt != null) return { status: 'Matched', detail: `Claim paid ${claim.date}` };
  return null;
}

function worstRecon(measures) {
  let worst = null;
  for (const x of measures || []) {
    const r = reconcileMeasure(x);
    if (r && (!worst || RECON_STATUSES.indexOf(r.status) < RECON_STATUSES.indexOf(worst.status))) {
      worst = { ...r, code: x.code };
    }
  }
  return worst;
}

// ── Measure status (gap closure) ──
// Closure is per measure and repeats every fill: a confirmed pickup closes
// the gap until the next fill comes due; a reversed claim reopens it; a
// pickup with no reversal after the shelf window is "Safe". Safe is the
// confirmed label — the others are proposals pending the team's sign-off.
export const REVERSAL_WINDOW_DAYS = 14;
// Gap status (first line) — the four statuses every program's gaps use.
export const GAP_STATUSES = ['Open', 'In Progress', 'Completed', 'Closed-Data'];
export const GAP_STATUS_TONE = {
  'Open': 'white',
  'In Progress': 'primary',
  'Completed': 'success',
  'Closed-Data': 'grey',
};

// Sub-status (second line): a fixed list of short labels, most urgent first.
export const MEASURE_STATUSES = [
  'Reopened', 'Refill overdue', 'Low PDC', 'Pending pickup', 'Refill due', 'On track', 'No fill data',
  'Picked up', 'Safe', 'Claim matched', 'Adherent', '1 fill left', 'Excluded',
];
// The only sub-statuses that call for action; the rest read as plain text.
export const URGENT_SUB_STATUSES = new Set(['Reopened', 'Refill overdue', 'Low PDC']);
const REFILL_DUE_DAYS = 14;

// Latest pharmacy-verification answers for one measure, if any.
export function latestVerification(callHistory, code) {
  const entry = (callHistory || []).find(e => e.kind === 'pharmacy-verification' && (e.measures || []).includes(code));
  return entry ? { entry, items: (entry.items || []).filter(i => i.measure === code) } : null;
}

function measureSubStatus(x, callHistory) {
  if (x.excluded) return { label: 'Excluded', detail: 'Excluded / safe for the year per plan file' };
  const pickup = parseMdy(x.pickupConfirmed);
  const supply = Math.max(0, ...(x.medications || []).map(d => d.daysSupply || 0));
  const reopensOn = pickup != null && supply ? addDaysMdy(x.pickupConfirmed, supply) : null;
  const claimAt = parseMdy(x.claim?.date);
  if (x.claim?.status === 'Reversed' && (pickup == null || claimAt >= pickup)) {
    return { label: 'Reopened', detail: `Claim reversed ${x.claim.date}, back on the plan gap report` };
  }
  // A confirmed pickup holds until that fill's supply runs out.
  if (pickup != null && (reopensOn == null || daysFromToday(reopensOn) > 0)) {
    const since = -daysFromToday(x.pickupConfirmed);
    if (since >= REVERSAL_WINDOW_DAYS) {
      return { label: 'Safe', detail: `Picked up ${x.pickupConfirmed}, no reversal after ${REVERSAL_WINDOW_DAYS} days · reopens ${reopensOn}`, reopensOn };
    }
    return { label: 'Picked up', detail: `Watching for a reversal until ${addDaysMdy(x.pickupConfirmed, REVERSAL_WINDOW_DAYS)} · reopens ${reopensOn}`, reopensOn };
  }
  const ver = latestVerification(callHistory, x.code);
  if (x.pendingPickupSince && (pickup == null || parseMdy(x.pendingPickupSince) > pickup)) {
    return { label: 'Pending pickup', detail: `Filled but on the pharmacy shelf as of ${x.pendingPickupSince}` };
  }
  if (ver?.items.some(i => i.refilled && !i.pickedUp)) {
    return { label: 'Pending pickup', detail: `Filled but on the pharmacy shelf as of ${ver.entry.date}` };
  }
  if (fillDueTone(x.nextFillDue) === 'error') {
    return { label: 'Refill overdue', detail: `Next fill ${-daysFromToday(x.nextFillDue)}d overdue` };
  }
  if (x.pdc != null && x.pdc < 80) return { label: 'Low PDC', detail: `PDC ${x.pdc}% is below 80%` };
  if (!x.nextFillDue) return { label: 'No fill data', detail: 'No fill date on file' };
  const due = daysFromToday(x.nextFillDue);
  if (due <= REFILL_DUE_DAYS) return { label: 'Refill due', detail: `Next fill due ${x.nextFillDue} (${due === 0 ? 'today' : `in ${due}d`})` };
  return { label: 'On track', detail: `Next fill due ${x.nextFillDue}` };
}

// A measure counts as worked once outreach, a verification call or a barrier
// log touched it on or after its latest fill (the current fill cycle).
function workedThisCycle(x, member) {
  const since = Math.max(...(x.medications || []).map(d => parseMdy(d.lastFill) || 0), 0);
  const touched = (date) => (parseMdy(date) || 0) >= since;
  return (member.callHistory || []).some(e => (e.measures || []).includes(x.code) && touched(e.date))
    || (member.interventionLog || []).some(e => e.measures?.[x.code] && touched(e.date))
    || !!x.pendingPickupSince;
}

// Gap status + sub-status for one measure:
//   Closed-Data — closed by plan / claims data (Claim matched, Excluded,
//                 Adherent, 1 fill left)
//   Completed   — pickup confirmed in Fold (sub: Picked up / Safe)
//   In Progress — worked this fill cycle
//   Open        — not worked yet
// A status someone set by hand on the gap (`statusManual`) wins.
export function measureStatus(x, member) {
  const auto = autoMeasureStatus(x, member);
  return x.statusManual && x.status ? { ...auto, gap: x.status, manual: true } : auto;
}

function autoMeasureStatus(x, member) {
  const sub = measureSubStatus(x, member?.callHistory);
  if (sub.label === 'Excluded') return { gap: 'Closed-Data', ...sub };
  // A pickup only covers its fill: once the supply runs out the gap reopens,
  // whether or not the claim matched (sub-status is no longer Picked up / Safe).
  const covered = sub.label === 'Picked up' || sub.label === 'Safe';
  if (covered && reconcileMeasure(x)?.status === 'Matched') {
    return { gap: 'Closed-Data', label: 'Claim matched', detail: `Pickup ${x.pickupConfirmed} matched by claim ${x.claim.date} · reopens ${sub.reopensOn}`, reopensOn: sub.reopensOn };
  }
  if (covered) return { gap: 'Completed', ...sub };
  if (x.oneFillToInvincible) return { gap: 'Closed-Data', label: '1 fill left', detail: 'Plan file: one more fill guarantees 80% PDC for the year' };
  if (x.projectedStatus === 'Already adherent') return { gap: 'Closed-Data', label: 'Adherent', detail: 'Plan file: projected adherent for the year' };
  return { gap: member && workedThisCycle(x, member) ? 'In Progress' : 'Open', ...sub };
}

export const CLOSED_GAPS = new Set(['Completed', 'Closed-Data']);

// Gap start date: from the plan file when it sends one, otherwise the first
// fill of the measure year.
export function gapStartDate(x) {
  if (x.startDate) return x.startDate;
  const year = (x.failDate || '').slice(6);
  const fills = (x.medications || []).flatMap(d => (d.refills || []).map(r => r.date)).filter(d => d?.endsWith(year));
  return fills.toSorted((a, b) => parseMdy(a) - parseMdy(b))[0] || null;
}

// At-a-glance progress across the member's pharmacy gaps.
export const PROGRESS_LEVELS = ['Not started', 'In progress', 'Partially complete', 'Complete'];
export function gapProgress(statuses) {
  const gaps = Object.values(statuses).map(s => s.gap);
  const closed = gaps.filter(g => CLOSED_GAPS.has(g)).length;
  const label = !gaps.length || closed === gaps.length ? 'Complete'
    : closed > 0 ? 'Partially complete'
    : gaps.some(g => g === 'In Progress') ? 'In progress'
    : 'Not started';
  return { label, closed, total: gaps.length };
}

// Sources send priority as P1–P3 or High/Medium/Low; the worklist always
// shows P1–P3 so rows compare at a glance. Derived when the source has none.
const SOURCE_PRIORITY = { P1: 'P1', High: 'P1', P2: 'P2', Medium: 'P2', P3: 'P3', Low: 'P3' };
const PRIORITY_RANKS = { P1: 0, P2: 1, P3: 2 };
export const priorityRank = (p) => PRIORITY_RANKS[p] ?? 3;

export const otherGapsCountBucket = (n) => (n >= 3 ? '3+' : String(n));

// Fail-date countdown buckets for the Days Left filter (the column is gone).
export function daysLeftBucket(mdy) {
  const d = daysFromToday(mdy);
  if (d == null) return 'No fail date';
  if (d < 0) return 'Past fail date';
  if (d <= 14) return '0–14 days';
  if (d <= 30) return '15–30 days';
  if (d <= 60) return '31–60 days';
  return '60+ days';
}

// Member-level gap status rolled up from its measures.
export function rollupGapStatus(statuses) {
  const gaps = Object.values(statuses).map(s => s.gap);
  if (!gaps.length) return 'Open';
  if (gaps.every(g => g === 'Closed-Data')) return 'Closed-Data';
  if (gaps.every(g => g === 'Completed' || g === 'Closed-Data')) return 'Completed';
  if (gaps.some(g => g !== 'Open')) return 'In Progress';
  return 'Open';
}

// ── Outreach ── same shape the other worklists render: last attempt's
// result + date, and one dot per attempt (latest three, oldest first).
export function outreachSummary(callHistory) {
  const list = callHistory || [];
  if (!list.length) return null;
  const last = list[0];
  const recent = list.slice(0, 3).reverse().map(c => (c.result === 'success' ? 'blue' : 'red'));
  while (recent.length < 3) recent.push('grey');
  return {
    status: last.result === 'success' ? 'Attended' : 'Failed',
    failed: last.result !== 'success',
    date: last.date,
    contact: last.contact,
    outcome: last.outcome,
    dots: recent,
    attempts: list.length,
  };
}

// Fold ID as the cross-worklist key: '#' stripped, trimmed, lowercased.
export const normMemberId = (v) => String(v ?? '').replace(/^#/, '').trim().toLowerCase();

// `hedisGapsByMember` (normMemberId -> [{ code, name, status }]) supplies the
// member's live HEDIS gaps for Other Care Gaps; the stored `otherCareGaps`
// (plan file) is only the fallback for members with no HEDIS record.
export function enrichPharmacyMember(m, { hedisGapsByMember } = {}) {
  const statuses = Object.fromEntries((m.measures || []).map(x => [x.code, measureStatus(x, m)]));
  // One focus measure drives priority, PDC, dates and the sub-status, so the
  // row never mixes numbers from different measures.
  const urgent = mostUrgentMeasure(m.measures, statuses);
  const urgentOpen = OPEN_GAPS.has(statuses[urgent?.code]?.gap);
  const recon = worstRecon(m.measures);
  const outreach = outreachSummary(m.callHistory);
  const measureCodes = MEASURE_ORDER.filter(c => (m.measures || []).some(x => x.code === c));
  const priority = SOURCE_PRIORITY[m.sourcePriority] || (urgentOpen ? derivePriority(urgent) : 'P3');
  const progress = gapProgress(statuses);
  const otherCareGaps = hedisGapsByMember?.get(normMemberId(m.memberId || m.id)) ?? m.otherCareGaps ?? [];
  const gaps = measureCodes.map(code => {
    const x = m.measures.find(y => y.code === code);
    return { ...x, medications: x.medications || [], startDate: gapStartDate(x), status: statuses[code], recon: reconcileMeasure(x) };
  });
  return {
    ...m,
    urgent,
    urgentOpen,
    measureCodes,
    gaps,
    progress,
    otherCareGaps,
    otherCareGapsCount: otherCareGaps.length,
    priority,
    priorityRank: priorityRank(priority),
    pdc: urgent?.pdc ?? null,
    failDate: urgent?.failDate ?? null,
    failDateSort: parseMdy(urgent?.failDate),
    nextFillDue: urgent?.nextFillDue ?? null,
    nextFillDueSort: parseMdy(urgent?.nextFillDue),
    priorYearNonCompliant: (m.measures || []).some(x => x.priorYearNonCompliant),
    recon,
    reconStatuses: [...new Set((m.measures || []).map(x => reconcileMeasure(x)?.status).filter(Boolean))],
    reconRank: recon ? RECON_STATUSES.indexOf(recon.status) : RECON_STATUSES.length,
    outreach,
    outreachSort: parseMdy(outreach?.date),
    measureStatuses: statuses,
    progressRank: PROGRESS_LEVELS.indexOf(progress.label),
    // Status is set per gap now; the member's is always the roll-up (an old
    // member-level override has no UI left to clear it).
    status: rollupGapStatus(statuses),
    subStatus: urgent ? { ...statuses[urgent.code], code: urgent.code } : null,
    followUpDueSort: parseMdy(m.followUpDue),
  };
}

// ── Snapshot: prescribers and pharmacies from the member's medications ──
export function prescribersOf(member) {
  const byName = new Map();
  for (const x of member?.measures || []) {
    for (const d of x.medications || []) {
      const p = d.prescriber;
      if (!p?.name) continue;
      const cur = byName.get(p.name) || { ...p, drugs: [] };
      cur.drugs.push(medLabel(d));
      byName.set(p.name, cur);
    }
  }
  return [...byName.values()];
}

// Every pharmacy in the fill history, newest first. Contact details come from
// the medications' pharmacy records; fills give the count and last date.
export function pharmaciesUsed(member) {
  const contacts = new Map();
  for (const p of [member?.pharmacy, ...(member?.measures || []).flatMap(x => (x.medications || []).map(d => d.pharmacy))]) {
    if (p?.name && !contacts.has(p.name)) contacts.set(p.name, p);
  }
  const used = new Map();
  for (const x of member?.measures || []) {
    for (const d of x.medications || []) {
      for (const r of d.refills || []) {
        if (!r.pharmacy) continue;
        const cur = used.get(r.pharmacy) || { ...(contacts.get(r.pharmacy) || { name: r.pharmacy }), fills: 0, lastFill: null };
        cur.fills += 1;
        if (!cur.lastFill || parseMdy(r.date) > parseMdy(cur.lastFill)) cur.lastFill = r.date;
        used.set(r.pharmacy, cur);
      }
    }
  }
  return [...used.values()].toSorted((a, b) => parseMdy(b.lastFill) - parseMdy(a.lastFill));
}
