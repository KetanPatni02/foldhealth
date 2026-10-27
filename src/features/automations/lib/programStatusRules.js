/* Care program status → care plan item (GBI) status. When a program moves to
   Unable to Reach, Paused, Completed or Closed, active automations triggered
   by "A patient's care program status changes" set every open goal,
   intervention and barrier in that program's plan to the mapped status with
   a reason. Pure JS; the store applies it (runProgramStatusRules).

   Precedence: an automation scoped to the program's type overrides the
   account default (one with no program types) for the same status. */

import { isClosedStatus } from '../../patient/right-panel/tabs/care-programs/care-plan/lib/gbiStatus';

// The program statuses a rule can watch. Closed covers Discontinued and the
// legacy Closed status.
export const PROGRAM_STATUS_TRIGGERS = [
  { key: 'utr', label: 'Unable to Reach', statuses: ['Unable to Reach'] },
  { key: 'paused', label: 'Paused', statuses: ['Paused'] },
  { key: 'completed', label: 'Completed', statuses: ['Completed'] },
  { key: 'closed', label: 'Closed', statuses: ['Discontinued', 'Closed'] },
];
export const programStatusTriggerOf = (status) => PROGRAM_STATUS_TRIGGERS.find(t => t.statuses.includes(status))?.key || null;
export const programStatusLabel = (key) => PROGRAM_STATUS_TRIGGERS.find(t => t.key === key)?.label || key;

const triggerOf = (graph) => graph?.nodes?.find(n => n.id === 'trigger') || null;

export const GBI_KINDS = [
  { key: 'goal', label: 'Goals' },
  { key: 'intervention', label: 'Interventions' },
  { key: 'barrier', label: 'Barriers' },
];

/** Active "program status changes" automations, read as rules. */
export function programStatusRulesOf(automations) {
  return (automations || [])
    .filter(a => a.status === 'active' && triggerOf(a.graph)?.type === 'careProgramStatusChanged')
    .map((a) => {
      const trigger = triggerOf(a.graph);
      const action = a.graph.nodes.find(n => n.type === 'setGbiStatus');
      return {
        id: a.id,
        name: a.name,
        programCodes: trigger?.config?.programCodes || [],
        on: trigger?.config?.programStatuses || [],
        toStatus: action?.config?.toStatus || '',
        reason: action?.config?.reason || '',
        kinds: action?.config?.kinds?.length ? action.config.kinds : GBI_KINDS.map(k => k.key),
        actionNodeId: action?.id || null,
        updatedAt: a.updatedAt || '',
      };
    })
    .filter(r => r.toStatus && r.actionNodeId);
}

/**
 * The rules that apply when a program of `programCode` moves to
 * `programStatus`: the ones scoped to that program type if any, else the
 * account defaults. Several in the same tier all apply, newest last, so the
 * most recently edited one decides an item both touch.
 */
export function rulesForProgramStatus(rules, programCode, programStatus) {
  const key = programStatusTriggerOf(programStatus);
  if (!key) return [];
  const watching = (rules || []).filter(r => r.on.includes(key));
  const specific = watching.filter(r => r.programCodes.includes(programCode));
  const chosen = specific.length ? specific : watching.filter(r => !r.programCodes.length);
  return [...chosen].sort((a, b) => String(a.updatedAt).localeCompare(String(b.updatedAt)));
}

/**
 * The status changes to make: every open item of the rule's kinds that isn't
 * already at the target. Closed items (Met, Not Met, Resolved, Discontinued,
 * Not Applicable) keep their outcome.
 * `items` is { goal: [], intervention: [], barrier: [] } of { id, title, status }.
 */
export function gbiTransitions(items, rules) {
  const byId = new Map();
  for (const rule of rules) {
    for (const kind of rule.kinds) {
      for (const item of items[kind] || []) {
        if (isClosedStatus(item.status) || item.status === rule.toStatus) continue;
        byId.set(`${kind}:${item.id}`, { kind, id: item.id, title: item.title || '', from: item.status || 'Not Started', to: rule.toStatus, reason: rule.reason, ruleId: rule.id });
      }
    }
  }
  return [...byId.values()];
}
