// PCP Outreach: one call, email or visit with a PCP office about several of
// its patients. The patient list is the patients with an open record (DOS)
// where that PCP is the rendering provider, once each.

const CLOSED = new Set(['Billed', 'Rejected', 'Reject']);

/** "1961-05-22" or a Date → "05/22/1961"; other strings as given. */
export function formatDob(dob) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dob ?? ''));
  return m ? `${m[2]}/${m[3]}/${m[1]}` : (dob || null);
}

/** A record is open until it is billed or rejected, or Compliance completes it. */
export function isOpenRecord(member) {
  const statuses = [member?.supS, member?.cdrS, member?.r1s, member?.r2s];
  if (statuses.some(s => CLOSED.has(s))) return false;
  return member?.r2s !== 'Completed';
}

/** Rendering providers with at least one open record, A to Z. */
export function pcpOptions(members) {
  return [...new Set((members || []).filter(isOpenRecord).map(m => m.rp).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

/**
 * The PCP's patients for the picker: one per Member ID, from records with an
 * open DOS where the PCP is the rendering provider.
 * @returns {{ key, name, dob, memberId, member }[]}
 */
export function patientsForPcp(members, pcp) {
  const byKey = new Map();
  for (const m of members || []) {
    if (!pcp || m.rp !== pcp || !isOpenRecord(m)) continue;
    const key = String(m.memberId || m.id);
    if (!byKey.has(key)) byKey.set(key, { key, name: m.name, dob: formatDob(m.dob), memberId: m.memberId || null, member: m });
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Our side of the call. The PCP side is the PCP or the PCP's office.
export const PCP_CALL_OUR_LINES = ['Delores Conn (581 824-1591)', 'Practice Line (800 000-0000)'];
export const pcpCallLines = (pcp) => [pcp ? `${pcp} (PCP)` : null, 'PCP Office'].filter(Boolean);

// Note outcomes for PCP Outreach (optional, unlike Successful / Unsuccessful).
export const PCP_NOTE_OUTCOMES = ['Provider Communication', 'Records Requested', 'Mailed', 'Follow-up Needed', 'General Note'];
