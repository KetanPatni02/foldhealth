import { describe, it, expect } from 'vitest';
import { normalizeLayout, buildSteps, buildFlow, leavesOf, requiredLeaves } from './layout';

const group = (id, items) => ({ linkId: id, type: 'group', text: `Group ${id}`, items });
const choice = (id, opts = { control: 'radio' }) => ({ linkId: id, type: 'choice', text: id, control: opts.control, required: !!opts.required, options: [{ value: 'A' }, { value: 'B' }] });
const text = (id, required = false) => ({ linkId: id, type: 'string', text: id, required });
const display = (id) => ({ linkId: id, type: 'display', text: id });

describe('normalizeLayout', () => {
  it('passes known layouts through', () => {
    expect(normalizeLayout('by-question')).toBe('by-question');
    expect(normalizeLayout('by-section')).toBe('by-section');
    expect(normalizeLayout('entire-page')).toBe('entire-page');
  });
  it('maps legacy/absent/unknown to entire-page', () => {
    expect(normalizeLayout('sectioned')).toBe('entire-page');
    expect(normalizeLayout(undefined)).toBe('entire-page');
    expect(normalizeLayout('whatever')).toBe('entire-page');
  });
});

describe('buildSteps', () => {
  const fields = [group('g1', [choice('q1'), choice('q2')]), text('t1'), choice('r1', { control: 'radio' }), display('d1')];

  it('by-question: group is one step, each loose field its own step', () => {
    const steps = buildSteps(fields, 'by-question');
    expect(steps.map((s) => s.id)).toEqual(['g1', 't1', 'r1', 'd1']);
    expect(steps[0].items).toHaveLength(1); // the whole group
    expect(steps.find((s) => s.id === 'r1').single).toBe(true);  // single radio → auto-advance
    expect(steps.find((s) => s.id === 't1').single).toBe(false); // text not single-choice
    expect(steps[0].single).toBe(false);                          // group never single
  });

  it('by-section: group is one step, consecutive loose fields bundle', () => {
    const steps = buildSteps(fields, 'by-section');
    expect(steps).toHaveLength(2);
    expect(steps[0].id).toBe('g1');
    expect(steps[1].items.map((f) => f.linkId)).toEqual(['t1', 'r1', 'd1']); // bundled
  });

  it('multi-select choice is not "single"', () => {
    const steps = buildSteps([choice('m1', { control: 'checkbox' })], 'by-question');
    expect(steps[0].single).toBe(false);
  });

  it('empty form → no steps', () => {
    expect(buildSteps([], 'by-question')).toEqual([]);
    expect(buildSteps([], 'by-section')).toEqual([]);
  });
});

describe('buildFlow', () => {
  const fields = [group('g1', [choice('q1'), choice('q2')]), text('t1'), choice('r1')];

  it('by-question: one question per screen (deep flatten), no sections', () => {
    const flow = buildFlow(fields, 'by-question');
    expect(flow.sections).toBeNull();
    expect(flow.questions.map((q) => q.field.linkId)).toEqual(['q1', 'q2', 't1', 'r1']);
  });

  it('by-section: questions carry sectionIndex; sections list for the stepper', () => {
    const flow = buildFlow(fields, 'by-section');
    expect(flow.sections.map((s) => s.title)).toEqual(['Group g1', 'Questions']);
    expect(flow.sections.map((s) => s.count)).toEqual([2, 2]); // g1: q1,q2 — loose: t1,r1
    expect(flow.questions.map((q) => [q.field.linkId, q.sectionIndex])).toEqual([['q1', 0], ['q2', 0], ['t1', 1], ['r1', 1]]);
  });

  it('skips empty groups', () => {
    const flow = buildFlow([group('empty', [])], 'by-section');
    expect(flow.questions).toEqual([]);
    expect(flow.sections).toEqual([]);
  });
});

describe('leaves', () => {
  const fields = [group('g1', [choice('q1', { required: true }), display('gd')]), text('t1', true), display('d1')];
  it('leavesOf descends into groups', () => {
    expect(leavesOf(fields).map((f) => f.linkId)).toEqual(['q1', 'gd', 't1', 'd1']);
  });
  it('requiredLeaves excludes display + non-required', () => {
    expect(requiredLeaves(fields).map((f) => f.linkId)).toEqual(['q1', 't1']);
  });
});
