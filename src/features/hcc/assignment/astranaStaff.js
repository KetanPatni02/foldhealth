// Astrana staff roster for the HCC assignment engine.
//
// This is the single source of truth used by `engine.js` to pick an assignee
// at every role transition (Support → Coder → R1 → R2 → R3). Members of the
// roster are real names used by the existing mock data + the story examples
// so the engine's output looks consistent with what already appears in the
// worklist and activity log.
//
// Each entry exposes:
//   id        — short stable handle (e.g. 'EJ', 'DH'). Used everywhere internally.
//   name      — full display name surfaced in the UI.
//   initials  — 2-letter avatar initials.
//   role      — primary role this person works ('support' | 'coder' | 'r1' | 'r2' | 'r3').
//   active    — false = on leave / inactive. Excluded from auto-assignment.
//   tins      — TIN strings this person owns (Support + Coder use these).
//   vendors   — vendor codes routed to this person (Coder + R2/R3 use these).
//   capacity  — soft monthly DOS cap. The workload-balancer prefers members
//               whose current count is furthest from capacity.
//
// Role pools deliberately overlap a bit (e.g. K. Patel handles R1 and R2 at
// different times) to mirror real life — the engine never picks the same
// person for two roles on the same DOS (see engine.js `excludePeer`).

export const ASTRANA_STAFF = [
  // ─── Support (Medical Support Staff) ──────────────────────────────
  { id: 'EJ', name: 'E. Johnson',    initials: 'EJ', role: 'support', active: true,  tins: ['TIN-1001','TIN-1004'], vendors: [],         capacity: 80 },
  { id: 'AB', name: 'A. Beauchamp',  initials: 'AB', role: 'support', active: true,  tins: ['TIN-1002'],            vendors: [],         capacity: 70 },
  { id: 'KS', name: 'K. Stroman',    initials: 'KS', role: 'support', active: true,  tins: ['TIN-1003'],            vendors: [],         capacity: 70 },
  { id: 'LT', name: 'L. Torrance',   initials: 'LT', role: 'support', active: true,  tins: [],                      vendors: [],         capacity: 60 },
  { id: 'MT', name: 'M. Thompson',   initials: 'MT', role: 'support', active: true,  tins: ['TIN-1005'],            vendors: [],         capacity: 70 },
  { id: 'OT', name: 'O. Twist',      initials: 'OT', role: 'support', active: true,  tins: [],                      vendors: [],         capacity: 70 },

  // ─── Coder ────────────────────────────────────────────────────────
  { id: 'DH', name: 'Deborah Hintz', initials: 'DH', role: 'coder',   active: true,  tins: ['TIN-1001','TIN-1002'], vendors: ['CIOX'],   capacity: 60 },
  { id: 'PP', name: 'P. Plourde',    initials: 'PP', role: 'coder',   active: true,  tins: ['TIN-1003','TIN-1005'], vendors: ['MRO'],    capacity: 60 },
  { id: 'CK', name: 'C. Kessler',    initials: 'CK', role: 'coder',   active: true,  tins: ['TIN-1004'],            vendors: [],         capacity: 60 },

  // ─── Reviewer 1 ───────────────────────────────────────────────────
  { id: 'MA', name: 'M. Almeda',     initials: 'MA', role: 'r1',      active: true,  tins: [], vendors: [],          capacity: 50 },
  { id: 'BO', name: 'B. Olafson',    initials: 'BO', role: 'r1',      active: true,  tins: [], vendors: ['CIOX'],    capacity: 50 },
  { id: 'EF', name: 'E. Fortier',    initials: 'EF', role: 'r1',      active: true,  tins: [], vendors: [],          capacity: 50 },

  // ─── Reviewer 2 ───────────────────────────────────────────────────
  { id: 'KP', name: 'K. Patel',      initials: 'KP', role: 'r2',      active: true,  tins: [], vendors: [],          capacity: 30 },
  { id: 'NR', name: 'N. Richards',   initials: 'NR', role: 'r2',      active: true,  tins: [], vendors: ['CIOX'],    capacity: 30 },

  // ─── Reviewer 3 ───────────────────────────────────────────────────
  { id: 'BO3', name: 'B. Olafson',   initials: 'BO', role: 'r3',      active: true,  tins: [], vendors: [],          capacity: 20 },
  { id: 'JM',  name: 'J. Martinez',  initials: 'JM', role: 'r3',      active: true,  tins: [], vendors: [],          capacity: 20 },
];

// Map role → array of staff in that pool. Inactive members are kept here for
// `staffById` lookups (used by the Activity Log) but filtered out by the
// engine via `activeStaffForRole`.
const _byRole = ASTRANA_STAFF.reduce((acc, s) => {
  (acc[s.role] = acc[s.role] || []).push(s);
  return acc;
}, {});

const _byId = Object.fromEntries(ASTRANA_STAFF.map(s => [s.id, s]));

export const ROLES = ['support', 'coder', 'r1', 'r2', 'r3'];

export const ROLE_LABEL = {
  support: 'Support',
  coder:   'Coder',
  r1:      'Reviewer 1',
  r2:      'Reviewer 2',
  r3:      'Reviewer 3',
};

export function staffById(id) { return _byId[id] || null; }

export function staffForRole(role)       { return _byRole[role] || []; }
export function activeStaffForRole(role) { return (_byRole[role] || []).filter(s => s.active); }

// TIN mapping — returns the (active) staff in `role` who owns the given TIN.
// Multiple matches are allowed; the caller (engine) workload-balances among them.
export function staffForTin(role, tin) {
  if (!tin) return [];
  return activeStaffForRole(role).filter(s => (s.tins || []).includes(tin));
}

// Vendor mapping — same shape as `staffForTin`.
export function staffForVendor(role, vendor) {
  if (!vendor) return [];
  return activeStaffForRole(role).filter(s => (s.vendors || []).includes(vendor));
}
