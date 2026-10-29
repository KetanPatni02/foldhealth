import { describe, expect, it } from 'vitest';
import { CARE_PATHWAY_CONTENT } from '../data/carePathwayContent';
import { CARE_PLAN_GOAL_LIBRARY } from '../data/carePlanGoalLibrarySeed';
import { CARE_PLAN_INTERVENTION_LIBRARY } from '../data/carePlanInterventionLibrarySeed';
import { CARE_PLAN_BARRIER_STRUCTURED_LIBRARY } from '../data/carePlanBarrierStructuredSeed';
import { CADENCE_KINDS, CADENCE_UNITS, COMPARATORS } from '../../clinical-protocols/lib/protocolSchema';
import { pathwayCounts, pathwaySources, pathwayToRow, pathwayToTemplate, resolvePathway, rowToPathway } from './carePathways';

const libraries = {
  goals: CARE_PLAN_GOAL_LIBRARY,
  interventions: CARE_PLAN_INTERVENTION_LIBRARY,
  barriers: CARE_PLAN_BARRIER_STRUCTURED_LIBRARY,
};

describe('Fold pathway content', () => {
  it('ships the six baseline conditions with unique ids', () => {
    expect(CARE_PATHWAY_CONTENT.map(p => p.id)).toEqual(['diabetes', 'heart-failure', 'copd', 'ckd', 'hypertension', 'dyslipidemia']);
  });

  it.each(CARE_PATHWAY_CONTENT.map(p => [p.id, p]))('%s names only real library items', (_id, p) => {
    expect(resolvePathway(p, libraries).unresolved).toEqual([]);
  });

  it.each(CARE_PATHWAY_CONTENT.map(p => [p.id, p]))('%s links interventions and barriers to its own goals', (_id, p) => {
    const goals = new Set(p.goals.map(g => g.title));
    for (const i of p.interventions) expect(goals.has(i.goalTitle), `${i.title} → ${i.goalTitle}`).toBe(true);
    for (const b of p.barriers) for (const t of b.goalTitles) expect(goals.has(t), `${b.title} → ${t}`).toBe(true);
  });

  it.each(CARE_PATHWAY_CONTENT.map(p => [p.id, p]))('%s decision logic and cadence fit the protocol schema', (_id, p) => {
    for (const t of p.thresholds) {
      expect(COMPARATORS).toContain(t.comparator);
      expect(typeof t.value).toBe('number');
      if (t.comparator === 'between') expect(typeof t.value2).toBe('number');
    }
    for (const r of p.decisionRules) expect(r.when && r.then).toBeTruthy();
    for (const c of p.cadence) {
      expect(CADENCE_KINDS.map(k => k.value)).toContain(c.kind);
      expect(CADENCE_UNITS).toContain(c.unit);
      expect(c.times).toBeGreaterThan(0);
      expect(c.every).toBeGreaterThan(0);
    }
    for (const x of [...p.thresholds, ...p.decisionRules, ...p.cadence]) expect(x.source).toBeTruthy();
  });

  it('uses no em dashes', () => {
    expect(JSON.stringify(CARE_PATHWAY_CONTENT)).not.toContain('\u2014');
  });
});

describe('resolvePathway', () => {
  const p = {
    goals: [{ title: 'improve a1c  control', priority: 'high' }, { title: 'Not in the library' }],
    interventions: [{ title: 'A1C follow-up', goalTitle: 'Improve A1C control' }],
    barriers: [{ title: 'Hypoglycemia risk', goalTitles: ['Improve A1C control'] }],
  };

  it('matches titles loosely, keeps the pathway priority and the links', () => {
    const r = resolvePathway(p, libraries);
    expect(r.goals[0]).toMatchObject({ title: 'Improve A1C control', priority: 'high' });
    expect(r.goals[0].id).toBeTruthy();
    expect(r.interventions[0]).toMatchObject({ title: 'A1C follow-up', goalTitle: 'Improve A1C control', config: { priority: 'medium' } });
    expect(r.barriers[0]).toMatchObject({ title: 'Hypoglycemia risk', goalTitles: ['Improve A1C control'] });
  });

  it('keeps an unknown title as a plain item and reports it', () => {
    const r = resolvePathway(p, libraries);
    expect(r.goals[1]).toEqual({ title: 'Not in the library', subtitle: '', category: 'Other', priority: 'medium' });
    expect(r.unresolved).toEqual([{ kind: 'goal', title: 'Not in the library' }]);
  });
});

describe('pathway rows and templates', () => {
  const diabetes = CARE_PATHWAY_CONTENT[0];

  it('round-trips through the database row', () => {
    const back = rowToPathway(pathwayToRow(diabetes, 3));
    expect(back).toMatchObject({ ...diabetes, sortOrder: 3 });
  });

  it('becomes a template for its condition that remembers the pathway version', () => {
    const t = pathwayToTemplate(diabetes, libraries);
    expect(t).toMatchObject({ name: 'Type 2 Diabetes', conditions: ['Diabetes'], sourcePathway: { id: 'diabetes', version: '2026.1' } });
    expect(t.goals).toHaveLength(diabetes.goals.length);
    expect(t.goals.every(g => g.id)).toBe(true);
  });

  it('counts and lists sources', () => {
    expect(pathwayCounts(diabetes)).toMatchObject({ goals: 7, interventions: 10, barriers: 6 });
    expect(pathwaySources(diabetes)[0]).toBe('ADA Standards of Care in Diabetes (2026)');
    expect(pathwaySources(diabetes)).toContain('Fold care-management practice');
  });
});
