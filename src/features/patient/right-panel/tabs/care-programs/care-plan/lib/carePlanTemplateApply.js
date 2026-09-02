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

/** Build a patient-plan intervention payload from a template intervention entry. */
export function interventionPayloadFromTemplateEntry(entry) {
  return {
    kind: entry?.kind || 'internal-task',
    title: entry?.title || '',
    icon: 'solar:clipboard-list-linear',
    duration: entry?.duration || null,
    priority: 'medium',
    config: entry?.config || {},
    status: 'Not Started',
    assignee: { name: 'Unassigned', initials: '' },
  };
}
