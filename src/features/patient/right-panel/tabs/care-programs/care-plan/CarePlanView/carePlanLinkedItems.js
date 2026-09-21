/** Linked-items helpers for care plan GBI rows (goals, interventions, barriers). */
export function barrierGoalIds(barrier) {
  if (Array.isArray(barrier.goalIds) && barrier.goalIds.length > 0) return barrier.goalIds;
  return barrier.goalId ? [barrier.goalId] : [];
}

export function linkedForGoal(goal, live, programBadge) {
  const badge = programBadge;
  return {
    programs: badge,
    interventions: (live?.interventions || []).filter(i => i.goalId === goal.id).map(i => ({ id: i.id, icon: i.icon, title: i.title })),
    barriers: (live?.barriers || []).filter(b => barrierGoalIds(b).includes(goal.id)).map(b => ({ id: b.id, title: b.title })),
    automations: (live?.automations || []).filter(a => a.goalId === goal.id).map(a => ({ id: a.id, title: a.title })),
  };
}

export function linkedForChild(item, live, programBadge) {
  const parentGoalIds = Array.isArray(item.goalIds) && item.goalIds.length > 0
    ? item.goalIds
    : (item.goalId ? [item.goalId] : []);
  return {
    programs: programBadge,
    goals: (live?.goals || [])
      .filter(g => parentGoalIds.includes(g.id))
      .map(g => ({ id: g.id, title: g.title, icon: g.icon })),
  };
}

export function interventionActivityEntries(auditAll, intervention) {
  if (!intervention?.id) return [];
  return auditAll
    .filter(a => a.entityType === 'intervention' && String(a.entityId) === String(intervention.id))
    .sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt))
    .map(a => {
      const created = a.createdAt ? new Date(a.createdAt) : null;
      return {
        id: a.id,
        t: 'status_change',
        date: created ? created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
        time: created ? created.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null,
        by: a.actor || null,
        title: a.summary || 'Intervention updated',
      };
    });
}
