import { resolvePatientStoreId } from './resolvePatientStoreId';

const MEMBER_SLICES = [
  'hccMembers',
  'awvMembers',
  'ccmWorklistMembers',
  'snpWorklistMembers',
  'hedisMembers',
  'allPatients',
];

function memberRowToCallPatient(row) {
  if (!row?.name) return null;
  const id = row.patientId || row.id;
  return {
    id,
    name: row.name,
    language: row.language || 'en',
    initials: row.initials || row.in,
    gender: row.gender ?? row.g,
    age: row.age,
    memberId: row.memberId,
  };
}

/**
 * Resolve a patient record for CallPopover from any id the worklist / profile
 * surfaces pass (patients.id, worklist row id, memberId, patientId).
 */
export function resolvePatientForCall(state, patientId) {
  if (!patientId || !state) return null;

  const canonicalId = resolvePatientStoreId(state, patientId);
  const direct = state.patients?.find(
    (p) => p.id === canonicalId || p.id === patientId,
  );
  if (direct) return direct;

  for (const key of MEMBER_SLICES) {
    const rows = state[key];
    if (!rows?.find) continue;
    const row = rows.find(
      (m) => m?.id === canonicalId
        || m?.id === patientId
        || m?.patientId === canonicalId
        || m?.patientId === patientId
        || String(m?.memberId) === String(patientId),
    );
    if (!row) continue;
    const linked = row.patientId
      ? state.patients?.find((p) => p.id === row.patientId)
      : null;
    if (linked) return linked;
    return memberRowToCallPatient(row);
  }

  return null;
}

/** Prefer linked patient id when a worklist row carries one. */
export function worklistMemberCallId(member) {
  if (!member) return null;
  return member.patientId || member.id;
}
