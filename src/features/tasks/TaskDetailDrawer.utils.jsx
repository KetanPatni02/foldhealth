import { Icon } from '../../components/Icon/Icon';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { AUDIT_LOG_VERB_MAP, STATUS_LABELS, STATUS_BADGE_VARIANTS } from './TasksView.utils';
import { PriorityIcon } from './TasksViewIcons';
import styles from './TasksView.module.css';

export function buildActivityLogItems(auditLog, activityTab) {
  const items = [];
  for (const log of auditLog) {
    const visible = activityTab === 'All'
      || (activityTab === 'Comments' && log.action_type === 'comment_added')
      || (activityTab === 'History' && log.action_type !== 'comment_added');
    if (!visible) continue;
    const initials = (log.user_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2);
    items.push(
      <div key={log.id} className={styles.logEntry}>
        <Avatar variant="patient" initials={initials} className={styles.avatarXs} />
        <div className={styles.logBody}>
          <div className={styles.logAction}>
            <span className={styles.logUser}>{log.user_name}</span>
            <span>{AUDIT_LOG_VERB_MAP[log.action_type] || log.action_type}</span>
          </div>
          {log.action_type === 'comment_added' && log.to_value && (
            <div className={styles.logComment}>
              <p>{log.to_value}</p>
            </div>
          )}
          {log.action_type === 'status_changed' && log.from_value && log.to_value && (
            <div className={styles.logChange}>
              <Badge variant={STATUS_BADGE_VARIANTS[log.from_value] || 'overflow'} label={STATUS_LABELS[log.from_value] || log.from_value} />
              <Icon name="solar:arrow-right-linear" size={16} color="var(--neutral-200)" />
              <Badge variant={STATUS_BADGE_VARIANTS[log.to_value] || 'overflow'} label={STATUS_LABELS[log.to_value] || log.to_value} />
            </div>
          )}
          {log.action_type === 'priority_changed' && (
            <div className={styles.logChange}>
              <div className={styles.logChangeItem}>
                <PriorityIcon priority={log.from_value} size={16} />
                <span style={{ textTransform: 'capitalize' }}>{log.from_value}</span>
              </div>
              <Icon name="solar:arrow-right-linear" size={16} color="var(--neutral-200)" />
              <div className={styles.logChangeItem}>
                <PriorityIcon priority={log.to_value} size={16} />
                <span style={{ textTransform: 'capitalize' }}>{log.to_value}</span>
              </div>
            </div>
          )}
          {(log.action_type === 'due_date_changed' || log.action_type === 'assignee_changed' || log.action_type === 'renamed' || log.action_type === 'label_added' || log.action_type === 'label_removed' || log.action_type === 'subtask_added' || log.action_type === 'claimed') && (
            <div className={styles.logChange}>
              {log.from_value && <span className={styles.logChangeText}>{log.from_value}</span>}
              {log.from_value && log.to_value && <Icon name="solar:arrow-right-linear" size={16} color="var(--neutral-200)" />}
              {log.to_value && <span className={styles.logChangeText}>{log.to_value}</span>}
            </div>
          )}
        </div>
      </div>,
    );
  }
  return items;
}
