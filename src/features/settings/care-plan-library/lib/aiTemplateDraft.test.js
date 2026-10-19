import { describe, expect, it, vi } from 'vitest';
import { buildTemplateCatalog, normalizeTemplateDraft } from './aiTemplateDraft';
import { draftProvenance, materializeNewGoals, templateDraftToEditor, withoutDraftMarks } from './templateDraftToEditor';

vi.mock('../../../../lib/apiFetch', () => ({ apiFetch: vi.fn() }));

const libraryGoals = [
  {
    id: 'g-a1c', title: 'Improve A1C control', category: 'Labs', frequency: 'Quarterly', duration: '6', durationUnit: 'Month',
    interventions: [
      { id: 'l1', kind: 'measure-vital', title: 'Check A1C' },
      { id: 'l2', kind: 'barrier', title: 'Cost of medication' },
    ],
  },
];
const interventionLibrary = [{ id: 'i-edu', kind: 'patient-education', title: 'Diabetes diet education', config: { note: 'x' } }];
const barrierLibrary = [{ id: 'b-transport', title: 'Transportation' }];
const catalog = buildTemplateCatalog({ goals: libraryGoals, interventions: interventionLibrary, barriers: barrierLibrary });

const raw = {
  name: 'New Type 2 diabetes',
  summary: 'Medication adherence and dietary counseling for newly diagnosed T2D.',
  templateType: 'chronic',
  conditions: ['Type 2 diabetes mellitus'],
  goals: [
    {
      libraryId: 'g-a1c', title: 'Improve A1C control', priority: 'high', frequency: 'Monthly',
      interventions: [{ libraryId: 'i-edu', title: 'Diabetes diet education', kind: 'internal-task' }],
      barriers: [{ libraryId: 'invented-id', title: 'transportation' }],
    },
    {
      libraryId: null, title: 'Take metformin as prescribed', category: 'Others', priority: 'URGENT', frequency: 'Hourly',
      duration: 3, durationUnit: 'Month',
      interventions: [{ libraryId: null, title: 'Pill box setup call', kind: 'nonsense', repeatEvery: 2, repeatEveryUnit: 'Weeks' }],
      barriers: [],
    },
    { libraryId: null, title: '  ', priority: 'low', frequency: 'Daily', interventions: [], barriers: [] },
  ],
};

describe('normalizeTemplateDraft', () => {
  const draft = normalizeTemplateDraft(raw, catalog);

  it('keeps real library references and resolves invented ids by title', () => {
    expect(draft.goals[0].libraryId).toBe('g-a1c');
    expect(draft.goals[0].interventions[0].libraryId).toBe('i-edu');
    // The library kind wins over the model's.
    expect(draft.goals[0].interventions[0].kind).toBe('patient-education');
    expect(draft.goals[0].barriers[0]).toEqual({ libraryId: 'b-transport', title: 'Transportation' });
  });

  it('clamps values to the library vocabulary and drops empty goals', () => {
    const fresh = draft.goals[1];
    expect(fresh.libraryId).toBeNull();
    expect(fresh.priority).toBe('medium');
    expect(fresh.frequency).toBe('Monthly');
    expect(fresh.duration).toBe('3');
    expect(fresh.interventions[0]).toMatchObject({ kind: 'internal-task', repeatEvery: 2, repeatEveryUnit: 'Weeks' });
    expect(draft.goals).toHaveLength(2);
  });

  it('returns null without goals', () => {
    expect(normalizeTemplateDraft({ goals: [] }, catalog)).toBeNull();
    expect(normalizeTemplateDraft('nope', catalog)).toBeNull();
  });
});

describe('templateDraftToEditor', () => {
  const draft = normalizeTemplateDraft(raw, catalog);
  const lists = templateDraftToEditor(draft, { libraryGoals, interventionLibrary, barrierLibrary });

  it('brings a library goal in as itself, with its own links', () => {
    expect(lists.goals[0]).toBe(libraryGoals[0]);
    expect(lists.interventions.map(i => i.title)).toContain('Check A1C');
    expect(lists.barriers.map(b => b.title)).toContain('Cost of medication');
  });

  it('holds a new goal with its links and no invented target', () => {
    const g = lists.goals[1];
    expect(g.aiNew).toBe(true);
    expect(g.setTarget).toBe(false);
    expect(g.conditions).toEqual(['Type 2 diabetes mellitus']);
    expect(g.interventions).toEqual([{ kind: 'internal-task', title: 'Pill box setup call', config: { repeat: true, repeatEvery: '2', repeatEveryUnit: 'Weeks' } }]);
  });

  it('counts what came from the library', () => {
    expect(draftProvenance(lists)).toMatchObject({ goals: 2, fresh: 2 });
  });

  it('creates new goals in the library before the template saves', async () => {
    const save = vi.fn(async (values) => ({ ...values, id: 'saved-1' }));
    const out = await materializeNewGoals(lists.goals, save);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].id).toBeUndefined();
    expect(out[0]).toBe(libraryGoals[0]);
    expect(out[1].id).toBe('saved-1');
    expect(await materializeNewGoals(lists.goals, async () => null)).toBeNull();
    expect(withoutDraftMarks(lists.interventions).some(i => 'aiNew' in i)).toBe(false);
  });
});
