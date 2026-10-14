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
// confirmed on the phone still has to show up in claims, and the plan's PDC
// has to agree with the PDC we calculate from claims.
const CLAIM_LAG_DAYS = 14;
const PDC_TOLERANCE = 3;

// Most severe first; a member's row shows its worst measure.
export const RECON_STATUSES = ['Claim reversed', 'Claim overdue', 'Awaiting claim', 'PDC mismatch', 'Matched'];

export const RECON_TONE = {
  'Claim reversed': 'error',
  'Claim overdue': 'error',
  'Awaiting claim': 'grey',
  'PDC mismatch': 'grey',
  'Matched': 'grey',
};

function reconcileMeasure(x) {
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
  if (x.pdc != null && x.calcPdc != null && Math.abs(x.pdc - x.calcPdc) >= PDC_TOLERANCE) {
    return { status: 'PDC mismatch', detail: `Plan ${x.pdc}% vs claims ${x.calcPdc}%` };
  }
  if (claimAt != null) return { status: 'Matched', detail: `Claim paid ${claim.date}` };
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

// Sub-status (second line), most urgent first.
export const MEASURE_STATUSES = [
  'Reopened', 'At risk', 'Pending pickup', 'Needs monitoring', 'Pickup confirmed', 'Safe',
  'Already adherent', '1 fill to invincible', 'Excluded',
];
// The only sub-statuses that call for action; the rest read as plain text.
export const URGENT_SUB_STATUSES = new Set(['Reopened', 'At risk']);

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
    return { label: 'Pickup confirmed', detail: `Watching for a reversal until ${addDaysMdy(x.pickupConfirmed, REVERSAL_WINDOW_DAYS)} · reopens ${reopensOn}`, reopensOn };
  }
  const ver = latestVerification(callHistory, x.code);
  if (x.pendingPickupSince && (pickup == null || parseMdy(x.pendingPickupSince) > pickup)) {
    return { label: 'Pending pickup', detail: `Filled but on the pharmacy shelf as of ${x.pendingPickupSince}` };
  }
  if (ver?.items.some(i => i.refilled && !i.pickedUp)) {
    return { label: 'Pending pickup', detail: `Filled but on the pharmacy shelf as of ${ver.entry.date}` };
  }
  if (fillDueTone(x.nextFillDue) === 'error' || (x.pdc != null && x.pdc < 80)) {
    return { label: 'At risk', detail: x.nextFillDue && daysFromToday(x.nextFillDue) < 0 ? `Next fill ${-daysFromToday(x.nextFillDue)}d overdue` : `PDC ${x.pdc}% is below 80%` };
  }
  return { label: 'Needs monitoring', detail: x.nextFillDue ? `Next fill due ${x.nextFillDue}` : 'No fill date on file' };
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
//   Completed   — pickup confirmed in Fold (sub: Pickup confirmed / Safe)
//   Closed-Data — closed by plan / claims data (Excluded, Already adherent,
//                 1 fill to invincible)
//   In Progress — worked this fill cycle
//   Open        — not worked yet
export function measureStatus(x, member) {
  const sub = measureSubStatus(x, member?.callHistory);
  if (sub.label === 'Excluded') return { gap: 'Closed-Data', ...sub };
  if (sub.label === 'Pickup confirmed' || sub.label === 'Safe') return { gap: 'Completed', ...sub };
  if (x.oneFillToInvincible) return { gap: 'Closed-Data', label: '1 fill to invincible', detail: 'Plan file: one more fill guarantees 80% PDC for the year' };
  if (x.projectedStatus === 'Already adherent') return { gap: 'Closed-Data', label: 'Already adherent', detail: 'Plan file: projected adherent for the year' };
  return { gap: member && workedThisCycle(x, member) ? 'In Progress' : 'Open', ...sub };
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

export function enrichPharmacyMember(m) {
  const statuses = Object.fromEntries((m.measures || []).map(x => [x.code, measureStatus(x, m)]));
  // One focus measure drives priority, PDC, dates and the sub-status, so the
  // row never mixes numbers from different measures.
  const urgent = mostUrgentMeasure(m.measures, statuses);
  const urgentOpen = OPEN_GAPS.has(statuses[urgent?.code]?.gap);
  const recon = worstRecon(m.measures);
  const outreach = outreachSummary(m.callHistory);
  const measureCodes = MEASURE_ORDER.filter(c => (m.measures || []).some(x => x.code === c));
  return {
    ...m,
    urgent,
    urgentOpen,
    measureCodes,
    priority: urgentOpen ? derivePriority(urgent) : 'P3',
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
    // Rolled up from the measures unless someone set it by hand.
    status: m.statusManual ? m.status : rollupGapStatus(statuses),
    subStatus: urgent ? { ...statuses[urgent.code], code: urgent.code } : null,
    followUpDueSort: parseMdy(m.followUpDue),
  };
}
