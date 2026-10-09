import { describe, expect, it } from 'vitest';
import { buildCarePlanSnapshot, carePlanUnsignedChanges, diffCarePlanSnapshots, isFullSnapshot, withLiveValues } from './carePlanDraft';

const goal = (over = {}) => ({
  id: 'g1', title: 'A1c below 7%', status: 'In Progress', priority: 'medium', comparator: '<', targetValue: '7',
  customUnit: '%', conditions: ['Diabetes'], currentValue: '7.8 %', trend: 'down', progress: 40, links: 2, ...over,
});
const intervention = (over = {}) => ({
  id: 'i1', goalId: 'g1', title: 'BP log review', kind: 'internal-task', status: 'Not Started', priority: 'medium',
  assignee: { name: 'Alok Kumar' }, adherence: '-', config: { title: 'BP log review', taskId: 9 }, ...over,
});
const barrier = (over = {}) => ({ id: 'b1', title: 'Transportation', status: 'Not Started', priority: 'medium', goalIds: ['g1'], ...over });
const slice = (over = {}) => ({
  plan: { id: 'p1', conditions: [{ label: 'Diabetes' }], appliedTemplateIds: ['t1'], appliedTemplatePriorities: { t1: 'high' }, signedAt: '2026-10-01', signedBy: 'Suresh' },
  goals: [goal()], interventions: [intervention()], barriers: [barrier()], ...over,
});
const signed = (s = slice()) => ({ versionNumber: 3, snapshot: buildCarePlanSnapshot(s) });

describe('buildCarePlanSnapshot', () => {
  it('records barriers, templates and conditions with stable ids', () => {
    const snap = buildCarePlanSnapshot(slice());
    expect(isFullSnapshot(snap)).toBe(true);
    expect(snap.conditions).toEqual(['Diabetes']);
    expect(snap.appliedTemplateIds).toEqual(['t1']);
    expect(snap.barriers[0]).toMatchObject({ id: 'b1', goalIds: ['g1'] });
    expect(snap.goals[0]).not.toHaveProperty('links');
  });
});

describe('carePlanUnsignedChanges', () => {
  it('is empty right after signing', () => {
    expect(carePlanUnsignedChanges(slice(), signed()).changes).toEqual([]);
  });

  it('reports a target change made through Edit, with from and to', () => {
    const { changes } = carePlanUnsignedChanges(slice({ goals: [goal({ targetValue: '6.5' })] }), signed());
    expect(changes).toEqual([{
      entityType: 'goal', entityId: 'g1', title: 'A1c below 7%', action: 'changed',
      fields: [{ key: 'target', label: 'Target', from: '< 7 %', to: '< 6.5 %' }],
    }]);
  });

  it('treats status, priority, title, assignee and scheduling as live progress', () => {
    const live = slice({
      goals: [goal({ status: 'Met', priority: 'high', title: 'A1c under 7%' })],
      interventions: [intervention({ status: 'Met', assignee: { name: 'Suresh' }, adherence: '80', config: { title: 'BP log review', taskId: 9, dueDateOverride: '2026-11-01', repeat: true } })],
      barriers: [barrier({ status: 'Met', title: 'Transport' })],
    });
    expect(carePlanUnsignedChanges(live, signed()).changes).toEqual([]);
  });

  it('ignores values driven by readings and adherence', () => {
    const live = slice({ goals: [goal({ currentValue: '7.1 %', trend: 'up', progress: 80 })] });
    expect(carePlanUnsignedChanges(live, signed()).changes).toEqual([]);
  });

  it('nets out an edit that was reverted', () => {
    const live = slice({ interventions: [intervention({ priority: 'medium', config: { taskId: 9, title: 'BP log review' } })] });
    expect(carePlanUnsignedChanges(live, signed()).changes).toEqual([]);
  });

  it('reports added and removed items, barrier goal links and templates', () => {
    const live = slice({
      goals: [goal(), goal({ id: 'g2', title: 'Walk daily' })],
      interventions: [],
      barriers: [barrier({ goalIds: ['g1', 'g2'] })],
      plan: { ...slice().plan, appliedTemplateIds: ['t2'], appliedTemplatePriorities: {} },
    });
    const { changes } = carePlanUnsignedChanges(live, signed(), { templateName: id => ({ t1: 'Diabetes', t2: 'COPD' })[id] });
    const summary = changes.map(c => `${c.entityType}:${c.action}:${c.title}`);
    expect(summary).toEqual([
      'goal:added:Walk daily',
      'intervention:removed:BP log review',
      'barrier:changed:Transportation',
      'template:added:COPD',
      'template:removed:Diabetes',
    ]);
    expect(changes[2].fields[0]).toMatchObject({ label: 'Goals', from: 'A1c below 7%', to: 'A1c below 7%, Walk daily' });
  });

  it('does not field-diff against a version signed before full snapshots', () => {
    const legacy = { versionNumber: 1, snapshot: { conditions: ['Diabetes'], goals: [goal()], interventions: [intervention()] } };
    const { changes, partial } = carePlanUnsignedChanges(slice({ goals: [goal({ targetDate: '' })] }), legacy);
    expect(partial).toBe(true);
    expect(changes).toEqual([]);
  });
});

describe('diffCarePlanSnapshots', () => {
  it('reports a template priority change', () => {
    const before = buildCarePlanSnapshot(slice());
    const after = buildCarePlanSnapshot(slice({ plan: { ...slice().plan, appliedTemplatePriorities: { t1: 'low' } } }));
    expect(diffCarePlanSnapshots(before, after).changes[0].fields[0]).toEqual({ key: 'priority', label: 'Priority', from: 'high', to: 'low' });
  });
});

describe('withLiveValues', () => {
  it('keeps the signed structure and takes progress from the live row', () => {
    const signedItem = intervention({ kind: 'internal-task', config: { title: 'BP log review', form: 'f1' } });
    const liveItem = intervention({ kind: 'patient-task', status: 'Met', config: { form: 'f2', dueDateOverride: '2026-11-01' } });
    expect(withLiveValues('intervention', signedItem, liveItem)).toMatchObject({
      kind: 'internal-task', status: 'Met', config: { title: 'BP log review', form: 'f1', dueDateOverride: '2026-11-01' },
    });
  });
});
