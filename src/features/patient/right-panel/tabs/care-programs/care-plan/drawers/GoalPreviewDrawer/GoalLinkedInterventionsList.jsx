import { Icon } from '../../../../../../../../components/Icon/Icon';
import { Badge } from '../../../../../../../../components/Badge/Badge';
import { ActionButton } from '../../../../../../../../components/ActionButton/ActionButton';
import { AssigneeChange } from '../../../../../../../../components/AssigneeChange/AssigneeChange';
import { PriorityIcon } from '../../../../../../../../components/PriorityIcon/PriorityIcon';
import { GbiStatusButton } from '../../tables/carePlanTableShared';
import styles from './GoalPreviewDrawer.module.css';

/** Linked interventions inside Goal Details — Figma SNP-Story 2632:80869. */
export function GoalLinkedInterventionsList({
  interventions,
  canEdit,
  platformUsers,
  onOpen,
  onPriorityMenu,
  onAssigneeChange,
  onStatusMenu,
  onRowMenu,
  onUnlink,
}) {
  return (
    <div className={styles.intvList}>
      {interventions.map((i) => (
          <div
            key={i.id}
            className={styles.intvRow}
            onClick={() => onOpen?.(i)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen?.(i);
              }
            }}
          >
            <div className={styles.intvPriority} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={styles.intvPriorityBtn}
                onClick={(e) => canEdit && onPriorityMenu?.({ kind: 'intv', item: i, rect: e.currentTarget.getBoundingClientRect() })}
                disabled={!canEdit}
                aria-label="Change priority"
              >
                <PriorityIcon priority={i.priority} size={16} />
              </button>
            </div>

            <div className={styles.intvMain}>
              <span className={styles.intvTypeIcon}>
                <Icon name={i.icon || 'solar:clipboard-list-linear'} size={16} color="var(--neutral-400)" />
              </span>
              <div className={styles.intvTitleStack}>
                <span className={styles.intvTitle}>{i.title}</span>
                {i.duration && (
                  <Badge
                    className={styles.intvDurationBadge}
                    tone="grey"
                    size="S"
                    label={i.duration}
                    icon="solar:clock-circle-linear"
                    trailingIcon="solar:refresh-linear"
                  />
                )}
              </div>
            </div>

            <div className={styles.intvAssignee} onClick={(e) => e.stopPropagation()}>
              <AssigneeChange
                size="S"
                avatarOnly
                name={i.assignee?.name}
                initials={i.assignee?.initials}
                unassigned={!i.assignee?.name || i.assignee.name === 'Unassigned'}
                users={platformUsers}
                pickerTitle="Change assignee"
                onSelect={(u) => onAssigneeChange?.(i, u)}
                disabled={!canEdit}
              />
            </div>

            <div className={styles.intvStatus} onClick={(e) => e.stopPropagation()}>
              <GbiStatusButton
                value={i.status || 'Not Started'}
                disabled={!canEdit}
                onOpen={(rect) => onStatusMenu?.({ kind: 'intv', item: i, rect })}
              />
            </div>

            <div className={styles.intvActions} onClick={(e) => e.stopPropagation()}>
              {canEdit && onUnlink && (
                <ActionButton
                  icon="solar:link-broken-minimalistic-linear"
                  size="S"
                  tooltip="Unlink"
                  tooltipBelow
                  onClick={() => onUnlink(i)}
                />
              )}
              <ActionButton
                icon="solar:menu-dots-linear"
                size="S"
                tooltip="More"
                tooltipBelow
                disabled={!canEdit}
                onClick={(e) => onRowMenu?.({ kind: 'intv-menu', item: i, rect: e.currentTarget.getBoundingClientRect() })}
              />
            </div>
          </div>
      ))}
    </div>
  );
}
