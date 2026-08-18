/** AI Outcome label for a TOC worklist row — agent connection result. */
export function outreachStatusLabel(p) {
  if (p.status === 'completed' || p.outreachStatus === 'Completed') return 'Completed';
  if (p.status === 'failed' || p.status === 'review' || p.outreachStatus === 'Overdue') return 'Needs Review';
  if (p.outreachStatus === 'Attempted') return 'Needs Review';
  return 'Queued';
}

/** True once the TOC agent has connected with the patient (assessment + tasks exist). */
export function hasAgentConnected(p) {
  return outreachStatusLabel(p) !== 'Queued';
}

/** Task badge count — zero until the agent has talked to the member. */
export function resolveAiTaskCount(p) {
  if (!hasAgentConnected(p)) return 0;
  return Math.max(0, Number(p?.tasks) || 0);
}
