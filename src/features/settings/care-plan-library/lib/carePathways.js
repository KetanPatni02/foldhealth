/* Fold Pathway Library helpers. Plain JS, no React.

   A pathway stores its GBI set by library title (data/carePathwayContent.js).
   resolvePathway() matches those titles against the account's live Care Plan
   Library so the template a pathway becomes points at real library rows; a
   title the library no longer has stays as a plain item and is reported in
   `unresolved`. */

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const byTitle = (rows) => new Map((rows || []).map(r => [norm(r.title), r]));

/** A pathway's GBI set as template entries, linked to the library where the titles match. */
export function resolvePathway(pathway, { goals = [], interventions = [], barriers = [] } = {}) {
  const libGoals = byTitle(goals);
  const libInterventions = byTitle(interventions);
  const libBarriers = byTitle(barriers);
  const unresolved = [];
  const miss = (kind, title) => { unresolved.push({ kind, title }); return null; };

  const goalEntries = (pathway.goals || []).map((g) => {
    const lib = libGoals.get(norm(g.title)) || miss('goal', g.title);
    return {
      ...(lib ? { id: lib.id } : {}),
      title: lib?.title || g.title,
      subtitle: lib?.description || '',
      category: lib?.category || 'Other',
      priority: g.priority || lib?.priority || 'medium',
    };
  });
  const interventionEntries = (pathway.interventions || []).map((i) => {
    const lib = libInterventions.get(norm(i.title)) || miss('intervention', i.title);
    const priority = i.priority || lib?.config?.priority || 'medium';
    return {
      ...(lib ? { id: lib.id } : {}),
      kind: lib?.kind || i.kind || 'internal-task',
      title: lib?.title || i.title,
      config: { ...(lib?.config || {}), priority },
      ...(i.goalTitle ? { goalTitle: i.goalTitle } : {}),
    };
  });
  const barrierEntries = (pathway.barriers || []).map((b) => {
    const lib = libBarriers.get(norm(b.title)) || miss('barrier', b.title);
    return {
      ...(lib ? { id: lib.id } : {}),
      title: lib?.title || b.title,
      description: lib?.description || '',
      priority: b.priority || 'medium',
      ...(b.goalTitles?.length ? { goalTitles: [...b.goalTitles] } : {}),
    };
  });
  return { goals: goalEntries, interventions: interventionEntries, barriers: barrierEntries, unresolved };
}

/** The values a care plan template is saved with when a pathway is adapted. */
export function pathwayToTemplate(pathway, libraries) {
  const { goals, interventions, barriers } = resolvePathway(pathway, libraries);
  return {
    name: pathway.name,
    conditions: [pathway.condition],
    goals,
    interventions,
    barriers,
    sourcePathway: { id: pathway.id, version: pathway.version, name: pathway.name },
  };
}

export const pathwayCounts = (p) => ({
  goals: (p.goals || []).length,
  interventions: (p.interventions || []).length,
  barriers: (p.barriers || []).length,
  thresholds: (p.thresholds || []).length,
  rules: (p.decisionRules || []).length,
  cadence: (p.cadence || []).length,
});

/** Every distinct source a pathway's items rest on, pathway-level sources first. */
export function pathwaySources(p) {
  const all = [
    ...(p.sources || []),
    ...[...(p.thresholds || []), ...(p.decisionRules || []), ...(p.cadence || [])].map(x => x.source),
  ].filter(Boolean);
  return [...new Set(all)];
}

export function rowToPathway(r) {
  const gbi = r.gbi || {};
  const logic = r.decision_logic || {};
  return {
    id: r.id,
    name: r.name,
    condition: r.condition,
    version: r.version,
    summary: r.summary || '',
    sources: r.sources || [],
    goals: gbi.goals || [],
    interventions: gbi.interventions || [],
    barriers: gbi.barriers || [],
    thresholds: logic.thresholds || [],
    decisionRules: logic.decisionRules || [],
    cadence: r.cadence || [],
    sortOrder: r.sort_order ?? 0,
    publishedAt: r.published_at || null,
    updatedAt: r.updated_at || null,
  };
}

export function pathwayToRow(p, sortOrder = 0) {
  return {
    id: p.id,
    name: p.name,
    condition: p.condition,
    version: p.version,
    summary: p.summary || '',
    sources: p.sources || [],
    gbi: { goals: p.goals || [], interventions: p.interventions || [], barriers: p.barriers || [] },
    decision_logic: { thresholds: p.thresholds || [], decisionRules: p.decisionRules || [] },
    cadence: p.cadence || [],
    sort_order: sortOrder,
  };
}
