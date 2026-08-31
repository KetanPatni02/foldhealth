import { Icon } from '../../../../../../../components/Icon/Icon';
import { ActionButton } from '../../../../../../../components/ActionButton/ActionButton';
import { AssigneeChange } from '../../../../../../../components/AssigneeChange/AssigneeChange';
import { Checkbox } from '../../../../../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { WorklistShell } from '../../../../../../../components/WorklistShell/WorklistShell';
import { PriorityIcon } from '../../../../../../../components/PriorityIcon/PriorityIcon';
import {
  INTERVENTION_COLUMNS,
  LinkChip,
  GoalProgressCell,
  GbiStatusButton,
  EditableInlineTitle,
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
  onAssigneeChange,
  onTitleCommit,
  linkCount,
  platformUsers,
  emptyState,
}) {
  return (
    <div className={styles.tableWrap}>
      <WorklistShell
        embedded
        header={null}
        hideBulkBar
        columns={INTERVENTION_COLUMNS}
        rows={rows}
        selectedIds={selectedIds}
        onSelectAll={onSelectAll}
        minTableWidth={0}
        emptyState={emptyState}
        renderRow={(i) => {
          const adherence = Number(i.adherence);
          const showAdherence = Number.isFinite(adherence) && i.adherence !== '-';
          return (
            <tr key={i.id} className={styles.row}>
              <td className={styles.checkTd} onClick={e => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.includes(i.id)}
                  onCheckedChange={() => onToggleSelect(i.id)}
                  aria-label={`Select ${i.title}`}
                  disabled={!canEdit}
                />
              </td>
              <td className={styles.priorityTd}>
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
                <div className={styles.titleCell}>
                  <span className={styles.rowIcon}><Icon name={i.icon} size={16} color="var(--neutral-400)" /></span>
                  <span className={`${styles.titleMain} ${styles.titleMainInline}`}>
                    <EditableInlineTitle
                      title={i.title}
                      editable={canEdit}
                      onCommit={(title) => onTitleCommit(i, title)}
                    />
                    {i.duration && (
                      <span className={styles.durationChip}>
                        <Icon name="solar:clock-circle-linear" size={12} color="var(--neutral-300)" />
                        {i.duration}
                        <Icon name="solar:refresh-linear" size={12} color="var(--neutral-300)" />
                      </span>
                    )}
                  </span>
                  <span
                    className={`${styles.linkChipWrap} ${canEdit ? styles.linkChipClickable : ''}`}
                    onClick={() => canEdit && onLinkOwner({ kind: 'intervention', item: i })}
                  >
                    <LinkChip count={linkCount(i.id)} />
                  </span>
                </div>
              </td>
              <td className={styles.assigneeTd}>
                <AssigneeChange
                  size="S"
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
              <td className={styles.adherenceTd}>
                {showAdherence ? <GoalProgressCell progress={adherence} /> : <span className={styles.trendDash}>—</span>}
              </td>
              <td className={styles.statusTd}>
                <GbiStatusButton
                  value={i.status}
                  disabled={!canEdit}
                  onOpen={rect => onStatusMenu({ kind: 'intv', item: i, rect })}
                />
              </td>
              <td className={styles.actionsTd}>
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
