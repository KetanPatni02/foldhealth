// Per-DOS assignment state shape + read/write helpers.
//
// The existing member model carries one set of role assignees + statuses at
// the **member** level (`member.sup`, `member.supS`, etc.). For Astrana we
// need state per (patient, DOS) tuple so that multiple DOSs for one patient
// can each have their own status while still being pinned to the same staff
// member at every role (the Astrana invariant).
//
// We keep the existing top-level member fields intact for backwards
// compatibility (the worklist table still reads them), but mirror everything
// into a `hccDosAssignments` map in the store, keyed by `${patientId}::${dos}`.
//
//   hccDosAssignments[`${patientId}::${dosDate}`] = {
//     patientId, dosDate,
//     support: RoleState, coder: RoleState, r1: RoleState, r2: RoleState, r3: RoleState,
//     sampling: { r2: null|true|false, r3: null|true|false },
//     billingReady: boolean,
//     asmGenerated: boolean,
//     activity: ActivityEntry[],
//   }
//
//   RoleState = {
//     assignee:        staffId | null,    // currently Active assignee
//     status:          canonical status string | null,
//     originalAssignee: staffId | null,   // first person ever on this role for this DOS
//     history:         [{ assignee, status, at, active: bool }, …]
//   }
//
// Active vs Inactive (AC-9):
//   `assignee` is always the Active one. The full audit trail is in `history`.

import { ROLES } from './astranaStaff';

export const dosKey = (patientId, dosDate) => `${patientId}::${dosDate}`;

// Status keys used by the lifecycle. Mirror what's in statusSpec.js plus a
// few engine-only sentinels (`Assign`, `Billing Ready`).
export const STATUS = {
  ASSIGN:           'Assign',           // role exists but no one picked yet
  NEW:              'New',              // role just received the DOS
  AWAITING:         'Awaiting',         // Support default (a.k.a. Action Needed)
  IN_PROGRESS:      'In Progress',
  COMPLETED:        'Completed',
  RECORD_REQUESTED: 'Record Requested',
  RECORD_RECEIVED:  'Record Received',
  RETURNED:         'Returned',
  INSUFFICIENT:     'Insufficient',
  REJECT:           'Reject',
  BILLING_READY:    'Billing Ready',
};

const EMPTY_ROLE_STATE = () => ({
  assignee: null,
  status: null,
  originalAssignee: null,
  history: [],
});

// Build a fresh blank DOS-state record. Used the first time we touch a DOS.
export function blankDosState(patientId, dosDate) {
  return {
    patientId,
    dosDate,
    support: EMPTY_ROLE_STATE(),
    coder:   EMPTY_ROLE_STATE(),
    r1:      EMPTY_ROLE_STATE(),
    r2:      EMPTY_ROLE_STATE(),
    r3:      EMPTY_ROLE_STATE(),
    sampling: { r2: null, r3: null },
    billingReady: false,
    asmGenerated: false,
    activity: [],
  };
}

// Pure setter — returns a new DOS-state with `role` partially merged. Always
// keeps `history` immutable + appends rather than overwriting.
export function setRoleState(state, role, patch, meta = {}) {
  if (!ROLES.includes(role)) {
    throw new Error(`setRoleState: unknown role "${role}"`);
  }
  const prev = state[role];
  const next = { ...prev, ...patch };

  // Track originalAssignee the first time someone is assigned to this role.
  if (patch.assignee && !prev.originalAssignee) {
    next.originalAssignee = patch.assignee;
  }

  // Append to history whenever assignee OR status changes.
  const assigneeChanged = patch.assignee !== undefined && patch.assignee !== prev.assignee;
  const statusChanged   = patch.status   !== undefined && patch.status   !== prev.status;
  if (assigneeChanged || statusChanged) {
    // Mark the prior assignee Inactive (AC-9) by setting active:false on the
    // last history entry that matched their id. We push a new entry below.
    const history = prev.history.map((h, i) =>
      i === prev.history.length - 1 && h.active
        ? { ...h, active: false, deactivatedAt: meta.at || new Date().toISOString() }
        : h
    );
    history.push({
      assignee: next.assignee,
      status:   next.status,
      at:       meta.at || new Date().toISOString(),
      by:       meta.by || 'system',
      reason:   meta.reason || null,
      active:   true,
    });
    next.history = history;
  }

  return { ...state, [role]: next };
}

// Pure pusher for activity-log entries. Keeps the array bounded so the
// in-memory store doesn't grow forever during a long demo session.
const MAX_ACTIVITY = 200;
export function pushActivity(state, entry) {
  const next = [...state.activity, { ...entry, at: entry.at || new Date().toISOString() }];
  if (next.length > MAX_ACTIVITY) next.splice(0, next.length - MAX_ACTIVITY);
  return { ...state, activity: next };
}

// Compute the workload map across all DOS-state records in the store. A
// staff member's workload is the count of DOSs where they are the current
// Active assignee at any role (open status — not Completed / Reject).
const TERMINAL_STATUSES = new Set([STATUS.COMPLETED, STATUS.REJECT, STATUS.BILLING_READY]);
export function computeWorkload(dosStateMap) {
  const workload = {};
  for (const state of Object.values(dosStateMap || {})) {
    for (const role of ROLES) {
      const rs = state[role];
      if (!rs?.assignee) continue;
      if (TERMINAL_STATUSES.has(rs.status)) continue;
      workload[rs.assignee] = (workload[rs.assignee] || 0) + 1;
    }
  }
  return workload;
}

// Compute the per-patient assignee history map used by the engine to enforce
// the Astrana pin + same-patient preference. For each patient, returns the
// currently-Active assignee at each role across all of that patient's DOSs.
export function computePatientHistory(dosStateMap) {
  const history = {};
  for (const state of Object.values(dosStateMap || {})) {
    const pid = state.patientId;
    if (!pid) continue;
    history[pid] = history[pid] || {};
    for (const role of ROLES) {
      const rs = state[role];
      if (!rs?.assignee) continue;
      // First write wins per (patient, role) — Astrana pins to the first
      // person who ever held the role.
      if (!history[pid][role]) {
        history[pid][role] = {
          assignee: rs.assignee,
          since: rs.history?.[0]?.at || null,
        };
      }
    }
  }
  return history;
}

// Map from short staff initials (used by the legacy member model) to a
// best-effort staff id. Lets us hydrate the new map from old member fields
// without forcing a Supabase migration.
export function inferStaffIdFromName(name) {
  if (!name) return null;
  const parts = String(name).trim().split(/\s+/);
  if (!parts.length) return null;
  // "E. Johnson" → "EJ", "Deborah Hintz" → "DH", "N. Richards" → "NR"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0].replace(/[^A-Z]/gi, '')[0];
  const last  = parts[parts.length - 1][0];
  return `${first || ''}${last || ''}`.toUpperCase();
}

// Hydrate a per-DOS state from the legacy member fields. Used once at boot
// per (member, dos) so the engine has somewhere to read from before the user
// drives any transitions. Returns a fully-formed DosState.
export function hydrateFromMember(member, dosDate, idx = 0) {
  // Only the first DOS gets the legacy assignees — additional DOSs for the
  // same patient inherit those values through the Astrana pin, so we leave
  // them blank and let the engine fill them.
  const initial = blankDosState(member.id, dosDate);
  if (idx !== 0) return initial;

  const seed = [
    { role: 'support', name: member.sup, status: member.supS },
    { role: 'coder',   name: member.cdr, status: member.cdrS },
    { role: 'r1',      name: member.r1,  status: member.r1s },
    { role: 'r2',      name: member.r2,  status: member.r2s },
    { role: 'r3',      name: member.r3,  status: member.r3s },
  ];

  let state = initial;
  for (const { role, name, status } of seed) {
    const id = inferStaffIdFromName(name);
    if (!id && !status) continue;
    state = setRoleState(state, role,
      { assignee: id, status: status || null },
      { by: 'hydrate', reason: 'seed-from-member' },
    );
  }
  return state;
}
