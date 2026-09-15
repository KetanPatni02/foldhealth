import { Icon } from '../../../../../../../../components/Icon/Icon';
import { GbiStatusButton } from '../../tables/carePlanTableShared';
import styles from './GoalPreviewDrawer.module.css';

/** Linked barriers inside Goal Details — grid aligns with GoalLinkedInterventionsList. */
export function GoalLinkedBarriersList({
  barriers,
  canEdit,
  onStatusMenu,
}) {
  return (
    <div className={styles.intvList}>
      {barriers.map((b) => (
        <div key={b.id} className={styles.barrierRow}>
          {/* Empty track — barriers have no priority; column keeps status aligned with interventions. */}
          <div className={styles.gbiDrawerLeadSpacer} aria-hidden="true" />

          <div className={styles.intvMain}>
            <span className={styles.intvTypeIcon}>
              <Icon name="custom:barrier" size={16} color="var(--neutral-400)" />
            </span>
            <div className={styles.intvTitleStack}>
              <span className={styles.intvTitle}>{b.title}</span>
            </div>
          </div>

          <div className={styles.intvAssignee} aria-hidden="true" />

          <div className={styles.intvStatus} onClick={(e) => e.stopPropagation()}>
            <GbiStatusButton
              value={b.status || 'Not Started'}
              disabled={!canEdit}
              onOpen={(rect) => onStatusMenu?.({ kind: 'barrier', item: b, rect })}
            />
          </div>

          <div className={styles.intvActions} aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}
