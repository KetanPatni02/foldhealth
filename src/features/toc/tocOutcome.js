/** AI Outcome label for a TOC worklist row — agent connection result. */
export function outreachStatusLabel(p) {
  if (p.aiOutcomeInitiated === false) return null;
  if (p.aiOutcomeStatus) return p.aiOutcomeStatus;
  if (!hasAgentConnectedFromLegacyFields(p)) return 'Queued';
  if (p.status === 'completed' || p.outreachStatus === 'Completed') return 'Completed';
  if (p.status === 'failed' || p.status === 'review' || p.outreachStatus === 'Overdue') return 'Needs Review';
  if (p.outreachStatus === 'Attempted') return 'Needs Review';
  return 'Queued';
}

/** True once the TOC agent has connected with the patient (assessment + tasks exist). */
export function hasAgentConnected(p) {
  if (p.aiOutcomeInitiated === false) return false;
  const label = outreachStatusLabel(p);
  return label === 'Completed' || label === 'Needs Review';
}

function hasAgentConnectedFromLegacyFields(p) {
  if (p.status === 'oncall' || p.status === 'queued' || p.status === 'scheduled') return false;
  if (p.status === 'completed' || p.status === 'failed' || p.status === 'review') return true;
  if (p.outreachStatus === 'Completed' || p.outreachStatus === 'Attempted') return true;
  return false;
}

/** Task badge count — zero until the agent has talked to the member. */
export function resolveAiTaskCount(p) {
  if (!hasAgentConnected(p)) return 0;
  return Math.max(0, Number(p?.tasks) || 0);
}

/** "On: 08/18/2026, 07:36pm" — shown below the AI Outcome badge after invoke. */
export function formatAiOutcomeInvokedAt(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
  const time = d
    .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    .replace(/\s/g, '')
    .toLowerCase();
  return `On: ${date}, ${time}`;
}
