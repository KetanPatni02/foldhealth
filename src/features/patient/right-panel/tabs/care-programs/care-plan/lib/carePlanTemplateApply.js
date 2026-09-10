/** Goal count shown on an applied-template badge. */
export function templateGoalCount(template) {
  return (template?.goals || []).length;
}

/** Build a patient-plan goal payload from a template goal entry. */
export function goalPayloadFromTemplateEntry(entry, libraryGoals = []) {
  const lib = libraryGoals.find(g => g.id === entry?.id);
  if (lib) {
    return {
      title: lib.title,
      subtitle: lib.description || entry.subtitle || '',
      category: lib.category || '',
      priority: lib.priority || 'medium',
      icon: 'solar:flag-linear',
      status: 'Not Started',
      measure: lib.measure || '',
      conditions: lib.conditions || [],
      comparator: lib.comparator || '=',
      targetValue: lib.targetValue || '',
      targetValue2: lib.targetValue2 || '',
      customUnit: lib.customUnit || '',
      setTarget: lib.setTarget !== false,
      duration: lib.duration || '',
      durationUnit: lib.durationUnit || '',
      frequency: lib.frequency || '',
      targetDate: lib.targetDate || '',
    };
  }
  return {
    title: entry?.title || '',
    subtitle: entry?.subtitle || '',
    category: entry?.category || '',
    priority: entry?.priority || 'medium',
    icon: 'solar:flag-linear',
    status: 'Not Started',
  };
}

/**
 * Build a patient-plan intervention payload from a template intervention entry.
 *
 * `goalId` is the plan goal this intervention serves, resolved by the caller.
 * Without it the intervention lands on the plan unlinked, which is what the
 * table, the cascade on goal removal, and version history all read.
 */
export function interventionPayloadFromTemplateEntry(entry, goalId = null) {
  return {
    kind: entry?.kind || 'internal-task',
    goalId,
    title: entry?.title || '',
    icon: 'solar:clipboard-list-linear',
    duration: entry?.duration || null,
    priority: 'medium',
    config: entry?.config || {},
    status: 'Not Started',
    assignee: { name: 'Unassigned', initials: '' },
  };
}

/**
 * Build a patient-plan barrier payload from a template barrier entry.
 *
 * `goalIds` is the set of plan goals this barrier belongs to, resolved by the
 * caller; an empty set adds the barrier unlinked rather than dropping it.
 */
export function barrierPayloadFromTemplateEntry(entry, goalIds = []) {
  return {
    title: entry?.title || '',
    description: entry?.description || '',
    priority: entry?.priority || 'medium',
    status: 'Not Started',
    goalIds,
  };
}

const normTitle = v => (v || '').trim().toLowerCase();

/**
 * Which goals of a template own each of its interventions and barriers, keyed
 * by the linked item's title.
 *
 * A template goal entry points at a library goal, and that library goal's links
 * are what carry its interventions and barriers, so the ownership lives one hop
 * away in the library rather than on the template row itself.
 */
export function templateLinkOwners(template, libraryGoals = []) {
  const owners = { intervention: new Map(), barrier: new Map() };
  for (const entry of template?.goals || []) {
    const lib = libraryGoals.find(g => g.id === entry?.id)
      || libraryGoals.find(g => normTitle(g.title) === normTitle(entry?.title));
    const goalTitle = lib?.title || entry?.title || '';
    if (!goalTitle) continue;
    for (const link of lib?.interventions || []) {
      const key = normTitle(link.title);
      if (!key) continue;
      const map = link.kind === 'barrier' ? owners.barrier : owners.intervention;
      const list = map.get(key) || [];
      if (!list.includes(goalTitle)) list.push(goalTitle);
      map.set(key, list);
    }
  }
  return owners;
}
