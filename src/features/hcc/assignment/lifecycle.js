// Lifecycle transitions for the HCC assignment workflow.
//
// Each public function maps to one of the acceptance criteria in the story.
// All are **pure** — they take the current dos-state-map (read-only) plus
// any context (patient, dos date, actor, reason) and return:
//
//   { nextMap, events: ActivityEvent[] }
//
// `nextMap` is a new dos-state-map with this transition applied. The store
// just replaces its slice with `nextMap`. `events` is a list of per-DOS log
// entries the store also persists (today the same list is folded into
// `state.activity`, but the shape is decoupled so a future audit log table
// can consume it directly).
//
// AC mapping:
//   initializeDos       — AC-1 (blank → Support, awaiting state)
//   markSupportInProgress — AC-1 (Support starts work)
//   completeSupport     — AC-1/AC-2 (Support completes → assign Coder)
//   markInsufficient    — AC-1 (Support: incomplete docs, stays with Support)
//   rejectDos           — AC-1 (Support: terminal reject)
//   completeCoder       — AC-2/AC-3 (Coder completes → assign Reviewer)
//   requestRecords      — AC-6 (Coder asks Support for more docs)
//   recordsReceived     — AC-6 (Support finishes, DOS returns to original Coder)
//   completeReviewer    — AC-3/AC-4 (Reviewer completes; maybe → Reviewer 2 via 10% sample)
//   completeReviewer2   — AC-4/AC-5 (Reviewer 2 completes → Billing Ready; no further tier)
//   returnDos           — AC-7 (reviewer returns to immediate prior role)
//   reassignRole        — AC-9 (manual reassignment; previous → Inactive)
//
// "Reviewer 3" does not exist in this workflow — Reviewer 2 is the terminal
// review stage and always resolves to Billing Ready on completion.

import { pickAssignee } from './engine';
import { ROLES, ROLE_LABEL } from './astranaStaff';
import { validateAsmReadinessConfig } from './sampling';
import {
  STATUS,
  blankDosState,
  setRoleState,
  pushActivity,
  computeWorkload,
  computePatientHistory,
  hydrateFromMember,
  dosKey,
} from './dosState';

// ── Shared helpers ───────────────────────────────────────────────────────

// Pull (or lazily seed) the DOS-state record for the composite key
// (patientId, dosDate, provider, pos).
function getOrInit(map, patientId, dosDate, provider, pos) {
  const k = dosKey(patientId, dosDate, provider, pos);
  return map[k] || blankDosState(patientId, dosDate, provider, pos);
}

// Update a single DOS-state record in the map (immutable).
function putState(map, state) {
  return { ...map, [dosKey(state.patientId, state.dosDate, state.renderingProvider, state.pos)]: state };
}

// Build a context object the engine needs to make its decision.
function ctxFor(map, patient, dos, opts = {}) {
  return {
    patient,
    dos,
    workload: computeWorkload(map),
    patientHistory: computePatientHistory(map),
    slaCloseDays: opts.slaCloseDays || 7,
    priorRoleMapping: opts.priorRoleMapping || {},
    opts: { astrana: opts.astrana !== false },
  };
}

// Activity-event factory. Keeps shape consistent across all transitions.
function evt(state, kind, payload) {
  return {
    kind,
    role: payload.role || null,
    from: payload.from || null,
    to:   payload.to   || null,
    by:   payload.by   || 'system',
    reason: payload.reason || null,
    note: payload.note || null,
    patientId: state.patientId,
    dosDate:   state.dosDate,
    at: new Date().toISOString(),
  };
}

// Auto-pick + assign a role's assignee, returning the updated state.
// `transitionReason` describes why this happened in the activity log.
function autoAssignRole(map, state, patient, dos, role, initialStatus, transitionReason) {
  const pick = pickAssignee(role, ctxFor(map, patient, dos));
  if (!pick) return { state, picked: null };

  // AC-9: if the role already had someone, that prior assignment becomes
  // Inactive automatically via setRoleState's history tracking.
  const nextState = setRoleState(state, role,
    { assignee: pick.staff.id, status: initialStatus },
    { by: 'system', reason: `${transitionReason}:${pick.reason}` },
  );
  const withEvt = pushActivity(nextState,
    evt(nextState, 'assign', {
      role,
      to: pick.staff.id,
      reason: `${transitionReason}:${pick.reason}`,
    }),
  );
  return { state: withEvt, picked: pick };
}

// Linear-workflow skip: when a role completes, any EARLIER *review* role that
// never finished its own work is marked Skipped. Only QA (reviewer) and
// Compliance (reviewer2) are skippable — Support and Coder are mandatory and
// can NEVER be skipped. `SKIP_PRESERVE` are states we don't overwrite (real
// resolution, not a bypass).
const SKIPPABLE_ROLES = new Set(['reviewer', 'reviewer2']);
const SKIP_PRESERVE = new Set([STATUS.COMPLETED, STATUS.SKIPPED, STATUS.REJECT, STATUS.BILLING_READY]);
function autoSkipEarlierRoles(state, uptoRole, actor) {
  const idx = ROLES.indexOf(uptoRole);
  let next = state;
  for (let i = 0; i < idx; i++) {
    const role = ROLES[i];
    if (!SKIPPABLE_ROLES.has(role)) continue; // Support + Coder are never skipped
    const status = next[role]?.status;
    if (SKIP_PRESERVE.has(status)) continue;  // already resolved — leave it
    next = setRoleState(next, role,
      { status: STATUS.SKIPPED },
      { by: 'system', reason: `skipped:${uptoRole}-completed-first` },
    );
    next = pushActivity(next, evt(next, 'status', {
      role, to: STATUS.SKIPPED, by: actor, reason: `${ROLE_LABEL[uptoRole]} completed before ${ROLE_LABEL[role]}`,
    }));
  }
  return next;
}

// ── AC-1: Initialize a DOS for Support ───────────────────────────────────

/**
 * Called when a DOS is first added to a patient record. Routes it to
 * Support with status `Awaiting` (a.k.a. "Action Needed" in the story).
 *
 * If the legacy member already has data for this DOS (member.sup/cdr/...),
 * we seed from that first (`hydrateFromMember`). That keeps existing
 * assignees visible in the Assignee column without re-picking. The engine
 * only runs `autoAssignRole` when there's genuinely nobody on Support yet.
 */
export function initializeDos(map, patient, dos, opts = {}) {
  const k = dosKey(patient.id, dos.date, dos.provider, dos.pos);
  let state = map[k];
  if (!state) {
    // First touch — hydrate from any legacy member fields so existing data
    // isn't overwritten by a fresh engine pick.
    const idx = (patient.dos_list || []).findIndex(d => d.date === dos.date);
    state = hydrateFromMember(patient, dos.date, idx < 0 ? 0 : idx, dos.provider, dos.pos);
  }
  if (state.support.assignee) {
    // Already initialized (either by engine or by hydrate) — idempotent.
    return { nextMap: putState(map, state), events: [] };
  }
  const { state: assigned, picked } = autoAssignRole(
    putState(map, state), state, patient, dos, 'support', STATUS.AWAITING, 'initial'
  );
  state = assigned;
  return {
    nextMap: putState(map, state),
    events: picked
      ? [evt(state, 'init', { role: 'support', to: picked.staff.id, reason: picked.reason })]
      : [],
  };
}

// ── AC-1: Support starts work / completes / blocks ──────────────────────

export function markSupportInProgress(map, patient, dos, actor) {
  let state = getOrInit(map, patient.id, dos.date, dos.provider, dos.pos);
  state = setRoleState(state, 'support',
    { status: STATUS.IN_PROGRESS },
    { by: actor || state.support.assignee || 'system', reason: 'support-start' },
  );
  state = pushActivity(state, evt(state, 'status', {
    role: 'support', from: STATUS.AWAITING, to: STATUS.IN_PROGRESS, by: actor,
  }));
  return { nextMap: putState(map, state), events: [] };
}

/**
 * AC-1 / AC-2 — Support marks the DOS Completed → trigger Coder assignment.
 *
 * Side effects:
 *  - support.status = Completed
 *  - coder.assignee picked by engine (Astrana-pinned if patient already has one)
 *  - coder.status starts as `New`, immediately moved to `In Progress` when assigned
 */
export function completeSupport(map, patient, dos, actor) {
  let state = getOrInit(map, patient.id, dos.date, dos.provider, dos.pos);
  state = setRoleState(state, 'support',
    { status: STATUS.COMPLETED },
    { by: actor, reason: 'support-complete' },
  );
  state = pushActivity(state, evt(state, 'status', {
    role: 'support', to: STATUS.COMPLETED, by: actor,
  }));

  // Auto-assign Coder (AC-2)
  const { state: withCoder, picked } = autoAssignRole(
    putState(map, state), state, patient, dos, 'coder', STATUS.IN_PROGRESS,
    'support-completed→coder',
  );
  state = withCoder;

  return {
    nextMap: putState(map, state),
    events: picked ? [evt(state, 'assign', { role: 'coder', to: picked.staff.id, reason: picked.reason })] : [],
  };
}

export function markInsufficient(map, patient, dos, actor, reason) {
  if (!reason) throw new Error('markInsufficient: reason is mandatory');
  let state = getOrInit(map, patient.id, dos.date, dos.provider, dos.pos);
  state = setRoleState(state, 'support',
    { status: STATUS.INSUFFICIENT },
    { by: actor, reason: `insufficient:${reason}` },
  );
  state = pushActivity(state, evt(state, 'status', {
    role: 'support', to: STATUS.INSUFFICIENT, by: actor, reason, note: reason,
  }));
  return { nextMap: putState(map, state), events: [] };
}

export function rejectDos(map, patient, dos, actor, reason) {
  if (!reason) throw new Error('rejectDos: reason is mandatory');
  let state = getOrInit(map, patient.id, dos.date, dos.provider, dos.pos);
  // Reject is terminal per AC-1 — no further auto-assignment.
  state = setRoleState(state, 'support',
    { status: STATUS.REJECT },
    { by: actor, reason: `reject:${reason}` },
  );
  state = pushActivity(state, evt(state, 'status', {
    role: 'support', to: STATUS.REJECT, by: actor, reason, note: reason,
  }));
  return { nextMap: putState(map, state), events: [] };
}

// ── AC-2 / AC-3: Coder lifecycle ─────────────────────────────────────────

export function markCoderInProgress(map, patient, dos, actor) {
  let state = getOrInit(map, patient.id, dos.date, dos.provider, dos.pos);
  state = setRoleState(state, 'coder',
    { status: STATUS.IN_PROGRESS },
    { by: actor || state.coder.assignee || 'system', reason: 'coder-start' },
  );
  state = pushActivity(state, evt(state, 'status', { role: 'coder', to: STATUS.IN_PROGRESS, by: actor }));
  return { nextMap: putState(map, state), events: [] };
}

/**
 * AC-3 — Coder marks DOS Completed → assign Reviewer (100% sample, no skip).
 */
export function completeCoder(map, patient, dos, actor) {
  let state = getOrInit(map, patient.id, dos.date, dos.provider, dos.pos);
  state = setRoleState(state, 'coder',
    { status: STATUS.COMPLETED },
    { by: actor, reason: 'coder-complete' },
  );
  state = pushActivity(state, evt(state, 'status', { role: 'coder', to: STATUS.COMPLETED, by: actor }));
  // Support never worked it → mark Skipped (linear-workflow honesty).
  state = autoSkipEarlierRoles(state, 'coder', actor);

  const { state: withReviewer, picked } = autoAssignRole(
    putState(map, state), state, patient, dos, 'reviewer', STATUS.IN_PROGRESS,
    'coder-completed→reviewer',
  );
  state = withReviewer;

  return { nextMap: putState(map, state), events: picked
    ? [evt(state, 'assign', { role: 'reviewer', to: picked.staff.id, reason: picked.reason })]
    : [] };
}

// ── AC-6: Records Requested loop (Coder ↔ Support) ───────────────────────

/**
 * Coder needs more docs → returns the DOS to the original Support member
 * (not a fresh auto-assignment). All Coder work is preserved.
 */
export function requestRecords(map, patient, dos, actor) {
  let state = getOrInit(map, patient.id, dos.date, dos.provider, dos.pos);

  // Coder side: status = Record Requested
  state = setRoleState(state, 'coder',
    { status: STATUS.RECORD_REQUESTED },
    { by: actor, reason: 'records-requested' },
  );

  // Support side: re-assign to ORIGINAL Support, status = Returned
  const originalSup = state.support.originalAssignee;
  if (originalSup) {
    state = setRoleState(state, 'support',
      { assignee: originalSup, status: STATUS.RETURNED },
      { by: 'system', reason: 'records-requested:return-to-original-support' },
    );
  } else {
    // Fallback: no original Support → run the auto-assignment chain
    const pick = pickAssignee('support', ctxFor(map, patient, dos));
    if (pick) {
      state = setRoleState(state, 'support',
        { assignee: pick.staff.id, status: STATUS.RETURNED },
        { by: 'system', reason: `records-requested:no-original;${pick.reason}` },
      );
    }
  }

  state = pushActivity(state, evt(state, 'records-requested', {
    role: 'coder', from: STATUS.IN_PROGRESS, to: STATUS.RECORD_REQUESTED, by: actor,
  }));

  return { nextMap: putState(map, state), events: [] };
}

/**
 * Support finishes the retrieval and marks the DOS Completed again → DOS
 * goes back to the ORIGINAL Coder. Coder status becomes Record Received.
 * All prior coding work is preserved (we never touch ICDs in the engine).
 */
export function recordsReceived(map, patient, dos, actor) {
  let state = getOrInit(map, patient.id, dos.date, dos.provider, dos.pos);

  state = setRoleState(state, 'support',
    { status: STATUS.COMPLETED },
    { by: actor, reason: 'support-recovered-records' },
  );

  const originalCdr = state.coder.originalAssignee;
  if (originalCdr) {
    state = setRoleState(state, 'coder',
      { assignee: originalCdr, status: STATUS.RECORD_RECEIVED },
      { by: 'system', reason: 'records-received:return-to-original-coder' },
    );
  } else {
    // Should never happen in practice (Coder must have existed to request).
    // Fall through to a fresh assignment to keep the workflow alive.
    const pick = pickAssignee('coder', ctxFor(map, patient, dos));
    if (pick) {
      state = setRoleState(state, 'coder',
        { assignee: pick.staff.id, status: STATUS.RECORD_RECEIVED },
        { by: 'system', reason: `records-received:${pick.reason}` },
      );
    }
  }

  state = pushActivity(state, evt(state, 'records-received', {
    role: 'support', to: STATUS.COMPLETED, by: actor,
  }));

  return { nextMap: putState(map, state), events: [] };
}

// ── AC-3 / AC-4: Reviewer lifecycle ──────────────────────────────────────

export function markReviewerInProgress(map, patient, dos, actor) {
  let state = getOrInit(map, patient.id, dos.date, dos.provider, dos.pos);
  state = setRoleState(state, 'reviewer', { status: STATUS.IN_PROGRESS },
    { by: actor, reason: 'reviewer-start' });
  return { nextMap: putState(map, state), events: [] };
}

/**
 * QA (Reviewer) completes → ALWAYS advance to Compliance (Reviewer 2).
 *
 * The workflow is a strict linear pipeline Support → Coder → QA → Compliance,
 * so QA completion always hands off to Compliance (no sampling short-circuit
 * to Billing Ready). Any earlier role that never worked the record is skipped.
 */
export function completeReviewer(map, patient, dos, actor) {
  let state = getOrInit(map, patient.id, dos.date, dos.provider, dos.pos);
  state = setRoleState(state, 'reviewer', { status: STATUS.COMPLETED },
    { by: actor, reason: 'reviewer-complete' });
  state = pushActivity(state, evt(state, 'status', { role: 'reviewer', to: STATUS.COMPLETED, by: actor }));
  // Support / Coder never worked it → mark Skipped.
  state = autoSkipEarlierRoles(state, 'reviewer', actor);

  const { state: withReviewer2, picked } = autoAssignRole(
    putState(map, state), state, patient, dos, 'reviewer2', STATUS.IN_PROGRESS,
    'reviewer-completed→reviewer2',
  );
  state = withReviewer2;
  return { nextMap: putState(map, state), events: picked
    ? [evt(state, 'assign', { role: 'reviewer2', to: picked.staff.id, reason: picked.reason })]
    : [] };
}

// ── AC-4 / AC-5: Reviewer 2 lifecycle (terminal — always resolves to Billing Ready) ──

export function markReviewer2InProgress(map, patient, dos, actor) {
  let state = getOrInit(map, patient.id, dos.date, dos.provider, dos.pos);
  state = setRoleState(state, 'reviewer2', { status: STATUS.IN_PROGRESS },
    { by: actor, reason: 'reviewer2-start' });
  return { nextMap: putState(map, state), events: [] };
}

/**
 * AC-5 — Reviewer 2 completes → Billing Ready. There is no further review
 * tier ("Reviewer 3" does not exist), so this always terminates the chain.
 *
 * WR7 (Phase 0): validate the sampling config isn't silently violating a
 * future "minimum two reviews before ASM" rule before flipping billingReady.
 * See sampling.js's `validateAsmReadinessConfig` doc comment for why this is
 * a dormant guard, not new business logic.
 */
export function completeReviewer2(map, patient, dos, actor, config = {}) {
  let state = getOrInit(map, patient.id, dos.date, dos.provider, dos.pos);
  state = setRoleState(state, 'reviewer2', { status: STATUS.COMPLETED },
    { by: actor, reason: 'reviewer2-complete' });
  state = pushActivity(state, evt(state, 'status', { role: 'reviewer2', to: STATUS.COMPLETED, by: actor }));
  // Any earlier role that never worked it → mark Skipped.
  state = autoSkipEarlierRoles(state, 'reviewer2', actor);

  validateAsmReadinessConfig(config);

  state = { ...state, billingReady: true, asmGenerated: true };
  state = pushActivity(state, evt(state, 'billing-ready', { role: 'reviewer2', reason: 'reviewer2-completed' }));
  return { nextMap: putState(map, state), events: [] };
}

// ── AC-7: Reviewer returns ───────────────────────────────────────────────

const RETURN_TARGET = { reviewer: 'coder', reviewer2: 'reviewer' };

/**
 * Manual Return — `fromRole` clicked Returned. DOS goes back to the
 * ORIGINAL person who handled the immediate prior role (not a fresh
 * assignment). All work is preserved.
 *
 * Only valid for reviewer → coder, reviewer2 → reviewer (AC-7 "no level skipping").
 */
export function returnDos(map, patient, dos, fromRole, actor, reason) {
  const targetRole = RETURN_TARGET[fromRole];
  if (!targetRole) {
    throw new Error(`returnDos: invalid fromRole "${fromRole}"`);
  }
  let state = getOrInit(map, patient.id, dos.date, dos.provider, dos.pos);

  // Mark the reviewer's own status as Returned
  state = setRoleState(state, fromRole, { status: STATUS.RETURNED },
    { by: actor, reason: `return:${reason || 'no-reason'}` });

  // Bounce to the ORIGINAL prior-role holder
  const originalPrior = state[targetRole].originalAssignee || state[targetRole].assignee;
  if (originalPrior) {
    state = setRoleState(state, targetRole,
      { assignee: originalPrior, status: STATUS.IN_PROGRESS },
      { by: 'system', reason: `return-from-${fromRole}` },
    );
  }

  state = pushActivity(state, evt(state, 'return', {
    role: fromRole, to: STATUS.RETURNED, by: actor, reason, note: `→ ${ROLE_LABEL[targetRole]}`,
  }));

  return { nextMap: putState(map, state), events: [] };
}

// ── AC-9: Manual reassignment ────────────────────────────────────────────

/**
 * Manually reassign a role on a DOS to a different staff member. The prior
 * Active assignee is automatically marked Inactive (history-tracked).
 *
 * Astrana note: this updates the pin for the patient too — subsequent DOSs
 * for the same patient will be routed to the new person via the engine's
 * Astrana pin (which reads from `computePatientHistory`).
 */
export function reassignRole(map, patient, dos, role, newStaffId, actor, reason) {
  if (!ROLES.includes(role)) throw new Error(`reassignRole: bad role "${role}"`);
  let state = getOrInit(map, patient.id, dos.date, dos.provider, dos.pos);
  const prevId = state[role].assignee;
  if (prevId === newStaffId) return { nextMap: map, events: [] };

  state = setRoleState(state, role,
    { assignee: newStaffId },
    { by: actor, reason: `reassign:${reason || 'manual'}` },
  );
  state = pushActivity(state, evt(state, 'reassign', {
    role, from: prevId, to: newStaffId, by: actor, reason,
  }));
  return { nextMap: putState(map, state), events: [] };
}

// ── Bulk: initialize all DOSs of a patient (Astrana) ─────────────────────

/**
 * Walk through every DOS in `patient.dos_list` and initialize Support for
 * each (idempotent). Astrana pin makes sure they all land on the same
 * Support / Coder / Reviewer at every role as the workflow progresses.
 */
export function initializePatient(map, patient, opts) {
  let cur = map;
  const events = [];
  for (const dos of patient.dos_list || []) {
    const r = initializeDos(cur, patient, dos, opts);
    cur = r.nextMap;
    events.push(...r.events);
  }
  return { nextMap: cur, events };
}
