import { Icon } from '../../../../../../../components/Icon/Icon';
import { Input } from '../../../../../../../components/Input/Input';
import { Badge } from '../../../../../../../components/Badge/Badge';
import { Checkbox } from '../../../../../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { CarePlanProgressRing } from '../../../../../../../components/CarePlanProgressRing/CarePlanProgressRing';
import { useState } from 'react';
import styles from './carePlanTables.module.css';

export function EditableInlineTitle({ title, editable, onCommit }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);

  const commit = () => {
    setEditing(false);
    const next = value.trim();
    if (next && next !== title) onCommit(next);
    else setValue(title);
  };

  if (editing) {
    return (
      <Input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setValue(title); setEditing(false); } }}
        aria-label="Edit title"
        className={styles.titleEditInput}
      />
    );
  }

  if (!editable) return <span className={styles.title}>{title}</span>;

  return (
    <button
      type="button"
      className={`${styles.title} ${styles.titleEditable}`}
      onClick={() => { setValue(title); setEditing(true); }}
      title="Click to rename"
    >
      {title}
    </button>
  );
}

export const GBI_STATUS_TONE = {
  'Not Started': 'grey',
  'In Progress': 'warning',
  'On Hold': 'grey',
  Overdue: 'error',
  Met: 'success',
  'Not Met': 'error',
};

export const CLOSED_BARRIER_STATUSES = new Set(['Met', 'Not Met']);

export const isClosedBarrier = (status) => CLOSED_BARRIER_STATUSES.has(status);

const BORDER_LEFT = { borderLeft: '0.5px solid var(--neutral-150)' };
const HEADER_COMPACT = { paddingLeft: 6, paddingRight: 6 };

/** Fixed widths shared across Goals / Interventions / Barriers so columns align when stacked. */
export const GBI_COL_WIDTH = {
  priority: 32,
  value: 120,
  trend: 80,
  progress: 88,
  // Spans Goals Current Value + Trend so Interventions Assigned To aligns and has room for M assignee chips.
  assignee: 120 + 80,
  status: 140,
  actions: 40,
};

// The bulk-select checkbox column. Prepended to a table's columns only while
// bulk mode is on (see withSelectColumn) so the three GBI tables share one
// checkbox placement and, when off, all start at the centered priority cell.
export const SELECT_COLUMN = { key: 'select', label: '', showCheckbox: true, width: 28 };

export const withSelectColumn = (columns, bulkMode) =>
  (bulkMode ? [SELECT_COLUMN, ...columns] : columns);

export const GOAL_COLUMNS = [
  { key: 'priority', label: 'P', width: GBI_COL_WIDTH.priority, align: 'center', sortKey: '_sortPriority', sortType: 'priority', hideSortIcon: true, thStyle: { borderRight: '0.5px solid var(--neutral-150)', paddingLeft: 4, paddingRight: 4 } },
  { key: 'title', label: 'Goal Title', sortKey: 'title', sortType: 'alpha' },
  { key: 'value', label: 'Current Value', width: GBI_COL_WIDTH.value, sortKey: '_sortValue', sortType: 'generic', thStyle: { ...BORDER_LEFT, ...HEADER_COMPACT } },
  { key: 'trend', label: 'Trend', width: GBI_COL_WIDTH.trend, sortKey: 'trend', sortType: 'generic', thStyle: { ...BORDER_LEFT, ...HEADER_COMPACT } },
  { key: 'progress', label: 'Progress', width: GBI_COL_WIDTH.progress, sortKey: '_sortProgress', sortType: 'number', thStyle: { ...BORDER_LEFT, ...HEADER_COMPACT } },
  { key: 'status', label: 'Status', width: GBI_COL_WIDTH.status, sortKey: 'status', sortType: 'alpha', thStyle: { ...BORDER_LEFT, ...HEADER_COMPACT } },
  { key: 'actions', label: '', width: GBI_COL_WIDTH.actions, thStyle: { ...BORDER_LEFT, paddingLeft: 4, paddingRight: 4 } },
];

export const INTERVENTION_COLUMNS = [
  { key: 'priority', label: 'P', width: GBI_COL_WIDTH.priority, align: 'center', sortKey: '_sortPriority', sortType: 'priority', hideSortIcon: true, thStyle: { borderRight: '0.5px solid var(--neutral-150)', paddingLeft: 4, paddingRight: 4 } },
  { key: 'title', label: 'Name', sortKey: 'title', sortType: 'alpha' },
  { key: 'assignee', label: 'Assigned To', width: GBI_COL_WIDTH.assignee, sortKey: '_sortAssignee', sortType: 'alpha', thStyle: BORDER_LEFT },
  { key: 'adherence', label: 'Adherence', width: GBI_COL_WIDTH.progress, sortKey: '_sortAdherence', sortType: 'number', thStyle: { ...BORDER_LEFT, ...HEADER_COMPACT } },
  { key: 'status', label: 'Status', width: GBI_COL_WIDTH.status, sortKey: 'status', sortType: 'alpha', thStyle: { ...BORDER_LEFT, ...HEADER_COMPACT } },
  { key: 'actions', label: '', width: GBI_COL_WIDTH.actions, thStyle: { ...BORDER_LEFT, paddingLeft: 4, paddingRight: 4 } },
];

export const BARRIER_COLUMNS = [
  { key: 'title', label: 'Name', sortKey: 'title', sortType: 'alpha' },
  { key: 'status', label: 'Status', width: GBI_COL_WIDTH.status, sortKey: 'status', sortType: 'alpha', thStyle: { ...BORDER_LEFT, ...HEADER_COMPACT } },
  { key: 'actions', label: '', width: GBI_COL_WIDTH.actions, thStyle: { ...BORDER_LEFT, paddingLeft: 4, paddingRight: 4 } },
];

// The per-row bulk checkbox cell shared by all three GBI tables — stops click
// propagation so ticking never fires the row action.
export function GbiCheckboxCell({ checked, onToggle, label, disabled }) {
  return (
    <td className={styles.checkTd} onClick={e => e.stopPropagation()}>
      <Checkbox checked={checked} onCheckedChange={onToggle} aria-label={label} disabled={disabled} />
    </td>
  );
}

export function LinkChip({ count }) {
  return (
    <span className={`${styles.linkChip} ${count ? '' : styles.linkChipEmpty}`}>
      <Icon name="custom:link" size={14} color="var(--neutral-300)" />
      {count > 0 && <span className={styles.linkCount}>{count}</span>}
    </span>
  );
}

export function GoalProgressCell({ progress }) {
  const pct = Math.max(0, Math.min(100, Number(progress) || 0));
  return <CarePlanProgressRing progress={pct} />;
}

export function TrendCell({ trend }) {
  if (!trend || trend === '-') return <span className={styles.trendDash}>—</span>;
  const tone = trend === '↑' ? 'success' : trend === '↓' ? 'error' : 'grey';
  const icon = trend === '↑'
    ? 'solar:arrow-up-linear'
    : trend === '↓'
      ? 'solar:arrow-down-linear'
      : 'solar:minus-circle-linear';
  return <Badge tone={tone} size="S" icon={icon} />;
}

export function GbiStatusButton({ value, disabled, onOpen, badgeSize = 'M' }) {
  return (
    <button
      type="button"
      className={styles.statusBtn}
      disabled={disabled}
      onClick={(e) => onOpen?.(e.currentTarget.getBoundingClientRect())}
    >
      <Badge
        tone={GBI_STATUS_TONE[value] || 'grey'}
        size={badgeSize}
        label={value}
        chevron={!disabled}
      />
    </button>
  );
}
