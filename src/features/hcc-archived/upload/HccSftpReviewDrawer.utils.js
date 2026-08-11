import { ICDS } from '../data/icds';

export function groupEncountersByPatient(encounters) {
  const groups = new Map();
  for (const enc of encounters) {
    const key = enc.patient?.matchedMemberId
      ? `m-${enc.patient.matchedMemberId}`
      : `u-${enc.patient?.name || ''}-${enc.patient?.dob || ''}`;
    if (!groups.has(key)) {
      groups.set(key, { key, patient: enc.patient, encounters: [] });
    }
    groups.get(key).encounters.push(enc);
  }
  return Array.from(groups.values());
}

export function sftpEncStatus(enc) {
  if (!enc?.patient?.matchedMemberId || enc?.patient?.idMismatch) return 'mismatch';
  if (Array.isArray(enc?.errors) && enc.errors.length > 0) return 'error';
  return 'ready';
}

export function countFlaggedEncounters(encounters) {
  let count = 0;
  for (const e of encounters || []) {
    if (!e.patient?.matchedMemberId || (e.errors && e.errors.length > 0)) count += 1;
  }
  return count;
}

export function highConfidenceSftpIdxs(encs) {
  const idxs = [];
  for (let i = 0; i < encs.length; i++) {
    const e = encs[i];
    if ((e.patient?.matchConfidence ?? 0) >= 85
        && e.patient?.matchedMemberId
        && (!e.errors || e.errors.length === 0)) {
      idxs.push(i);
    }
  }
  return idxs;
}

export const ICD_LOOKUP = (() => {
  const map = new Map();
  Object.values(ICDS || {}).forEach(list => {
    (list || []).forEach(entry => {
      if (entry?.code && !map.has(entry.code)) {
        map.set(entry.code, { desc: entry.desc || '', hcc: entry.hcc || '' });
      }
    });
  });
  return map;
})();
