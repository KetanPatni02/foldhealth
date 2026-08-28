import { Drawer } from '../../../../../../../../components/Drawer/Drawer';
import { Icon } from '../../../../../../../../components/Icon/Icon';
import { Badge } from '../../../../../../../../components/Badge/Badge';
import { PriorityIcon } from '../../../../../../../../components/PriorityIcon/PriorityIcon';
import styles from './GoalPreviewDrawer.module.css';

function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <div className={styles.metaRow}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}

/**
 * Read-only goal detail for the patient care plan (Figma SNP-Story goal preview).
 * Opened from a goal row click — replaces inline title editing on the row.
 */
export function GoalPreviewDrawer({ goal, interventions = [], onClose }) {
  if (!goal) return null;

  const linked = interventions.filter(i => i.goalId === goal.id);
  const targetParts = [
    goal.comparator && goal.comparator !== '=' ? goal.comparator : null,
    goal.targetValue,
    goal.targetValue2,
    goal.customUnit,
  ].filter(Boolean);

  return (
    <Drawer title="Goal Preview" onClose={onClose} noCloseDivider>
      <div className={styles.body}>
        <div className={styles.hero}>
          <span className={styles.heroIcon}>
            <Icon name={goal.icon || 'solar:flag-linear'} size={20} color="var(--neutral-400)" />
          </span>
          <div className={styles.heroText}>
            <div className={styles.titleRow}>
              <span className={styles.title}>{goal.title}</span>
              <PriorityIcon priority={goal.priority} size={16} />
            </div>
            {goal.subtitle && <span className={styles.subtitle}>{goal.subtitle}</span>}
          </div>
        </div>

        <div className={styles.metaGrid}>
          <MetaRow label="Status" value={goal.status} />
          <MetaRow label="Current Value" value={goal.currentValue || 'No Data'} />
          <MetaRow label="Trend" value={goal.trend || '—'} />
          {goal.category && <MetaRow label="Category" value={goal.category} />}
          {goal.measure && <MetaRow label="Measure" value={goal.measure} />}
          {targetParts.length > 0 && <MetaRow label="Target" value={targetParts.join(' ')} />}
          {goal.duration && <MetaRow label="Duration" value={`${goal.duration} ${goal.durationUnit || ''}`.trim()} />}
          {goal.frequency && <MetaRow label="Frequency" value={goal.frequency} />}
          {goal.targetDate && <MetaRow label="Target Date" value={goal.targetDate} />}
        </div>

        {linked.length > 0 && (
          <section className={styles.section}>
            <span className={styles.sectionTitle}>Linked Interventions</span>
            <div className={styles.linkedList}>
              {linked.map(i => (
                <div key={i.id} className={styles.linkedRow}>
                  <span className={styles.linkedIcon}>
                    <Icon name={i.icon || 'solar:clipboard-list-linear'} size={16} color="var(--neutral-400)" />
                  </span>
                  <span className={styles.linkedText}>
                    <span className={styles.linkedTitle}>{i.title}</span>
                    <span className={styles.linkedMeta}>{i.status}</span>
                  </span>
                  <Badge tone="grey" size="S" label={i.assignee?.name || 'Unassigned'} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Drawer>
  );
}
