/** Resolve display name when a patient may live in any worklist member slice. */
export function selectPatientNameFromMemberSlices(state, patientId) {
  if (!patientId) return undefined;
  const match = (m) => m && (m.id === patientId || String(m.memberId) === String(patientId));
  const src = (state.patients || []).find(match)
    || (state.hccMembers || []).find(match)
    || (state.awvMembers || []).find(match)
    || (state.ccmWorklistMembers || []).find(match)
    || (state.snpWorklistMembers || []).find(match)
    || (state.hedisMembers || []).find(match)
    || (state.allPatients || []).find(match);
  return src?.name;
}
