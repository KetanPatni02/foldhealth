import { useState } from 'react';
import { Input } from '../../../components/Input/Input';
import { Select } from '../../../components/Select/Select';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Link } from '../../../components/Link/Link';
import { BadgeRow } from '../../../components/BadgeRow/BadgeRow';
import { AddIconMinimalist } from '../../../components/Icon/AddIconMinimalist';
import { Icon } from '../../../components/Icon/Icon';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import { isFilled, ruleLabels, ruleTree } from '../lib/conditionFields';
import { RuleBuilderDrawer } from './RuleBuilderDrawer';
import { PanelRow } from './EditPanel';
import styles from './AutomationBuilder.module.css';

const toOpts = (list) => list.map(o => (typeof o === 'string' ? { value: o, label: o } : o));

function RowLabel({ field: f }) {
  if (!f.info) return <span className={styles.ruleLabel}>{f.label}</span>;
  // The ⓘ rides on the last word, so a wrapped label ends "Field ⓘ"
  // instead of leaving the icon at the far edge of the label column.
  const i = f.label.lastIndexOf(' ');
  return (
    <span className={styles.ruleLabel}>
      {f.label.slice(0, i + 1)}
      <span className={styles.ruleLabelTail}>
        {f.label.slice(i + 1)}
        <Tooltip label={f.info}>
          <Icon name="solar:info-circle-linear" size={14} color="var(--neutral-200)" />
        </Tooltip>
      </span>
    </span>
  );
}

/** One "field · operator · value" row. */
export function RuleRow({ field: f, rules, onChange, dyn }) {
  const r = rules[f.key] || {};
  const set = (patch) => onChange({ ...rules, [f.key]: { ...r, ...patch } });
  if (f.input === 'rules') return <RuleListRow field={f} value={r.value || ''} onValueChange={v => set({ value: v })} dyn={dyn} />;

  const options = f.options || dyn[f.optionsFrom] || [];
  return (
    <PanelRow label={<RowLabel field={f} />}>
      <div className={styles.ruleControls}>
        {f.ops.length > 1 && (
          <Select portal options={toOpts(f.ops)} value={r.op || f.ops[0]} onValueChange={v => set({ op: v })} className={styles.opSelect} />
        )}
        {f.ops.length === 1 && (
          <Input value={f.ops[0]} disabled readOnly className={styles.opSelect} aria-label={`${f.label} operator`} />
        )}
        {f.input === 'number' ? (
          <>
            <Input
              type="number"
              value={r.value ?? ''}
              min={0}
              onChange={e => set({ value: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder={f.placeholder || 'Enter Number'}
              trailingAction={isFilled(r) ? 'solar:close-circle-linear' : false}
              trailingActionLabel="Clear"
              onTrailingAction={() => set({ value: '' })}
              wrapperClassName={f.units ? styles.numberInput : styles.ruleValueInput}
              aria-label={`${f.label} value`}
            />
            {f.units?.length > 1 && (
              <Select portal options={f.units} value={r.unit || f.units[0].value} onValueChange={v => set({ unit: v })} className={styles.unitSelect} />
            )}
            {f.units?.length === 1 && <span className={styles.opText}>{f.units[0].label}</span>}
            {f.suffix && <span className={styles.opText}>{f.suffix}</span>}
          </>
        ) : (
          <div className={f.extra ? styles.ruleStack : styles.valueSelect}>
            <Select portal
              options={options}
              value={f.input === 'multi' || f.input === 'channels' ? (r.value || []) : (r.value ?? '')}
              onValueChange={v => set({ value: v })}
              multiple={f.input === 'multi' || f.input === 'channels'}
              checkboxes={f.input === 'multi'}
              badges={f.input === 'multi'}
              searchable={options.length > 8}
              placeholder={f.placeholder || 'Select'}
              emptyText="No values on file"
              clearable
            />
            {f.extra && (
              <Select portal
                options={f.extra.options}
                value={r[f.extra.key] || []}
                onValueChange={v => set({ [f.extra.key]: v })}
                multiple
                checkboxes
                badges
                placeholder={f.extra.placeholder}
                clearable
              />
            )}
          </div>
        )}
      </div>
    </PanelRow>
  );
}

/**
 * A field made of rules ("Lab Result: HbA1c > 9 and LDL >= 190"). Shows
 * "+ Add rule", which opens the rule builder drawer; once rules are saved
 * it shows each rule as a badge on one line, the rest folded into "+N"
 * (click to edit, Clear all to remove them; hovering "+N" lists the rest, one per line).
 */
function RuleListRow({ field: f, value, onValueChange, dyn }) {
  const [open, setOpen] = useState(false);
  const filled = isFilled({ value });
  return (
    <PanelRow label={<RowLabel field={f} />}>
      {filled ? (
        <div className={styles.ruleControls}>
          <span
            role="button"
            tabIndex={0}
            className={styles.ruleBadges}
            aria-label="Edit rules"
            onClick={() => setOpen(true)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}
          >
            <BadgeRow items={ruleLabels(f, ruleTree(value))} maxLines={1} size="md" tone="primary" stackTooltip />
          </span>
          <Link size="sm" variant="secondary" onClick={() => onValueChange('')} className={styles.clearRulesLink}>Clear all</Link>
        </div>
      ) : (
        <Link size="sm" onClick={() => setOpen(true)} className={styles.addRuleLink}>
          <AddIconMinimalist size={14} color="currentColor" />
          Add rule
        </Link>
      )}
      {open && (
        <RuleBuilderDrawer
          field={f}
          value={value}
          dyn={dyn}
          onClose={() => setOpen(false)}
          onSave={tree => { onValueChange(tree); setOpen(false); }}
        />
      )}
    </PanelRow>
  );
}
