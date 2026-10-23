const DAY_MS = 86_400_000;

// SUPD is out of scope for this worklist.
export const MEASURE_ORDER = ['MAD', 'MAH', 'MAC'];

export const MEASURE_NAMES = {
  MAD: 'Medication Adherence for Diabetes',
  MAH: 'Medication Adherence for Hypertension (RAS antagonists)',
  MAC: 'Medication Adherence for Cholesterol (Statins)',
};

// PDC to act on: projected with a recent fill once one is confirmed,
// otherwise the plan's, otherwise ours from claims.
export const effectivePdc = (x) => x?.pdcProjected ?? x?.pdc ?? x?.calcPdc ?? null;
// Fail date to act on: projected from a fill confirmed in Fold, otherwise the
// plan's. Either way it is the absolute fail date.
export const effectiveFailDate = (x) => x?.failDateProjected ?? x?.failDate ?? null;

// Where each headline number comes from: the plan file, our calculation from
// claims, or projected from a fill confirmed in Fold (pending its claim).
export const DATA_SOURCE_HINT = {
  Plan: 'Sent by the plan',
  Calculated: 'Calculated by Fold from claims',
  Projected: 'Projected from a fill confirmed in Fold, pending a matching claim',
};
export const pdcSource = (x) => (x.pdcProjected != null ? 'Projected' : x.pdc != null ? 'Plan' : x.calcPdc != null ? 'Calculated' : null);
export const failDateSource = (x) => (x.failDateProjected != null ? 'Projected' : x.failDate ? 'Plan' : null);
export const nextFillDueSource = (x) => (!x.nextFillDue ? null : x.pdcProjected != null ? 'Projected' : 'Calculated');
export const FAIL_DATE_HINT = 'Absolute fail date: after this day the member can no longer reach 80% PDC this year';

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

// A gap still needs work unless it is Completed (fill confirmed, waiting for
// its claim) or Closed-Data (`done`). Only these drive a row's headline
// numbers and red risk: a picked-up MAD must not paint the row red while MAH
// is the real gap.
export const isActiveGap = (st) => !!st && !st.done;

// Earliest fail date wins; lower PDC breaks ties. Open gaps compete first,
// then non-excluded measures, then everything.
export function mostUrgentMeasure(measures, statuses) {
  const list = measures || [];
  const open = statuses ? list.filter(x => isActiveGap(statuses[x.code])) : [];
  const live = list.filter(x => !x.excluded);
  const pool = open.length ? open : live.length ? live : list;
  return pool.toSorted((a, b) => {
    const fa = parseMdy(effectiveFailDate(a)) ?? Infinity;
    const fb = parseMdy(effectiveFailDate(b)) ?? Infinity;
    if (fa !== fb) return fa - fb;
    return (effectivePdc(a) ?? 101) - (effectivePdc(b) ?? 101);
  })[0] || null;
}

// P1–P3 from fail-date proximity, PDC ≤ 90%, and prior-year non-compliance.
// Thresholds are a proposal (spec status: "Proposed").
export function derivePriority(measure) {
  if (!measure) return 'P3';
  const days = daysFromToday(effectiveFailDate(measure));
  const pdc = effectivePdc(measure);
  const lowPdc = pdc != null && pdc <= 90;
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

// ── Claims ──
// Each medication's `refills` holds two kinds of row: plan claims (no
// `source`) and fills confirmed in Fold (`source` set: a pickup confirmed by
// call or verification, a refill approval, or a date entered by hand).
//
// Claim rows carry: claimId, claimStatus (Paid | Pending | Reversed |
// Cancelled | Deleted | Rejected), txnType (Original | Reversal | Rebill),
// claimSeq, claimGroup (the original claim a rebill or reversal belongs to),
// reversesClaimId, reversalDate, processedDate, coverage ('Part D' when
// absent), bin, pcn, rxGroup. Status values, transaction type, sequence,
// BIN/PCN and the negative-value rule are pending Astrana's confirmation.

const VOID_CLAIM_STATUSES = new Set(['Reversed', 'Cancelled', 'Deleted', 'Rejected']);
// A negative quantity or days supply is a reversal (pending Astrana).
const isReversalRow = (c) => c.txnType === 'Reversal' || c.qty < 0 || c.daysSupply < 0;
export const isPartD = (c) => !c.coverage || c.coverage === 'Part D';

// Every claim row with what it means for PDC (`effect`):
//   Counts      the current, paid, Part D version of the fill
//   Reversal    a reversal transaction (it removes another claim)
//   Reversed / Cancelled / Deleted / Rejected   voided; not a fill
//   Superseded  an older version of a resubmitted claim
//   Not Part D  billed to other coverage
//   Pending     not adjudicated yet
// Only the highest claim sequence in a group is current.
export function annotateClaims(refills) {
  const claims = (refills || []).filter(r => !r.source);
  const reversedIds = new Set(claims.filter(isReversalRow).map(c => c.reversesClaimId).filter(Boolean));
  // A reversal belongs to the group of the claim it reverses.
  const groupById = new Map(claims.filter(c => !isReversalRow(c)).map(c => [c.claimId, c.claimGroup || c.claimId || c.date]));
  const claimGroupOf = (c) => c.claimGroup || (isReversalRow(c) && groupById.get(c.reversesClaimId)) || c.claimId || c.date;
  const currentSeq = new Map();
  for (const c of claims) {
    if (isReversalRow(c)) continue;
    const g = claimGroupOf(c);
    currentSeq.set(g, Math.max(currentSeq.get(g) ?? -Infinity, c.claimSeq ?? 1));
  }
  return claims.map(c => {
    const reversal = isReversalRow(c);
    const seq = c.claimSeq ?? 1;
    const current = !reversal && seq === currentSeq.get(claimGroupOf(c));
    const effect = reversal ? 'Reversal'
      : VOID_CLAIM_STATUSES.has(c.claimStatus) ? c.claimStatus
      : reversedIds.has(c.claimId) ? 'Reversed'
      : !current ? 'Superseded'
      : !isPartD(c) ? 'Not Part D'
      : c.claimStatus === 'Pending' ? 'Pending'
      : 'Counts';
    return {
      ...c,
      txnType: c.txnType || (reversal ? 'Reversal' : seq > 1 ? 'Rebill' : 'Original'),
      claimSeq: seq,
      claimGroup: claimGroupOf(c),
      current,
      voided: VOID_CLAIM_STATUSES.has(effect),
      counts: effect === 'Counts',
      effect,
    };
  });
}

// ── Claim match for fills confirmed in Fold ──
// A confirmed fill is the same fill as a claim dated 7 days before to 3 days
// after it. The plan's claim feed lags, so a fill waits for its claim for the
// plan's match window before it is flagged. Windows are per plan (feed
// frequency + lag) and still to be confirmed with each plan.
export const SAME_FILL_BEFORE_DAYS = 7;
export const SAME_FILL_AFTER_DAYS = 3;
export const CLAIM_MATCH_WINDOW_DAYS = 14;
const PLAN_CLAIM_WINDOW_DAYS = { 'Humana Gold Plus': 10, 'SCAN Classic': 21 };
export const claimWindowDays = (plan) => PLAN_CLAIM_WINDOW_DAYS[plan] ?? CLAIM_MATCH_WINDOW_DAYS;

export const confirmedFills = (d) => (d.refills || []).filter(r => r.source);
export const latestConfirmedFill = (d) => confirmedFills(d)
  .reduce((best, r) => (!best || parseMdy(r.date) > parseMdy(best.date) ? r : best), null);

// One confirmed fill against the medication's claims:
//   kind  verified | voided | other-coverage | pending | no-claim
//   status  Verified | Pending claim | Not matched
export function matchFill(fill, claims, plan) {
  const at = parseMdy(fill.date);
  const near = claims.filter(c => c.effect !== 'Reversal' && c.effect !== 'Superseded' && (() => {
    const t = parseMdy(c.date);
    return t != null && t >= at - SAME_FILL_BEFORE_DAYS * DAY_MS && t <= at + SAME_FILL_AFTER_DAYS * DAY_MS;
  })());
  const verified = near.find(c => c.counts);
  if (verified) return { kind: 'verified', status: 'Verified', claim: verified, detail: `Matched by claim ${verified.claimId || verified.date}` };
  const voided = near.find(c => c.voided);
  if (voided) return { kind: 'voided', status: 'Not matched', claim: voided, detail: `Claim ${voided.claimId || voided.date} ${voided.effect.toLowerCase()}` };
  const other = near.find(c => c.effect === 'Not Part D');
  if (other) return { kind: 'other-coverage', status: 'Not matched', claim: other, detail: `Billed to ${other.coverage}, not Part D` };
  const window = claimWindowDays(plan);
  const waited = -daysFromToday(fill.date);
  if (waited <= window) return { kind: 'pending', status: 'Pending claim', detail: `Waiting for the claim until ${addDaysMdy(fill.date, window)}` };
  return { kind: 'no-claim', status: 'Not matched', detail: `No claim ${waited} days after the fill (window ${window} days)` };
}

// Match of each active drug's latest confirmed fill; the gap takes the worst.
export function gapClaimMatch(x, plan) {
  const items = (x.medications || [])
    .filter(d => d.status !== 'Discontinued')
    .map(d => {
      const fill = latestConfirmedFill(d);
      return fill ? { medId: d.id, medName: d.name, fill, ...matchFill(fill, annotateClaims(d.refills), plan) } : null;
    })
    .filter(Boolean);
  if (!items.length) return null;
  const worst = items.find(i => i.status === 'Not matched') || items.find(i => i.status === 'Pending claim') || items[0];
  return { status: worst.status, worst, items };
}

// ── Claim reconciliation (worklist column) ──
// Most severe first; a member's row shows its worst measure.
export const RECON_STATUSES = ['Claim not matched', 'Pending claim', 'Matched'];

export const RECON_TONE = {
  'Claim not matched': 'error',
  'Pending claim': 'grey',
  'Matched': 'success',
};

const RECON_BY_MATCH = { 'Not matched': 'Claim not matched', 'Pending claim': 'Pending claim', Verified: 'Matched' };

export function reconcileMeasure(x, plan) {
  const match = gapClaimMatch(x, plan);
  if (!match) return null;
  const { worst } = match;
  return {
    status: RECON_BY_MATCH[match.status],
    detail: `${worst.medName} fill ${worst.fill.date} · ${worst.detail}`,
    medId: worst.medId,
    fillDate: worst.fill.date,
  };
}

function worstRecon(measures, plan) {
  let worst = null;
  for (const x of measures || []) {
    const r = reconcileMeasure(x, plan);
    if (r && (!worst || RECON_STATUSES.indexOf(r.status) < RECON_STATUSES.indexOf(worst.status))) {
      worst = { ...r, code: x.code };
    }
  }
  return worst;
}

// ── Measure status (gap closure) ──
// Gap status (first line):
//   Open         not worked this fill cycle
//   In Progress  worked, or a confirmed fill whose claim did not match
//   Completed    the current fill is confirmed in Fold (pickup or a date
//                entered by hand) and waiting for its claim. Projected only.
//   Closed-Data  closed by system data: a matched Part D claim, or the plan
//                file (Excluded, Adherent, 1 fill left)
// Only Open and In Progress can be set by hand.
export const GAP_STATUSES = ['Open', 'In Progress', 'Completed', 'Closed-Data'];
export const MANUAL_GAP_STATUSES = ['Open', 'In Progress'];
export const GAP_STATUS_TONE = {
  'Open': 'white',
  'In Progress': 'primary',
  'Completed': 'success',
  'Closed-Data': 'grey',
};
const SETTLED_GAPS = new Set(['Completed', 'Closed-Data']);

// Sub-status (second line): a fixed list of short labels, most urgent first.
export const MEASURE_STATUSES = [
  'Claim not matched', 'Reopened', 'Refill overdue', 'Low PDC', 'Pending pickup', 'Refill due', 'On track', 'No fill data',
  'Pending claim', 'Claim matched', 'Adherent', '1 fill left', 'Excluded',
];
// The only sub-statuses that call for action; the rest read as plain text.
export const URGENT_SUB_STATUSES = new Set(['Claim not matched', 'Reopened', 'Refill overdue', 'Low PDC']);
const REFILL_DUE_DAYS = 14;

// Latest pharmacy-verification answers for one measure, if any.
export function latestVerification(callHistory, code) {
  const entry = (callHistory || []).find(e => e.kind === 'pharmacy-verification' && (e.measures || []).includes(code));
  return entry ? { entry, items: (entry.items || []).filter(i => i.measure === code) } : null;
}

// Where the fill stands when nothing is confirmed in Fold for this cycle.
function measureSubStatus(x, callHistory) {
  const active = (x.medications || []).filter(d => d.status !== 'Discontinued');
  const lastConfirmed = Math.max(0, ...active.map(d => parseMdy(latestConfirmedFill(d)?.date) || 0));
  // The newest claim of a drug was voided after its last confirmed fill.
  for (const d of active) {
    const newest = annotateClaims(d.refills).filter(c => c.effect !== 'Reversal')
      .toSorted((a, b) => parseMdy(b.date) - parseMdy(a.date))[0];
    if (newest?.voided && parseMdy(newest.date) >= lastConfirmed) {
      return { label: 'Reopened', detail: `${d.name} claim ${newest.claimId || newest.date} ${newest.effect.toLowerCase()}, back on the plan gap report` };
    }
  }
  const ver = latestVerification(callHistory, x.code);
  if (x.pendingPickupSince && parseMdy(x.pendingPickupSince) > lastConfirmed) {
    return { label: 'Pending pickup', detail: `Filled but on the pharmacy shelf as of ${x.pendingPickupSince}` };
  }
  if (ver?.items.some(i => i.refilled && !i.pickedUp)) {
    return { label: 'Pending pickup', detail: `Filled but on the pharmacy shelf as of ${ver.entry.date}` };
  }
  if (fillDueTone(x.nextFillDue) === 'error') {
    return { label: 'Refill overdue', detail: `Next fill ${-daysFromToday(x.nextFillDue)}d overdue` };
  }
  const pdc = effectivePdc(x);
  if (pdc != null && pdc < 80) return { label: 'Low PDC', detail: `${x.pdcProjected != null ? 'Projected PDC' : 'PDC'} ${pdc}% is below 80%` };
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

// Gap status + sub-status for one measure (see GAP_STATUSES). `done` means
// nothing is owed on the gap right now (Completed or Closed-Data). A status
// set by hand (`statusManual`, Open or In Progress) wins and puts the gap
// back in play.
export function measureStatus(x, member) {
  const auto = autoMeasureStatus(x, member);
  if (!x.statusManual || !MANUAL_GAP_STATUSES.includes(x.status)) return auto;
  return { ...auto, gap: x.status, manual: true, done: false };
}

function autoMeasureStatus(x, member) {
  const status = (gap, sub) => ({ gap, ...sub, done: SETTLED_GAPS.has(gap) });
  if (x.excluded) return status('Closed-Data', { label: 'Excluded', detail: 'Excluded / safe for the year per plan file' });
  if (x.oneFillToInvincible) return status('Closed-Data', { label: '1 fill left', detail: 'Plan file: one more fill guarantees 80% PDC for the year' });
  if (x.projectedStatus === 'Already adherent') return status('Closed-Data', { label: 'Adherent', detail: 'Plan file: projected adherent for the year' });

  const match = gapClaimMatch(x, member?.healthPlan);
  if (match?.status === 'Not matched') {
    const w = match.worst;
    return status('In Progress', { label: 'Claim not matched', detail: `Rework: ${w.medName} fill ${w.fill.date} · ${w.detail}`, medId: w.medId });
  }
  // A confirmed fill only covers its supply: once it runs out the gap needs
  // work again, whether or not the claim matched.
  const covered = match && daysFromToday(x.nextFillDue) > 0;
  if (covered && match.status === 'Verified') {
    return status('Closed-Data', { label: 'Claim matched', detail: `${match.worst.detail} · reopens ${x.nextFillDue}` });
  }
  if (covered) {
    return status('Completed', { label: 'Pending claim', detail: `Projected until the claim arrives · ${match.worst.detail}` });
  }
  const sub = measureSubStatus(x, member?.callHistory);
  return status(member && workedThisCycle(x, member) ? 'In Progress' : 'Open', sub);
}

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
  // Only system data closes a gap; Completed is still waiting for its claim.
  const closed = gaps.filter(g => g === 'Closed-Data').length;
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
  if (gaps.every(g => SETTLED_GAPS.has(g))) return 'Completed';
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
  const urgentOpen = isActiveGap(statuses[urgent?.code]);
  const recon = worstRecon(m.measures, m.healthPlan);
  const outreach = outreachSummary(m.callHistory);
  const measureCodes = MEASURE_ORDER.filter(c => (m.measures || []).some(x => x.code === c));
  const priority = SOURCE_PRIORITY[m.sourcePriority] || (urgentOpen ? derivePriority(urgent) : 'P3');
  const progress = gapProgress(statuses);
  // Open Care Gaps: the member's non-pharmacy gaps still being worked.
  const otherCareGaps = (hedisGapsByMember?.get(normMemberId(m.memberId || m.id)) ?? m.otherCareGaps ?? [])
    .filter(g => g.status !== 'Completed' && !String(g.status || '').startsWith('Closed'));
  const gaps = measureCodes.map(code => {
    const x = m.measures.find(y => y.code === code);
    return {
      ...x,
      medications: x.medications || [],
      pdc: effectivePdc(x),
      pdcSource: pdcSource(x),
      failDatePlan: x.failDate,
      failDate: effectiveFailDate(x),
      failDateSource: failDateSource(x),
      nextFillDueSource: nextFillDueSource(x),
      startDate: gapStartDate(x),
      status: statuses[code],
      recon: reconcileMeasure(x, m.healthPlan),
    };
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
    pdc: effectivePdc(urgent),
    failDate: effectiveFailDate(urgent),
    failDateSort: parseMdy(effectiveFailDate(urgent)),
    nextFillDue: urgent?.nextFillDue ?? null,
    nextFillDueSort: parseMdy(urgent?.nextFillDue),
    priorYearNonCompliant: (m.measures || []).some(x => x.priorYearNonCompliant),
    recon,
    reconStatuses: [...new Set((m.measures || []).map(x => reconcileMeasure(x, m.healthPlan)?.status).filter(Boolean))],
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
