/* AI-drafted care plan templates: the plain-English description goes to
   /api/care-plan-template-draft with a compact catalog of the library, the
   model answers in TEMPLATE_DRAFT_SCHEMA, and normalizeTemplateDraft checks
   the answer against that catalog before the editor sees it. Shared by the
   API handler (prompt, schema, normalize) and the New Template screen
   (catalog). Plain JS, no app imports, so the server can load it. */

import { CARE_PLAN_NAME_MAX, CARE_PLAN_TITLE_MAX } from './carePlanLimits.js';

export const TEMPLATE_DESCRIPTION_MAX = 1000;

// The library's own values (care_plan_goals / intervention templates).
export const GOAL_FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly'];
export const GOAL_DURATION_UNITS = ['Day', 'Week', 'Month'];
export const GOAL_CATEGORIES = ['Vitals', 'Labs', 'Diet', 'Exercise', 'Assessment', 'Others'];
export const INTERVENTION_KINDS = ['internal-task', 'patient-task', 'patient-education', 'measure-vital', 'send-form'];
export const REPEAT_UNITS = ['Days', 'Weeks'];
const PRIORITIES = ['high', 'medium', 'low'];

const MAX_GOALS = 8;
const MAX_INTERVENTIONS_PER_GOAL = 5;
const MAX_BARRIERS_PER_GOAL = 4;
const CATALOG_MAX = 400;

const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const norm = (s) => String(s ?? '').trim().toLowerCase();
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);

/** The slice of the library the model picks from: ids, titles and cadence. */
export function buildTemplateCatalog({ goals = [], interventions = [], barriers = [] }) {
  return {
    goals: goals.slice(0, CATALOG_MAX).map(g => ({
      id: String(g.id),
      title: clip(g.title, CARE_PLAN_TITLE_MAX),
      category: g.category || '',
      frequency: g.frequency || '',
      duration: g.duration ? `${g.duration} ${g.durationUnit || ''}`.trim() : '',
    })),
    interventions: interventions.slice(0, CATALOG_MAX).map(i => ({
      id: String(i.id), title: clip(i.title, CARE_PLAN_TITLE_MAX), kind: i.kind || 'internal-task',
    })),
    barriers: barriers.slice(0, CATALOG_MAX).map(b => ({ id: String(b.id), title: clip(b.title, CARE_PLAN_TITLE_MAX) })),
  };
}

const libraryRef = {
  libraryId: { type: 'string', nullable: true, description: 'id from the catalog, or null for a new item' },
  title: { type: 'string' },
};

/** Gemini responseSchema: the structure the model must answer in. */
export const TEMPLATE_DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    summary: { type: 'string' },
    templateType: { type: 'string', enum: ['general', 'chronic'] },
    conditions: { type: 'array', items: { type: 'string' } },
    goals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ...libraryRef,
          description: { type: 'string' },
          category: { type: 'string', enum: GOAL_CATEGORIES },
          priority: { type: 'string', enum: PRIORITIES },
          frequency: { type: 'string', enum: GOAL_FREQUENCIES },
          duration: { type: 'integer' },
          durationUnit: { type: 'string', enum: GOAL_DURATION_UNITS },
          interventions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ...libraryRef,
                kind: { type: 'string', enum: INTERVENTION_KINDS },
                repeatEvery: { type: 'integer', nullable: true },
                repeatEveryUnit: { type: 'string', enum: REPEAT_UNITS, nullable: true },
              },
              required: ['libraryId', 'title', 'kind'],
            },
          },
          barriers: {
            type: 'array',
            items: { type: 'object', properties: libraryRef, required: ['libraryId', 'title'] },
          },
        },
        required: ['libraryId', 'title', 'priority', 'frequency', 'interventions', 'barriers'],
      },
    },
  },
  required: ['name', 'summary', 'templateType', 'conditions', 'goals'],
};

export function buildTemplateDraftPrompt(description, catalog) {
  return [
    'You draft care plan templates for Fold Health care managers. A supervisor reviews and edits every draft before it is published, so propose a sensible starting point, not a final plan.',
    '',
    'Rules:',
    '- Reuse the library. For every goal, intervention and barrier, first look for a catalog entry with the same meaning and return its id as libraryId with its exact title. Only when nothing in the catalog fits, return libraryId null and a short new title.',
    `- 3 to ${MAX_GOALS} goals. Each goal: 1 to ${MAX_INTERVENTIONS_PER_GOAL} interventions that work toward it, and 0 to ${MAX_BARRIERS_PER_GOAL} barriers that commonly get in its way.`,
    '- Cadence: give every goal how often it is measured (frequency) and how long the template runs for it (duration + durationUnit). Give an intervention repeatEvery / repeatEveryUnit only when it recurs; otherwise null.',
    '- templateType is "chronic" when the description is about a specific chronic condition, then list those conditions by their common clinical names; otherwise "general" with no conditions.',
    `- name: at most ${CARE_PLAN_NAME_MAX} characters. summary: one plain sentence describing the plan's focus.`,
    '- Write titles in the style of the catalog: short, specific, sentence case. No dosing, diagnoses or clinical claims beyond the description.',
    '',
    'Library catalog (JSON):',
    JSON.stringify(catalog),
    '',
    'Template description from the user:',
    clip(description, TEMPLATE_DESCRIPTION_MAX),
  ].join('\n');
}

const indexCatalog = (entries = []) => ({
  byId: new Map(entries.map(e => [e.id, e])),
  byTitle: new Map(entries.map(e => [norm(e.title), e])),
});

// A model's library reference only counts if the id is in the catalog; a
// missing or invented id falls back to an exact title match, else it's new.
function resolveRef(ref, { byId, byTitle }) {
  const hit = byId.get(String(ref?.libraryId ?? '')) || byTitle.get(norm(ref?.title));
  return hit
    ? { libraryId: hit.id, title: hit.title }
    : { libraryId: null, title: clip(ref?.title, CARE_PLAN_TITLE_MAX) };
}

const positiveInt = (v, max) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 && n <= max ? n : null;
};

/**
 * The model's answer, made safe for the editor: library ids checked against
 * the catalog, enums clamped, lengths and counts capped, empties and
 * duplicates dropped. Returns null when there are no goals.
 */
export function normalizeTemplateDraft(raw, catalog) {
  if (!raw || typeof raw !== 'object') return null;
  const index = {
    goals: indexCatalog(catalog.goals),
    interventions: indexCatalog(catalog.interventions),
    barriers: indexCatalog(catalog.barriers),
  };
  const seenGoals = new Set();
  const goals = [];
  for (const g of Array.isArray(raw.goals) ? raw.goals : []) {
    if (goals.length >= MAX_GOALS) break;
    const ref = resolveRef(g, index.goals);
    if (!ref.title || seenGoals.has(norm(ref.title))) continue;
    seenGoals.add(norm(ref.title));

    const seenItems = new Set();
    const interventions = [];
    for (const i of Array.isArray(g.interventions) ? g.interventions : []) {
      if (interventions.length >= MAX_INTERVENTIONS_PER_GOAL) break;
      const r = resolveRef(i, index.interventions);
      if (!r.title || seenItems.has(norm(r.title))) continue;
      seenItems.add(norm(r.title));
      const lib = r.libraryId ? index.interventions.byId.get(r.libraryId) : null;
      const repeatEvery = positiveInt(i.repeatEvery, 52);
      const repeatEveryUnit = oneOf(i.repeatEveryUnit, REPEAT_UNITS, null);
      interventions.push({
        ...r,
        kind: lib?.kind || oneOf(i.kind, INTERVENTION_KINDS, 'internal-task'),
        repeatEvery: repeatEvery && repeatEveryUnit ? repeatEvery : null,
        repeatEveryUnit: repeatEvery && repeatEveryUnit ? repeatEveryUnit : null,
      });
    }

    const barriers = [];
    for (const b of Array.isArray(g.barriers) ? g.barriers : []) {
      if (barriers.length >= MAX_BARRIERS_PER_GOAL) break;
      const r = resolveRef(b, index.barriers);
      if (!r.title || seenItems.has(norm(r.title))) continue;
      seenItems.add(norm(r.title));
      barriers.push(r);
    }

    const duration = positiveInt(g.duration, 36);
    goals.push({
      ...ref,
      description: clip(g.description, 300),
      category: oneOf(g.category, GOAL_CATEGORIES, 'Others'),
      priority: oneOf(norm(g.priority), PRIORITIES, 'medium'),
      frequency: oneOf(g.frequency, GOAL_FREQUENCIES, 'Monthly'),
      duration: duration ? String(duration) : '',
      durationUnit: duration ? oneOf(g.durationUnit, GOAL_DURATION_UNITS, 'Month') : '',
      interventions,
      barriers,
    });
  }
  if (!goals.length) return null;

  const templateType = raw.templateType === 'chronic' ? 'chronic' : 'general';
  const conditions = templateType === 'chronic'
    ? [...new Set((Array.isArray(raw.conditions) ? raw.conditions : []).map(c => clip(c, 120)).filter(Boolean))].slice(0, 6)
    : [];
  return {
    name: clip(raw.name, CARE_PLAN_NAME_MAX),
    summary: clip(raw.summary, 400),
    templateType,
    conditions,
    goals,
  };
}
