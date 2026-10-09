/**
 * What adding a template that is already on a plan does
 * (care_plan_templates.renewal).
 *
 *   extend     the same instance keeps its start date; its end date moves
 *              out by the template's longest goal duration
 *   reinstate  the current instance is auto-closed (completed when every goal
 *              and intervention is met, closed otherwise) and a new one starts,
 *              with the old items kept as history
 */
export const TEMPLATE_RENEWALS = {
  extend: {
    label: 'Extend',
    hint: 'Keep the start date and push the end date out. For ongoing conditions.',
    icon: 'solar:calendar-add-linear',
  },
  reinstate: {
    label: 'Reinstate',
    hint: 'Close the current one and start again, keeping its history. For events like a transition of care.',
    icon: 'solar:restart-linear',
  },
};
export const RENEWAL_CHOICES = ['extend', 'reinstate'];

/** Condition templates are ongoing care; anything else is tied to an event. */
export const defaultRenewalFor = (conditions) => ((conditions || []).length ? 'extend' : 'reinstate');

export const renewalOf = (template) => (TEMPLATE_RENEWALS[template?.renewal]
  ? template.renewal
  : defaultRenewalFor(template?.conditions));

export const INSTANCE_STATUS = {
  active: { label: 'Active', tone: 'primary' },
  completed: { label: 'Completed', tone: 'success' },
  closed: { label: 'Closed', tone: 'grey' },
};

const DONE = new Set(['Met', 'Completed', 'Resolved']);
const UNIT_DAYS = { day: 1, week: 7 };

function addDuration(from, amount, unit) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const u = (unit || '').toLowerCase().replace(/s$/, '');
  if (u === 'month') d.setMonth(d.getMonth() + amount);
  else if (u === 'year') d.setFullYear(d.getFullYear() + amount);
  else if (UNIT_DAYS[u]) d.setDate(d.getDate() + amount * UNIT_DAYS[u]);
  else return null;
  return d;
}

const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * The end date a template run started (or extended) on `from` reaches: `from`
 * plus the longest duration among its goals. Null when no goal has one, so
 * nothing is shown rather than a made-up date.
 */
export function templateEndsOn(template, libraryGoals = [], from = new Date()) {
  let latest = null;
  for (const entry of template?.goals || []) {
    const lib = libraryGoals.find(g => g.id === entry?.id) || entry;
    const amount = Number(lib?.duration);
    if (!amount || lib?.setTarget === false) continue;
    const end = addDuration(from, amount, lib.durationUnit);
    if (end && (!latest || end > latest)) latest = end;
  }
  return latest ? isoDay(latest) : null;
}

/** Completed when every goal and intervention is met; closed otherwise. */
export function instanceOutcome({ goals = [], interventions = [] }) {
  const items = [...goals, ...interventions];
  const done = items.filter(i => DONE.has(i.status)).length;
  return {
    status: items.length > 0 && done === items.length ? 'completed' : 'closed',
    done,
    total: items.length,
  };
}

/** "Sep 2, 2026", from an ISO timestamp or a date-only string (read locally). */
export function formatInstanceDate(value) {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
