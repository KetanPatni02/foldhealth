import { useEffect, useMemo, useState } from 'react';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Button } from '../../../components/Button/Button';
import { Input } from '../../../components/Input/Input';
import { Textarea } from '../../../components/Textarea/Textarea';
import { Select } from '../../../components/Select/Select';
import { Switch } from '../../../components/Switch/Switch';
import { Toggle } from '../../../components/Toggle/Toggle';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { AddIconMinimalist } from '../../../components/Icon/AddIconMinimalist';
import { useAppStore } from '../../../store/useAppStore';
import { CARE_PROGRAM_CATALOG } from '../../patient/data/careProgramCatalog';
import {
  ANSWER_OPS, CONDITION_TYPES, EVENT_CATALOG, LAB_CATALOG, NUMERIC_OPS, ruleProblem,
} from './lib/automationRules';
import styles from './AutomationRules.module.css';

const opt = (list, value = 'key', label = 'label') => list.map(x => ({ value: x[value], label: x[label] }));
const OPS = (list) => list.map(o => ({ value: o, label: o }));
const PROGRAM_OPTIONS = CARE_PROGRAM_CATALOG.map(p => ({ value: p.code, label: `${p.name} (${p.code})` }));

const DEFAULTS = {
  condition: () => ({ type: 'condition', value: '' }),
  lab: () => ({ type: 'lab', lab: 'hba1c', op: '>', value: '', withinDays: 365 }),
  assessment: () => ({ type: 'assessment', formId: '', question: '', op: 'equals', value: '' }),
  event: () => ({ type: 'event', event: 'inpatient', withinDays: 30 }),
};

const blankRule = () => ({
  name: '', description: '', enabled: true, programCodes: [], match: 'all',
  conditions: [DEFAULTS.condition()], templateIds: [], reviewer: null,
});

/** Create or edit an automation rule (Settings > Automation Rules). */
export function AutomationRuleDrawer({ rule, onClose, onSave }) {
  const [draft, setDraft] = useState(() => (rule ? structuredClone(rule) : blankRule()));
  const [saving, setSaving] = useState(false);
  const [forms, setForms] = useState([]);
  const templates = useAppStore(s => s.carePlanTemplates);
  const platformUsers = useAppStore(s => s.platformUsers);
  const fetchPlatformUsers = useAppStore(s => s.fetchPlatformUsers);
  const fetchAssessmentFormOptions = useAppStore(s => s.fetchAssessmentFormOptions);

  useEffect(() => { fetchPlatformUsers?.(); }, [fetchPlatformUsers]);
  // Forms load once, only when an assessment condition needs them.
  const needsForms = draft.conditions.some(c => c.type === 'assessment');
  useEffect(() => {
    if (!needsForms || forms.length) return undefined;
    let live = true;
    fetchAssessmentFormOptions().then(list => { if (live) setForms(list); });
    return () => { live = false; };
  }, [needsForms, forms.length, fetchAssessmentFormOptions]);

  const templateOptions = useMemo(() => (templates || [])
    .filter(t => (t.status || 'published') === 'published' && (t.scope || 'org') === 'org')
    .map(t => ({ value: t.id, label: t.name })), [templates]);
  const reviewerOptions = useMemo(() => [
    { value: '', label: 'Program assignee (unassigned if none)' },
    ...(platformUsers || []).map(u => ({ value: u.name, label: u.name })),
  ], [platformUsers]);

  const patch = (p) => setDraft(d => ({ ...d, ...p }));
  const patchCondition = (i, p) => setDraft(d => ({ ...d, conditions: d.conditions.map((c, j) => (j === i ? { ...c, ...p } : c)) }));
  const problem = ruleProblem(draft);

  const save = async () => {
    if (problem) return;
    setSaving(true);
    let ok = false;
    try {
      ok = await onSave(draft);
    } finally {
      setSaving(false);
    }
    if (ok) onClose();
  };

  const renderFields = (c, i) => {
    if (c.type === 'condition') {
      return <Input value={c.value} onChange={e => patchCondition(i, { value: e.target.value })} placeholder="e.g. Diabetes" aria-label="Condition" />;
    }
    if (c.type === 'lab') {
      return (
        <div className={styles.fieldsRow}>
          <Select options={opt(LAB_CATALOG)} value={c.lab} onChange={v => patchCondition(i, { lab: v })} aria-label="Lab" />
          <Select options={OPS(NUMERIC_OPS)} value={c.op} onChange={v => patchCondition(i, { op: v })} aria-label="Comparison" />
          <Input type="number" value={c.value ?? ''} onChange={e => patchCondition(i, { value: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Value" aria-label="Value" />
          <Input type="number" value={c.withinDays ?? ''} onChange={e => patchCondition(i, { withinDays: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Within days" aria-label="Within days" />
        </div>
      );
    }
    if (c.type === 'assessment') {
      return (
        <div className={styles.fieldsRow}>
          <Select
            options={[{ value: '', label: 'Any form' }, ...forms.map(f => ({ value: f.id, label: f.name }))]}
            value={c.formId || ''}
            onChange={v => patchCondition(i, { formId: v })}
            searchable
            aria-label="Form"
          />
          <Input value={c.question} onChange={e => patchCondition(i, { question: e.target.value })} placeholder="Question key" aria-label="Question" />
          <Select options={OPS(ANSWER_OPS)} value={c.op} onChange={v => patchCondition(i, { op: v })} aria-label="Comparison" />
          <Input value={c.value ?? ''} onChange={e => patchCondition(i, { value: e.target.value })} placeholder="Answer" aria-label="Answer" />
        </div>
      );
    }
    return (
      <div className={styles.fieldsRow}>
        <Select options={opt(EVENT_CATALOG)} value={c.event} onChange={v => patchCondition(i, { event: v })} aria-label="Event" />
        <Input type="number" value={c.withinDays ?? ''} onChange={e => patchCondition(i, { withinDays: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Within days" aria-label="Within days" />
      </div>
    );
  };

  return (
    <Drawer
      title={rule ? 'Edit Automation Rule' : 'New Automation Rule'}
      onClose={onClose}
      primaryAction={(
        <Button size="L" disabled={!!problem || saving} onClick={save}>{saving ? 'Saving…' : 'Save Rule'}</Button>
      )}
    >
      <div className={styles.drawerBody}>
        <Input label="Rule name" value={draft.name} onChange={e => patch({ name: e.target.value.slice(0, 120) })} placeholder="e.g. Diabetes + HbA1c > 9" />
        <Textarea value={draft.description} onChange={e => patch({ description: e.target.value })} placeholder="What this rule is for (optional)" rows={2} aria-label="Description" />
        <Switch checked={draft.enabled} onChange={v => patch({ enabled: v })} label="Enabled: runs when a patient enrolls in a matching program" />

        <div className={styles.block}>
          <span className={styles.blockTitle}>When a patient enrolls in</span>
          <Select
            options={PROGRAM_OPTIONS}
            value={draft.programCodes}
            onChange={v => patch({ programCodes: v || [] })}
            multiple
            checkboxes
            badges
            placeholder="Any care program"
            aria-label="Programs"
          />
        </div>

        <div className={styles.block}>
          <div className={styles.blockHead}>
            <span className={styles.blockTitle}>And the patient matches</span>
            <Toggle
              size="S"
              items={[{ key: 'all', label: 'All conditions' }, { key: 'any', label: 'Any condition' }]}
              active={draft.match}
              onChange={k => patch({ match: k })}
            />
          </div>
          {draft.conditions.map((c, i) => (
            <div key={i} className={styles.conditionRow}>
              <Select
                options={opt(CONDITION_TYPES)}
                value={c.type}
                onChange={v => patchCondition(i, DEFAULTS[v]())}
                aria-label="Condition type"
              />
              <div className={styles.conditionFields}>{renderFields(c, i)}</div>
              <ActionButton
                size="S"
                icon="solar:trash-bin-trash-linear"
                tooltip="Remove condition"
                disabled={draft.conditions.length === 1}
                onClick={() => patch({ conditions: draft.conditions.filter((_, j) => j !== i) })}
              />
            </div>
          ))}
          <Button
            variant="tertiary"
            size="S"
            leadingIconElement={<AddIconMinimalist size={14} />}
            onClick={() => patch({ conditions: [...draft.conditions, DEFAULTS.condition()] })}
          >
            Add Condition
          </Button>
        </div>

        <div className={styles.block}>
          <span className={styles.blockTitle}>Then attach in draft</span>
          <Select
            options={templateOptions}
            value={draft.templateIds}
            onChange={v => patch({ templateIds: v || [] })}
            multiple
            checkboxes
            badges
            searchable
            placeholder="Pick care plan templates"
            aria-label="Templates"
          />
          <Select
            label="Review task goes to"
            options={reviewerOptions}
            value={draft.reviewer?.name || ''}
            onChange={v => {
              const u = (platformUsers || []).find(x => x.name === v);
              patch({ reviewer: u ? { id: u.id || null, name: u.name } : null });
            }}
            searchable
          />
        </div>

        {problem && <span className={styles.problem}>{problem}</span>}
      </div>
    </Drawer>
  );
}
