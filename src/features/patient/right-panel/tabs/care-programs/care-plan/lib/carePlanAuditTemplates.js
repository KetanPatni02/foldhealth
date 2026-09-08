// A `template` audit row carries what it brought to the plan as JSON in
// `detail`, written at sign time by signCarePlan. Goals hold the interventions
// and barriers linked to them; anything hanging off no template goal sits in
// the top-level lists. Rows written before the linkage existed stored goals as
// plain titles, so both shapes are normalised here. Parsing is guarded so a
// hand-edited or legacy row degrades to an empty template rather than breaking
// History.
export function templateContents(row) {
  let parsed;
  try {
    parsed = JSON.parse(row?.detail || '{}');
  } catch {
    parsed = {};
  }
  return {
    goals: (parsed.goals || []).map(g => (typeof g === 'string'
      ? { title: g, interventions: [], barriers: [] }
      : { title: g.title, interventions: g.interventions || [], barriers: g.barriers || [] })),
    interventions: parsed.interventions || [],
    barriers: parsed.barriers || [],
  };
}

// Every title a template accounts for, linked or not.
export function templateTitles(row) {
  const c = templateContents(row);
  return {
    goal: c.goals.map(g => g.title),
    intervention: [...c.interventions, ...c.goals.flatMap(g => g.interventions)],
    barrier: [...c.barriers, ...c.goals.flatMap(g => g.barriers)],
  };
}

// Titles a version's template rows account for, so the same items are not also
// counted as loose additions.
export function templateOwnedTitles(templateRows) {
  const owned = new Set();
  for (const row of templateRows) {
    const titles = templateTitles(row);
    for (const title of [...titles.goal, ...titles.intervention, ...titles.barrier]) {
      owned.add((title || '').trim().toLowerCase());
    }
  }
  return owned;
}

const norm = v => (v || '').trim().toLowerCase();

/**
 * Fill in linkage for template rows written before it was recorded. The goals
 * are matched against the plan by title and their current interventions and
 * barriers hung under them — a live read, so it reflects the plan as it stands
 * rather than as it was signed. Only used when the row itself carries none.
 */
export function withLiveLinks(contents, plan) {
  if (!plan) return contents;
  const hasRecorded = contents.goals.some(g => g.interventions.length || g.barriers.length);
  if (hasRecorded) return contents;

  const planGoals = plan.goals || [];
  const planIntv = plan.interventions || [];
  const planBarriers = plan.barriers || [];
  const barrierGoals = b => (b.goalIds?.length ? b.goalIds : [b.goalId]).filter(Boolean);
  const ownIntv = new Set(contents.interventions.map(norm));
  const ownBarriers = new Set(contents.barriers.map(norm));

  const linkedIntv = new Set();
  const linkedBarriers = new Set();
  const goals = contents.goals.map(g => {
    const match = planGoals.find(pg => norm(pg.title) === norm(g.title));
    if (!match) return g;
    const interventions = planIntv
      .filter(i => i.goalId === match.id && ownIntv.has(norm(i.title)))
      .map(i => i.title);
    const barriers = planBarriers
      .filter(b => barrierGoals(b).includes(match.id) && ownBarriers.has(norm(b.title)))
      .map(b => b.title);
    interventions.forEach(t => linkedIntv.add(norm(t)));
    barriers.forEach(t => linkedBarriers.add(norm(t)));
    return { ...g, interventions, barriers };
  });

  return {
    goals,
    interventions: contents.interventions.filter(t => !linkedIntv.has(norm(t))),
    barriers: contents.barriers.filter(t => !linkedBarriers.has(norm(t))),
  };
}
