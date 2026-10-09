// Draft model for the care plan: the live tables are the working draft and the
// latest signed version's snapshot is the published plan. "Unsigned changes"
// is a field-level diff between the two, so it stays exact no matter how many
// times an item was edited back and forth since the last signature.
//
// Only what the plan *is* waits for a signature: its items, how they link, the
// templates and conditions, and the details set through each item's Edit
// drawer (target, measure, type, description...). Day-to-day progress on the
// signed plan applies at once and is recorded as activity: see LIVE_FIELDS.
// Readings and notes are live too.

export const CARE_PLAN_SNAPSHOT_SCHEMA = 2;

/**
 * Fields that apply immediately, without a signature. They are copied from the
 * live rows onto the signed plan, never reported as unsigned changes, and kept
 * as they are when a draft is discarded.
 */
export const LIVE_FIELDS = {
  goal: ['title', 'status', 'priority', 'progress', 'currentValue', 'trend'],
  intervention: ['title', 'status', 'priority', 'assignee', 'adherence'],
  barrier: ['title', 'status', 'priority'],
};

/** Intervention config keys set inline from the row (due date, recurrence). */
export const LIVE_CONFIG_KEYS = [
  'dueDateOverride', 'repeat', 'repeatCount', 'repeatEvery', 'repeatEveryUnit', 'repeatEnds', 'repeatEndsUnit',
];

/** `item` (signed or snapshot) with the live fields of `live` laid over it. */
export function withLiveValues(type, item, live) {
  if (!item || !live) return item;
  const out = { ...item };
  for (const f of LIVE_FIELDS[type] || []) if (f in live) out[f] = live[f];
  if (type === 'intervention') {
    const config = { ...(item.config || {}) };
    for (const k of LIVE_CONFIG_KEYS) {
      if (live.config && k in live.config) config[k] = live.config[k];
      else delete config[k];
    }
    out.config = config;
    if (live.taskId !== undefined) out.taskId = live.taskId;
  }
  return out;
}

// Snapshots cut before schema 2 hold goals and interventions only, so barriers
// and templates cannot be compared or restored from them.
export function isFullSnapshot(snapshot) {
  return (snapshot?.schema || 0) >= CARE_PLAN_SNAPSHOT_SCHEMA;
}

function stripVolatile(item) {
  if (!item) return item;
  const { links: _links, ...rest } = item;
  return rest;
}

// One entry per id: a row the store briefly holds twice is still one row.
export function uniqueById(list) {
  const seen = new Map();
  for (const item of list || []) if (item?.id != null) seen.set(String(item.id), item);
  return [...seen.values()];
}

/** Everything a signed version needs to be compared against and restored from. */
export function buildCarePlanSnapshot(slice) {
  const plan = slice?.plan || {};
  return {
    schema: CARE_PLAN_SNAPSHOT_SCHEMA,
    conditions: (plan.conditions || []).map(c => (typeof c === 'string' ? c : c.label)).filter(Boolean),
    appliedTemplateIds: (plan.appliedTemplateIds || []).map(String),
    appliedTemplatePriorities: { ...(plan.appliedTemplatePriorities || {}) },
    goals: uniqueById(slice?.goals).map(stripVolatile),
    interventions: uniqueById(slice?.interventions).map(stripVolatile),
    barriers: uniqueById(slice?.barriers).map(b => ({ ...stripVolatile(b), goalIds: [...(b.goalIds || [])] })),
  };
}

const sortedSet = list => [...new Set((list || []).map(String))].sort();
const sameList = (a, b) => JSON.stringify(sortedSet(a)) === JSON.stringify(sortedSet(b));
const text = v => (v == null ? '' : String(v).trim());

// The Edit-drawer part of an intervention's config. taskId is the paired task,
// title mirrors the row's own title, and the scheduling keys are set inline.
const CONFIG_IGNORED = new Set(['taskId', 'title', ...LIVE_CONFIG_KEYS]);
function interventionConfig(config) {
  const keys = Object.keys(config || {}).filter(k => !CONFIG_IGNORED.has(k)).sort();
  return JSON.stringify(keys.map(k => [k, config[k]]));
}

const FIELDS = {
  goal: [
    { key: 'subtitle', label: 'Description' },
    { key: 'category', label: 'Category' },
    { key: 'measure', label: 'Measure' },
    { key: 'target', label: 'Target', get: g => [g.comparator, g.targetValue, g.targetValue2, g.customUnit].map(text).filter(Boolean).join(' ') },
    { key: 'setTarget', label: 'Set target', get: g => (g.setTarget === false ? 'No' : 'Yes') },
    { key: 'targetDate', label: 'Target date' },
    { key: 'duration', label: 'Duration', get: g => [g.duration, g.durationUnit].map(text).filter(Boolean).join(' ') },
    { key: 'frequency', label: 'Frequency' },
    { key: 'conditions', label: 'Conditions', list: true },
  ],
  intervention: [
    { key: 'kind', label: 'Type' },
    { key: 'goalId', label: 'Goal', ref: 'goal' },
    { key: 'duration', label: 'Duration' },
    { key: 'config', label: 'Details', get: i => interventionConfig(i.config), opaque: true },
  ],
  barrier: [
    { key: 'description', label: 'Description' },
    { key: 'goalIds', label: 'Goals', list: true, ref: 'goal' },
  ],
};

function fieldValue(field, item) {
  if (field.get) return field.get(item);
  const v = item?.[field.key];
  return field.list ? sortedSet(v) : text(v);
}

function fieldChanges(type, before, after, goalTitle) {
  const out = [];
  for (const field of FIELDS[type]) {
    const a = fieldValue(field, before);
    const b = fieldValue(field, after);
    const equal = field.list ? sameList(a, b) : a === b;
    if (equal) continue;
    const show = v => {
      if (field.opaque) return '';
      if (field.ref === 'goal') {
        const ids = Array.isArray(v) ? v : (v ? [v] : []);
        return ids.map(goalTitle).filter(Boolean).join(', ');
      }
      return Array.isArray(v) ? v.join(', ') : v;
    };
    out.push({ key: field.key, label: field.label, from: show(a), to: show(b) });
  }
  return out;
}

function diffList(type, beforeList, afterList, goalTitle) {
  const before = new Map((beforeList || []).map(x => [String(x.id), x]));
  const after = new Map((afterList || []).map(x => [String(x.id), x]));
  const changes = [];
  for (const [id, item] of after) {
    const prev = before.get(id);
    if (!prev) {
      changes.push({ entityType: type, entityId: id, title: item.title || '', action: 'added', fields: [] });
      continue;
    }
    const fields = fieldChanges(type, prev, item, goalTitle);
    if (fields.length) changes.push({ entityType: type, entityId: id, title: item.title || prev.title || '', action: 'changed', fields });
  }
  for (const [id, item] of before) {
    if (!after.has(id)) changes.push({ entityType: type, entityId: id, title: item.title || '', action: 'removed', fields: [] });
  }
  return changes;
}

/**
 * Changes between two snapshots (or a snapshot and the live draft, passed
 * through buildCarePlanSnapshot). `templateName(id)` resolves template names.
 * Returns { changes, partial } where `partial` means the older side predates
 * full snapshots, so barriers and templates were not compared.
 */
export function diffCarePlanSnapshots(before, after, { templateName = () => '' } = {}) {
  const full = isFullSnapshot(before) && isFullSnapshot(after);
  const goalTitles = new Map();
  for (const g of [...(before?.goals || []), ...(after?.goals || [])]) goalTitles.set(String(g.id), g.title || '');
  const goalTitle = id => goalTitles.get(String(id)) || '';

  const changes = [
    ...diffList('goal', before?.goals, after?.goals, goalTitle),
    ...diffList('intervention', before?.interventions, after?.interventions, goalTitle),
  ];
  if (full) {
    changes.push(...diffList('barrier', before.barriers, after.barriers, goalTitle));
    const prevT = new Set(before.appliedTemplateIds || []);
    const nextT = new Set(after.appliedTemplateIds || []);
    for (const id of nextT) {
      if (!prevT.has(id)) changes.push({ entityType: 'template', entityId: id, title: templateName(id) || 'Template', action: 'added', fields: [] });
      else {
        const p = before.appliedTemplatePriorities?.[id] || 'medium';
        const n = after.appliedTemplatePriorities?.[id] || 'medium';
        if (p !== n) changes.push({ entityType: 'template', entityId: id, title: templateName(id) || 'Template', action: 'changed', fields: [{ key: 'priority', label: 'Priority', from: p, to: n }] });
      }
    }
    for (const id of prevT) {
      if (!nextT.has(id)) changes.push({ entityType: 'template', entityId: id, title: templateName(id) || 'Template', action: 'removed', fields: [] });
    }
  }
  if (!sameList(before?.conditions, after?.conditions)) {
    changes.push({
      entityType: 'plan', entityId: 'conditions', title: 'Conditions', action: 'changed',
      fields: [{ key: 'conditions', label: 'Conditions', from: sortedSet(before?.conditions).join(', '), to: sortedSet(after?.conditions).join(', ') }],
    });
  }
  return { changes, partial: !full };
}

/**
 * Unsigned changes: the live draft compared with the latest signed version.
 * A version signed before full snapshots is not compared at all (`partial`):
 * it lacks barriers and templates, and rows have since been rewritten by data
 * migrations, so a field diff against it reports changes nobody made.
 */
export function carePlanUnsignedChanges(slice, latestVersion, opts) {
  if (!slice?.plan || !latestVersion?.snapshot) return { changes: [], partial: false };
  if (!isFullSnapshot(latestVersion.snapshot)) return { changes: [], partial: true };
  return diffCarePlanSnapshots(latestVersion.snapshot, buildCarePlanSnapshot(slice), opts);
}

/**
 * The signed plan with the progress made on it since: structure from the signed
 * copy, live fields and readings from the editor's loaded plan when it has one.
 */
export function mergeSignedWithLive(signed, live) {
  if (!signed || !live?.plan) return signed;
  const lay = (type, list, liveList) => {
    const byId = new Map((liveList || []).map(x => [String(x.id), x]));
    return (list || []).map(x => withLiveValues(type, x, byId.get(String(x.id))));
  };
  return {
    ...signed,
    goals: lay('goal', signed.goals, live.goals),
    interventions: lay('intervention', signed.interventions, live.interventions),
    barriers: lay('barrier', signed.barriers, live.barriers),
    measurements: live.measurements?.length ? live.measurements : signed.measurements,
  };
}
