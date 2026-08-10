export function encStatus(enc) {
  if (!enc?.patient?.matchedMemberId) return 'mismatch';
  if (Array.isArray(enc?.errors) && enc.errors.length > 0) return 'error';
  return 'ready';
}

export function flaggedCount(batch) {
  let count = 0;
  for (const e of batch.encounters || []) {
    if (!e.patient?.matchedMemberId || (e.errors && e.errors.length > 0)) count += 1;
  }
  return count;
}
