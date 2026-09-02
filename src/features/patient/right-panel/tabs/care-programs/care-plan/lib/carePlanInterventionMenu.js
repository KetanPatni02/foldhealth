/** Intervention type picker — Figma SNP-Story 2632:91999, shared with CreateGoalDrawer. */
export const CARE_PLAN_INTERVENTION_MENU = [
  { key: 'send-form', label: 'Send Form', icon: 'solar:document-add-linear' },
  { key: 'patient-education', label: 'Patient Education', icon: 'solar:book-2-linear' },
  { key: 'patient-task', label: 'Patient Task', icon: 'solar:checklist-minimalistic-linear' },
  { key: 'measure-vital', label: 'Measure Vital', icon: 'solar:heart-pulse-linear' },
  { divider: true },
  { key: 'internal-task', label: 'Internal Task', icon: 'solar:clipboard-check-linear' },
];

export const CARE_PLAN_INTERVENTION_ICONS = Object.fromEntries(
  CARE_PLAN_INTERVENTION_MENU.filter(i => i.key).map(i => [i.key, i.icon]),
);

export function interventionDurationFromConfig(config) {
  if (!config?.dueOffset) return null;
  const unit = (config.dueUnit || 'day')[0];
  return `${config.dueOffset}${unit}`;
}

export function interventionPriorityFromConfig(config) {
  const p = String(config?.priority || 'medium').toLowerCase();
  return p === 'high' || p === 'low' ? p : 'medium';
}
