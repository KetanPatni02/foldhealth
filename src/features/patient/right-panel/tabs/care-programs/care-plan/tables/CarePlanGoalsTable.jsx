import { useMemo, useState } from 'react';
import { ActionButton } from '../../../../../../../components/ActionButton/ActionButton';
import { WorklistShell } from '../../../../../../../components/WorklistShell/WorklistShell';
import { PriorityIcon } from '../../../../../../../components/PriorityIcon/PriorityIcon';
import { useTableSort } from '../../../../../../../components/HeaderCell/useTableSort';
import { DatePickerPopover } from '../../../../../../../components/DatePicker/DatePickerPopover';
import {
  GOAL_COLUMNS,
  withSelectColumn,
  GbiCheckboxCell,
  GbiNameCell,
  GbiProgressCell,
  GbiStatusButton,
} from './carePlanTableShared';
import { enrichGoalRows } from './carePlanTableSort';
import { normalizeCategory, goalCategoryIcon } from '../../../../../../settings/care-plan-library/lib';
import styles from './carePlanTables.module.css';

// MM/DD/YYYY, matches the grey read-only date look used across the
// intervention Due Date column so all care-plan tables read the same.
function formatGoalDate(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}
// Legacy goals were persisted before the Target column existed, so their
// `targetDate` is empty. Rather than render "-" for those rows, project
// a default of createdAt + 90 days so the user always sees a date. Any
// edit through the inline picker writes the real value back to the DB.
function goalTargetDateOrDefault(g) {
  if (g?.targetDate) return g.targetDate;
  const anchor = g?.createdAt ? new Date(g.createdAt) : new Date();
  if (Number.isNaN(anchor.getTime())) return '';
  const out = new Date(anchor);
  out.setDate(out.getDate() + 90);
  return out.toISOString();
}

export function CarePlanGoalsTable({
  rows,
  canEdit,
  bulkMode,
  selectedIds,
  onSelectAll,
  onToggleSelect,
  onOpenGoal,
  onPriorityMenu,
  onStatusMenu,
  onRowMenu,
  // Target-date cell click hands the goal + the picked ISO date up
  // so the parent can persist through its own save action. Omitted →
  // the cell reads as static text (no pointer, no click).
  onTargetDateChange,
  linked,
  template = false,
  emptyState,
}) {
  const sortableRows = useMemo(() => enrichGoalRows(rows), [rows]);
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(sortableRows, 'title', 'asc');
  // Inline target-date picker state — one instance shared across
  // rows; the anchor rect + active goal drive the popover position
  // and its seeded value.
  const [targetPicker, setTargetPicker] = useState(null); // { goal, rect } | null
  const openTargetPicker = (goal, rect) => {
    if (!canEdit || !onTargetDateChange) return;
    setTargetPicker({ goal, rect });
  };
  const commitTargetDate = (iso) => {
    if (targetPicker?.goal) onTargetDateChange(targetPicker.goal, iso);
    setTargetPicker(null);
  };
  // A template row has no value, progress or status, but it still gets its
  // row menu when the caller can act on one.
  const showActions = !template || Boolean(onRowMenu);
  const columns = template
    ? GOAL_COLUMNS.filter(c => c.key === 'priority' || c.key === 'title'
      || (showActions && c.key === 'actions'))
    : GOAL_COLUMNS;

  return (
    <div className={styles.tableWrap}>
      <WorklistShell
        embedded
        embeddedNoScroll
        header={null}
        hideBulkBar
        columns={withSelectColumn(columns, bulkMode)}
        rows={sorted}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={requestSort}
        selectedIds={selectedIds}
        onSelectAll={onSelectAll}
        minTableWidth={0}
        emptyState={emptyState}
        renderRow={(g) => (
          <tr
            key={g.id}
            className={`${styles.row} ${styles.rowClickable} ${styles.gbiRow}`}
            onClick={() => onOpenGoal(g)}
          >
            {bulkMode && (
              <GbiCheckboxCell
                checked={selectedIds.includes(g.id)}
                onToggle={() => onToggleSelect(g.id)}
                label={`Select ${g.title}`}
                disabled={!canEdit}
              />
            )}
            <td className={styles.priorityTd} onClick={e => e.stopPropagation()}>
              {canEdit ? (
                <button
                  type="button"
                  className={styles.priorityBtn}
                  onClick={(e) => onPriorityMenu({ kind: 'goal', item: g, rect: e.currentTarget.getBoundingClientRect() })}
                  aria-label="Change priority"
                >
                  <PriorityIcon priority={g.priority} size={16} />
                </button>
              ) : (
                <PriorityIcon priority={g.priority} size={16} />
              )}
            </td>
            <td className={styles.titleTd}>
              <GbiNameCell
                icon={goalCategoryIcon(g.category)}
                iconTitle={g.category ? normalizeCategory(g.category) : 'Goal'}
                title={g.title}
                meta={g.subtitle || null}
                layout="stacked"
                linked={linked(g)}
                canEdit={canEdit}
              />
            </td>
            {!template && (
              <>
                <td className={styles.dateTd} onClick={e => e.stopPropagation()}>
                  <span className={styles.dueDateText}>{formatGoalDate(g.createdAt)}</span>
                </td>
                <td className={styles.dateTd} onClick={e => e.stopPropagation()}>
                  {canEdit && onTargetDateChange ? (
                    <button
                      type="button"
                      className={styles.dateBtn}
                      onClick={(e) => openTargetPicker(g, e.currentTarget.getBoundingClientRect())}
                      aria-label={g.targetDate ? `Change target date (${formatGoalDate(goalTargetDateOrDefault(g))})` : 'Set target date'}
                    >
                      {formatGoalDate(goalTargetDateOrDefault(g))}
                    </button>
                  ) : (
                    <span className={styles.dueDateText}>{formatGoalDate(goalTargetDateOrDefault(g))}</span>
                  )}
                </td>
                <td className={styles.progressTd} onClick={e => e.stopPropagation()}>
                  <GbiProgressCell progress={g.progress} />
                </td>
                <td className={styles.statusTd} onClick={e => e.stopPropagation()}>
                  <GbiStatusButton
                    value={g.status}
                    disabled={!canEdit}
                    onOpen={rect => onStatusMenu({ kind: 'goal', item: g, rect })}
                  />
                </td>
              </>
            )}
            {showActions && (
              <td className={styles.actionsTd} onClick={e => e.stopPropagation()}>
                <ActionButton
                  icon="solar:menu-dots-linear"
                  size="S"
                  tooltip="More"
                  tooltipBelow
                  tooltipLeft
                  disabled={!template && !canEdit}
                  onClick={(e) => onRowMenu({ kind: 'goal-menu', item: g, rect: e.currentTarget.getBoundingClientRect() })}
                />
              </td>
            )}
          </tr>
        )}
      />
      {targetPicker && (
        <DatePickerPopover
          open
          value={(() => {
            const iso = goalTargetDateOrDefault(targetPicker.goal);
            if (!iso) return null;
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) return null;
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          })()}
          anchorRect={targetPicker.rect}
          onChange={commitTargetDate}
          onClose={() => setTargetPicker(null)}
        />
      )}
    </div>
  );
}
