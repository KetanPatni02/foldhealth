import { useEffect, useRef, useState } from 'react';
import { Drawer } from '../../../../../components/Drawer/Drawer';
import { Button } from '../../../../../components/Button/Button';
import { Toggle } from '../../../../../components/Toggle/Toggle';
import { Badge } from '../../../../../components/Badge/Badge';
import { Icon } from '../../../../../components/Icon/Icon';
import { Select } from '../../../../../components/Select/Select';
import { Switch } from '../../../../../components/Switch/Switch';
import { Input } from '../../../../../components/Input/Input';
import { DatePicker } from '../../../../../components/DatePicker/DatePicker';
import { MenuPopover } from '../../../../../components/MenuPopover/MenuPopover';
import { AddTaskDrawer } from '../../../../tasks/AddTaskDrawer';
import { SendFormDrawer } from '../../interventions/SendFormDrawer/SendFormDrawer';
import { SendContentDrawer } from '../../interventions/SendContentDrawer/SendContentDrawer';
import { MeasureVitalDrawer } from '../../interventions/MeasureVitalDrawer/MeasureVitalDrawer';
import { Link } from '../../../../../components/Link/Link';
import { ActionButton } from '../../../../../components/ActionButton/ActionButton';
import { AddIconMinimalist } from '../../../../../components/Icon/AddIconMinimalist';
import { DownChevronIcon } from '../../../../../components/Icon/DownChevronIcon';
import { PriorityIcon } from '../../../../../components/PriorityIcon/PriorityIcon';
import { VITAL_OPTIONS } from '../../lib/vitalOptions';
import { MEASURE_CONFIG } from '../../lib/goalFormat';
import styles from './CreateGoalDrawer.module.css';

// Categories per the goal-creation screens.
const GOAL_CATEGORIES = ['Vital', 'Activity', 'Lab result', 'Assessment', 'Other'];

// Per-measure target-value shape:
//   unit        single trailing unit segment
//   dual        two value fields; `units` / `placeholders` give each its own
//   kind:select the value is chosen from a list rather than typed
//   stepper     numeric spinner (Body Temperature)
// A measure with none of these is a plain number with no unit.

// The measure picker's label and options follow the chosen category.
const MEASURES = {
  Vital: {
    label: 'Select Vital',
    options: VITAL_OPTIONS,
  },
  Activity: {
    label: 'Select Activity',
    options: ['Steps', 'Calories', 'Duration', 'Aerobics', 'Archery', 'Badminton',
      'Baseball', 'Basketball', 'Biking', 'Spinning'],
  },
  'Lab result': {
    label: 'Select Lab result',
    options: [
      'Immunoglobulin A, Quant, CSF', 'Immunoglobulin M, Quant, CSF', 'aPTT 1:1 Mix Saline',
      'LD, Body Fluid', 'IgM P23 Ab.', 'Creatine Kinase (CK), MB', 'Creatinine',
      'Hemoglobin A1c', 'Estim. Avg Glu (eAG)', 'Cortisol - AM', 'Cortisol - PM',
      'Crystals, Bile (Cholesterol)', 'D-Dimer', 'HSV-2 DNA', 'Gestational Diabetes Screen',
      'eGFR', 'Fructosamine', 'Fetal Fibronectin', 'Free Kappa Lt Chains,S',
      'Glucose, Fasting', 'Glucose, 1 hour', 'Glucose, 2 hour', 'Glucose, 3 hour',
    ],
  },
  Assessment: {
    label: 'Select Assessment',
    options: [
      'CCM Initial Assessment', 'SNP - Health Risk Assessment', 'COPD Initial Assessment',
      'Patient Assessment', 'BRSCI - Benjamin Rose Institute Caregiver Strain Instrument',
      'Patient Assessment (ECM)', 'Health Risk Assessment Questionnaire',
      'Medication Management', 'CHF Initial Assessment', 'ACM Nursing Assessment',
    ],
  },
  Other: { label: 'Select Measure', options: ['Medication Adherence', 'Appointment Attendance'] },
};

// Chronic conditions come from the NLM Clinical Table Search Service — a
// public terminology lookup. Only the typed search term leaves the app; no
// patient data is sent.
const CONDITIONS_API = 'https://clinicaltables.nlm.nih.gov/api/conditions/v3/search';

// Select takes { value, label } pairs — plain strings render blank rows.
const asOptions = (list) => (list || []).map(v => ({ value: v, label: v }));

/* Lab and assessment names are far longer than vitals — they need a wider field. */
const WIDE_MEASURE_CATEGORIES = ['Lab result', 'Assessment'];

const COMPARATORS = ['=', '<', '<=', '>', '>=', 'between'];
const DURATION_UNITS = ['Day', 'Week', 'Month', 'Year'];
const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly'];

// Linked Items sub-sections (Figma 14506:194349). Icons follow the glyphs the
// rest of the app already uses for each concept.
const LINKED_SECTIONS = [
  { key: 'interventions', label: 'Interventions', addTooltip: 'Add New Intervention' },
  { key: 'barriers', label: 'Barriers', addTooltip: 'Add Barriers' },
  { key: 'automations', label: 'Automations', addTooltip: 'Add Automations' },
];

/* Figma 14109:303516 — the intervention types a goal can link to. */
const INTERVENTION_ITEMS = [
  { key: 'send-form', label: 'Send Form', icon: 'solar:document-add-linear' },
  { key: 'patient-education', label: 'Patient Education', icon: 'solar:book-2-linear' },
  { key: 'patient-task', label: 'Patient Task', icon: 'solar:checklist-minimalistic-linear' },
  { key: 'measure-vital', label: 'Measure Vital', icon: 'solar:heart-pulse-linear' },
  { divider: true },
  { key: 'internal-task', label: 'Internal Task', icon: 'solar:clipboard-check-linear' },
];

// Kind → the row's leading button, keyed off the menu the row came from.
const INTERVENTION_LABELS = Object.fromEntries(
  INTERVENTION_ITEMS.filter(i => i.key).map(i => [i.key, { label: i.label, icon: i.icon }]),
);

// "execute after" — the due offset, compacted to 7d / 2w.
function dueBadgeLabel(config) {
  if (!config?.dueOffset) return '';
  return `${config.dueOffset}${(config.dueUnit || 'day')[0]}`;
}

const PRIORITIES = [
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

/**
 * Create New Goals — Figma Care-Plan-Creation 14109:299594.
 * Category → measure → chronic condition → title, with the goal's priority
 * picked from a segment inside the title field.
 */
export function CreateGoalDrawer({ onClose, onSave, goal }) {
  const [category, setCategory] = useState(goal?.category || GOAL_CATEGORIES[0]);
  const [measure, setMeasure] = useState(goal?.measure || '');
  const [conditions, setConditions] = useState(goal?.conditions || []);
  const [title, setTitle] = useState(goal?.title || '');
  const [priority, setPriority] = useState(goal?.priority || 'medium');
  const [comparator, setComparator] = useState(goal?.comparator || '=');
  const [targetValue, setTargetValue] = useState(goal?.targetValue || '');
  const [targetValue2, setTargetValue2] = useState(goal?.targetValue2 || '');
  const [duration, setDuration] = useState(goal?.duration || '');
  const [durationUnit, setDurationUnit] = useState(goal?.durationUnit || 'Month');
  const [frequency, setFrequency] = useState(goal?.frequency || 'Daily');
  const [targetDate, setTargetDate] = useState(goal?.targetDate || '');
  // "Other" has no predefined measure: the unit is typed and the whole target
  // block is behind a Set Target switch (Figma 14510:196321).
  const [customUnit, setCustomUnit] = useState(goal?.customUnit || '');
  const [setTarget, setSetTarget] = useState(goal ? goal.setTarget !== false : true);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [durationUnitOpen, setDurationUnitOpen] = useState(false);
  // Interventions are staged here and written with the goal, because a new
  // goal has no id to hang them off until it is saved.
  const [interventions, setInterventions] = useState(
    () => (goal?.interventions || []).filter(i => i.kind !== 'barrier'),
  );
  const [barriers, setBarriers] = useState(
    () => (goal?.interventions || []).filter(i => i.kind === 'barrier'),
  );
  const [barrierDraft, setBarrierDraft] = useState('');
  const [barrierEditing, setBarrierEditing] = useState(null);
  const [interventionMenuOpen, setInterventionMenuOpen] = useState(false);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(null);
  const [sendFormOpen, setSendFormOpen] = useState(false);
  const [sendContentOpen, setSendContentOpen] = useState(false);
  const [measureVitalOpen, setMeasureVitalOpen] = useState(false);
  const durationUnitRef = useRef(null);
  const priorityRef = useRef(null);
  const interventionAddRef = useRef(null);

  // Remote condition lookup. Debounced, and each request aborts the one before
  // it so a slow early response can't overwrite a newer one.
  const [conditionQuery, setConditionQuery] = useState('');
  const [conditionOptions, setConditionOptions] = useState([]);
  const [conditionLoading, setConditionLoading] = useState(false);

  useEffect(() => {
    const term = conditionQuery.trim();
    const controller = new AbortController();
    // Every state write happens inside the timer — setting state synchronously
    // in an effect body cascades renders.
    const timer = setTimeout(async () => {
      if (term.length < 2) { setConditionOptions([]); setConditionLoading(false); return; }
      setConditionLoading(true);
      try {
        const url = `${CONDITIONS_API}?terms=${encodeURIComponent(term)}&maxList=10`;
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        // [total, codes[], extraData, displayStrings[][]]
        const names = (data?.[3] || []).map(row => row?.[0]).filter(Boolean);
        setConditionOptions(asOptions([...new Set(names)]));
      } catch (err) {
        if (err.name !== 'AbortError') setConditionOptions([]);
      } finally {
        if (!controller.signal.aborted) setConditionLoading(false);
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [conditionQuery]);

  const measureCfg = MEASURES[category] || MEASURES[GOAL_CATEGORIES[0]];
  const isOther = category === 'Other';
  const cfg = MEASURE_CONFIG[measure] || {};
  // "between" also needs a second field, labelled as a range rather than as
  // the measure's own second part (e.g. Height's Ft / in).
  const isRange = comparator === 'between';
  const twoValues = Boolean(cfg.dual) || isRange;
  const units = cfg.dual ? cfg.units : [cfg.unit || '', cfg.unit || ''];
  const placeholders = cfg.dual
    ? cfg.placeholders
    : isRange ? ['From', 'To'] : ['Enter Value', 'Enter Value'];
  const separator = cfg.dual ? (cfg.separator || '/') : 'and';
  const canSave = title.trim().length > 0;

  const addIntervention = (kind, itemTitle, config) => {
    setInterventions(prev => [...prev, { kind, title: itemTitle || '', config: config || {} }]);
  };

  const cancelBarrier = () => { setBarrierEditing(null); setBarrierDraft(''); };
  const removeBarrier = (index) => setBarriers(prev => prev.filter((_, i) => i !== index));
  const editBarrier = (index) => {
    setBarrierEditing(index);
    setBarrierDraft(index === 'new' ? '' : barriers[index].title);
  };
  const saveBarrier = () => {
    const text = barrierDraft.trim();
    if (!text) { cancelBarrier(); return; }
    setBarriers(prev => (barrierEditing === 'new'
      ? [...prev, { kind: 'barrier', title: text, config: {} }]
      : prev.map((b, i) => (i === barrierEditing ? { ...b, title: text } : b))));
    cancelBarrier();
  };

  const barrierInput = (
    <Input
      autoFocus
      value={barrierDraft}
      onChange={e => setBarrierDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); cancelBarrier(); }
        if (e.key === 'Enter') { e.preventDefault(); saveBarrier(); }
      }}
      onBlur={() => (barrierDraft.trim() ? saveBarrier() : cancelBarrier())}
      placeholder="Add New Barriers"
      aria-label="Add New Barriers"
      trailingText={barrierDraft.trim() ? 'Enter to Save' : 'Esc to Cancel'}
    />
  );

  const headerRight = (
    <>
      <Button
        variant="primary"
        size="L"
        disabled={!canSave}
        onClick={() => onSave?.({ category, measure, conditions, title: title.trim(), priority, comparator, targetValue, targetValue2, customUnit, setTarget, duration, durationUnit, frequency, targetDate, interventions: [...interventions, ...barriers] })}
      >
        Save
      </Button>
      <span className={styles.headerDivider} />
    </>
  );

  return (
    <Drawer title={goal ? 'Edit Goal' : 'Create New Goals'} onClose={onClose} headerRight={headerRight} noCloseDivider>
      <div className={styles.body}>
        <Toggle
          size="S"
          items={GOAL_CATEGORIES}
          active={category}
          onChange={(next) => { setCategory(next); setMeasure(''); }}
        />

        {!isOther && (
        <div className={styles.measureRow}>
          <Select
            options={asOptions(measureCfg.options)}
            value={measure}
            onChange={setMeasure}
            placeholder={measureCfg.label}
            className={`${styles.measureSelect} ${WIDE_MEASURE_CATEGORIES.includes(category) ? styles.measureSelectWide : ''}`}
            searchable
            searchPlaceholder={measureCfg.label}
          />
        </div>
        )}

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Chronic condition</span>
          <Select
            options={conditionOptions}
            value={conditions}
            onChange={setConditions}
            multiple
            checkboxes
            badges
            placeholder="Select chronic conditions"
            searchable
            searchPlaceholder="Search conditions…"
            query={conditionQuery}
            onQueryChange={setConditionQuery}
            searchLoading={conditionLoading}
            emptyText={conditionQuery.trim().length < 2
              ? 'Type at least 2 characters to search'
              : 'No matching conditions'}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>
            Goal Title <span className={styles.mandatoryStar} aria-hidden="true">*</span>
          </span>
          {/* Priority sits inside the field, divided from the text input —
              the design treats it as one control, not two. */}
          <div className={styles.titleField}>
            <button
              ref={priorityRef}
              type="button"
              className={styles.priorityTrigger}
              aria-label={`Priority: ${priority}`}
              onClick={() => setPriorityOpen(v => !v)}
            >
              <PriorityIcon priority={priority} size={16} />
              <DownChevronIcon size={10} color="var(--neutral-300)" />
            </button>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter the Goal Title"
              aria-label="Goal Title"
              className={styles.titleInput}
              wrapperClassName={styles.titleInputWrap}
            />
          </div>
          {priorityOpen && (
            <MenuPopover
              anchorRef={priorityRef}
              align="left"
              width={140}
              ariaLabel="Goal priority"
              items={PRIORITIES.map(p => ({
                key: p.key,
                label: p.label,
                iconElement: <PriorityIcon priority={p.key} size={16} />,
              }))}
              onSelect={setPriority}
              onClose={() => setPriorityOpen(false)}
            />
          )}
        </div>

        <Switch checked={setTarget} onChange={setSetTarget} label="Set Target" />

        {!isOther && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Current Value</span>
          <Input value="" disabled placeholder="No initial value found" aria-label="Current Value" />
        </div>
        )}

        {setTarget && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>
            Target Value <span className={styles.mandatoryStar} aria-hidden="true">*</span>
          </span>
          <div className={styles.targetRow}>
            <Select
              options={asOptions(COMPARATORS)}
              value={comparator}
              onChange={setComparator}
              className={styles.comparator}
            />
            {cfg.kind === 'select' ? (
              <Select
                options={asOptions(cfg.options)}
                value={targetValue}
                onChange={setTargetValue}
                placeholder="Select Value"
                className={styles.valueSelect}
              />
            ) : (
              <Input
                value={targetValue}
                onChange={e => setTargetValue(e.target.value)}
                placeholder={placeholders[0]}
                trailingText={units[0] || undefined}
                trailingTextSegment={Boolean(units[0])}
                type={cfg.stepper ? 'number' : undefined}
                inputMode={cfg.stepper ? undefined : 'decimal'}
                aria-label={placeholders[0]}
              />
            )}
            {isOther && (
              // The unit is typed here — "Other" has no predefined measure.
              <Input
                value={customUnit}
                onChange={e => setCustomUnit(e.target.value)}
                placeholder="Pegs a Day"
                aria-label="Unit"
              />
            )}
            {!isOther && twoValues && cfg.kind !== 'select' && (
              <>
                <span className={styles.targetSlash}>{separator}</span>
                <Input
                  value={targetValue2}
                  onChange={e => setTargetValue2(e.target.value)}
                  placeholder={placeholders[1]}
                  trailingText={units[1] || undefined}
                  trailingTextSegment={Boolean(units[1])}
                  inputMode="decimal"
                  aria-label={placeholders[1]}
                />
              </>
            )}
          </div>
        </div>
        )}

        {setTarget && (
        <div className={styles.twoUp}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>
              Duration <span className={styles.mandatoryStar} aria-hidden="true">*</span>
            </span>
            {/* One field — the unit is the trailing segment, same treatment as
                the mmHg suffix, but it opens a picker. */}
            <Input
              value={duration}
              onChange={e => setDuration(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter Duration"
              inputMode="numeric"
              aria-label="Duration"
              trailingTextSegment
              trailingText={(
                <button
                  ref={durationUnitRef}
                  type="button"
                  className={styles.unitTrigger}
                  aria-haspopup="menu"
                  aria-expanded={durationUnitOpen}
                  onClick={() => setDurationUnitOpen(v => !v)}
                >
                  {durationUnit}
                  <DownChevronIcon size={14} color="var(--neutral-300)" />
                </button>
              )}
            />
            {durationUnitOpen && (
              <MenuPopover
                anchorRef={durationUnitRef}
                align="right"
                width={140}
                ariaLabel="Duration unit"
                items={DURATION_UNITS.map(u => ({ key: u, label: u }))}
                onSelect={setDurationUnit}
                onClose={() => setDurationUnitOpen(false)}
              />
            )}
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>
              Frequency <span className={styles.mandatoryStar} aria-hidden="true">*</span>
            </span>
            <Select options={asOptions(FREQUENCIES)} value={frequency} onChange={setFrequency} />
          </div>
        </div>
        )}

        {!isOther && setTarget && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Target Date</span>
          <div className={styles.targetDate}>
            <DatePicker value={targetDate} onSelect={setTargetDate} aria-label="Target Date" />
          </div>
        </div>
        )}

        <Link className={styles.addRule}>
          <AddIconMinimalist size={14} color="currentColor" />
          Add Rule
        </Link>

        <div className={styles.linkedItems}>
          <span className={styles.sectionTitle}>Linked Items</span>
          <div className={styles.linkedCard}>
            {LINKED_SECTIONS.map(sec => (
              <div key={sec.key} className={styles.linkedSection}>
                <div className={styles.linkedHead}>
                  <span className={styles.linkedLabel}>
                    {sec.label}
                    {sec.key === 'interventions' && interventions.length > 0
                      && <Badge tone="grey" size="S" label={String(interventions.length)} />}
                    {sec.key === 'barriers' && barriers.length > 0
                      && <Badge tone="grey" size="S" label={String(barriers.length)} />}
                  </span>
                  <ActionButton
                    ref={sec.key === 'interventions' ? interventionAddRef : undefined}
                    size="S"
                    tooltip={sec.addTooltip}
                    aria-haspopup={sec.key === 'interventions' ? 'menu' : undefined}
                    aria-expanded={sec.key === 'interventions' ? interventionMenuOpen : undefined}
                    onClick={sec.key === 'interventions'
                      ? () => setInterventionMenuOpen(v => !v)
                      : sec.key === 'barriers'
                        ? () => editBarrier('new')
                        : undefined}
                  >
                    <AddIconMinimalist size={16} color="var(--neutral-300)" />
                  </ActionButton>
                  {sec.key === 'interventions' && interventionMenuOpen && (
                    <MenuPopover
                      anchorRef={interventionAddRef}
                      align="right"
                      width={200}
                      ariaLabel="Add intervention"
                      items={INTERVENTION_ITEMS}
                      onSelect={(key) => {
                        setInterventionMenuOpen(false);
                        if (key === 'patient-task' || key === 'internal-task') setTaskDrawerOpen(key);
                        if (key === 'send-form') setSendFormOpen(true);
                        if (key === 'patient-education') setSendContentOpen(true);
                        if (key === 'measure-vital') setMeasureVitalOpen(true);
                      }}
                      onClose={() => setInterventionMenuOpen(false)}
                    />
                  )}
                </div>
                {sec.key === 'interventions' && interventions.length > 0 && (
                  <div className={styles.interventionList}>
                    {interventions.map((it, i) => {
                      const kind = INTERVENTION_LABELS[it.kind] || { label: it.kind, icon: 'solar:clipboard-check-linear' };
                      const due = dueBadgeLabel(it.config);
                      return (
                        <div key={`${it.kind}-${i}`} className={styles.interventionRow}>
                          <span className={styles.interventionPriority}>
                            <PriorityIcon priority={it.config?.priority?.toLowerCase() || 'medium'} size={16} />
                          </span>
                          <Button variant="ghost" size="L" leadingIcon={kind.icon}>
                            {kind.label}
                          </Button>
                          <span className={styles.interventionText}>{it.title}</span>
                          {due && (
                            <Badge
                              tone="grey"
                              size="S"
                              label={due}
                              trailingIcon="solar:refresh-linear"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {sec.key === 'barriers' && (barriers.length > 0 || barrierEditing !== null) && (
                  <div className={styles.linkedList}>
                    {barriers.map((b, i) => (barrierEditing === i ? (
                      <div key={`edit-${i}`}>{barrierInput}</div>
                    ) : (
                      <div key={`${b.title}-${i}`} className={styles.linkedRow}>
                        {/* Only the label opens the editor — the row also
                            carries its own actions, which can't nest here. */}
                        <button
                          type="button"
                          className={styles.linkedRowMain}
                          onClick={() => editBarrier(i)}
                        >
                          <Icon name="custom:barrier" size={16} color="var(--neutral-300)" />
                          <span className={styles.linkedRowLabel}>{b.title}</span>
                        </button>
                        <span className={styles.linkedRowActions}>
                          {(b.config?.linkCount || 0) > 0 && (
                            <>
                              <Badge
                                tone="grey"
                                size="S"
                                icon="solar:link-minimalistic-linear"
                                label={String(b.config.linkCount)}
                              />
                              <span className={styles.headerDivider} />
                            </>
                          )}
                          <ActionButton
                            icon="solar:trash-bin-minimalistic-linear"
                            size="S"
                            tooltip="Delete"
                            onClick={() => removeBarrier(i)}
                          />
                        </span>
                      </div>
                    )))}
                    {barrierEditing === 'new' && barrierInput}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {sendFormOpen && (
        <SendFormDrawer
          onClose={() => setSendFormOpen(false)}
          onSave={(config) => { addIntervention('send-form', config.title, config); setSendFormOpen(false); }}
        />
      )}
      {sendContentOpen && (
        <SendContentDrawer
          onClose={() => setSendContentOpen(false)}
          onSave={(config) => { addIntervention('patient-education', config.title, config); setSendContentOpen(false); }}
        />
      )}
      {measureVitalOpen && (
        <MeasureVitalDrawer
          onClose={() => setMeasureVitalOpen(false)}
          onSave={(config) => { addIntervention('measure-vital', config.title, config); setMeasureVitalOpen(false); }}
        />
      )}
      {taskDrawerOpen && (
        <AddTaskDrawer
          onClose={() => setTaskDrawerOpen(false)}
          onTaskCreated={(t) => { addIntervention(taskDrawerOpen, t?.name || '', { taskId: t?.id }); setTaskDrawerOpen(false); }}
        />
      )}
    </Drawer>
  );
}
