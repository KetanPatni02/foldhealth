import { useMemo } from 'react';
import { Icon } from '../../../../../../../components/Icon/Icon';
import { ActionButton } from '../../../../../../../components/ActionButton/ActionButton';
import { AssigneeChange } from '../../../../../../../components/AssigneeChange/AssigneeChange';
import { Badge } from '../../../../../../../components/Badge/Badge';
import { Checkbox } from '../../../../../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { WorklistShell } from '../../../../../../../components/WorklistShell/WorklistShell';
import { PriorityIcon } from '../../../../../../../components/PriorityIcon/PriorityIcon';
import {
  INTERVENTION_COLUMNS,
  LinkChip,
  GoalProgressCell,
  GbiStatusButton,
} from './carePlanTableShared';
import styles from './carePlanTables.module.css';

export function CarePlanInterventionsTable({
  rows,
  canEdit,
  selectedIds,
  onSelectAll,
  onToggleSelect,
  onPriorityMenu,
  onLinkOwner,
  onStatusMenu,
  onRowMenu,
  onOpenIntervention,
  onAssigneeChange,
  linkCount,
  platformUsers,
  emptyState,
}) {
  const columns = useMemo(() => {
    const allSelected = rows.length > 0 && selectedIds.length === rows.length;
    const someSelected = selectedIds.length > 0 && !allSelected;
    return INTERVENTION_COLUMNS.map((col) => {
      if (col.key === 'title') {
        return {
          ...col,
          thLabel: (
            <span className={styles.intvNameHeader}>
              <Checkbox
                checked={someSelected ? 'indeterminate' : allSelected}
                onCheckedChange={(v) => onSelectAll?.(!!v)}
                aria-label="Select all rows"
                disabled={!canEdit || rows.length === 0}
              />
              <span>Name</span>
            </span>
          ),
        };
      }
      if (col.key === 'actions') {
        return {
          ...col,
          thLabel: (
            <ActionButton
              icon="custom:filter"
              size="S"
              tooltip="Table settings"
              disabled
              aria-label="Table settings"
            />
          ),
        };
      }
      return col;
    });
  }, [rows.length, selectedIds.length, onSelectAll, canEdit]);

  return (
    <div className={styles.tableWrap}>
      <WorklistShell
        embedded
        header={null}
        hideBulkBar
        columns={columns}
        rows={rows}
        selectedIds={selectedIds}
        onSelectAll={onSelectAll}
        minTableWidth={0}
        emptyState={emptyState}
        renderRow={(i) => {
          const adherence = Number(i.adherence);
          const showAdherence = Number.isFinite(adherence) && i.adherence !== '-';
          return (
            <tr
              key={i.id}
              className={`${styles.row} ${styles.rowClickable} ${styles.intvRow}`}
              onClick={() => onOpenIntervention(i)}
            >
              <td className={styles.priorityTd} onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className={styles.priorityBtn}
                  onClick={(e) => canEdit && onPriorityMenu({ kind: 'intv', item: i, rect: e.currentTarget.getBoundingClientRect() })}
                  disabled={!canEdit}
                  aria-label="Change priority"
                >
                  <PriorityIcon priority={i.priority} size={16} />
                </button>
              </td>
              <td className={styles.titleTd}>
                <div className={styles.intvNameCell}>
                  <span className={styles.intvRowCheck} onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(i.id)}
                      onCheckedChange={() => onToggleSelect(i.id)}
                      aria-label={`Select ${i.title}`}
                      disabled={!canEdit}
                    />
                  </span>
                  <span className={styles.rowIcon}>
                    <Icon name={i.icon} size={16} color="var(--neutral-400)" />
                  </span>
                  <div className={styles.intvTitleStack}>
                    <span className={styles.title}>{i.title}</span>
                    {i.duration && (
                      <Badge
                        tone="grey"
                        size="S"
                        label={i.duration}
                        icon="solar:clock-circle-linear"
                        trailingIcon="solar:refresh-linear"
                      />
                    )}
                  </div>
                  <span
                    className={`${styles.linkChipWrap} ${canEdit ? styles.linkChipClickable : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canEdit) onLinkOwner({ kind: 'intervention', item: i });
                    }}
                  >
                    <LinkChip count={linkCount(i.id)} />
                  </span>
                </div>
              </td>
              <td className={styles.assigneeTd} onClick={e => e.stopPropagation()}>
                <AssigneeChange
                  size="S"
                  fillContainer
                  nameMuted
                  name={i.assignee.name}
                  initials={i.assignee.initials}
                  showRole={false}
                  unassigned={i.assignee.name === 'Unassigned'}
                  unassignedLabel="Unassigned"
                  users={platformUsers}
                  pickerTitle="Change assignee"
                  onSelect={(u) => onAssigneeChange(i, u)}
                  disabled={!canEdit}
                />
              </td>
              <td className={styles.adherenceTd} onClick={e => e.stopPropagation()}>
                {showAdherence ? <GoalProgressCell progress={adherence} /> : <span className={styles.trendDash}>—</span>}
              </td>
              <td className={styles.statusTd} onClick={e => e.stopPropagation()}>
                <GbiStatusButton
                  value={i.status}
                  badgeSize="M"
                  disabled={!canEdit}
                  onOpen={rect => onStatusMenu({ kind: 'intv', item: i, rect })}
                />
              </td>
              <td className={styles.actionsTd} onClick={e => e.stopPropagation()}>
                <ActionButton
                  icon="solar:menu-dots-linear"
                  size="S"
                  tooltip="More"
                  disabled={!canEdit}
                  onClick={(e) => onRowMenu({ kind: 'intv-menu', item: i, rect: e.currentTarget.getBoundingClientRect() })}
                />
              </td>
            </tr>
          );
        }}
      />
    </div>
  );
}
