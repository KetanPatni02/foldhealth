import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Button } from '../../components/Button/Button';
import { Badge } from '../../components/Badge/Badge';
import { Avatar } from '../../components/Avatar/Avatar';
import { CommentComposer } from '../../components/CommentComposer/CommentComposer';
import { Toggle } from '../../components/Toggle/Toggle';
import { Select } from '../../components/Select/Select';
import { LABEL_OPTIONS, TITLE_MAX, getInitials, isOverdue, formatDateFriendly, STATUS_LABELS, STATUS_BADGE_VARIANTS } from './TasksView.utils';
import { PriorityIcon } from './TasksViewIcons';
import { TaskDatePicker, DetailDropdown } from './TasksViewDropdowns';
import styles from './TasksView.module.css';

export function TaskDetailDrawerActivity({
  activityToggle, setActivityToggle, activityTab, setActivityTab, handleAddComment, activityLogItems, auditLog,
}) {
  return (
    <>
        {/* Activity */}
        <div className={styles.drawerSection}>
          <div className={styles.activityHeader}>
            <Toggle
              items={['Activity', 'Automations']}
              active={activityToggle}
              onChange={setActivityToggle}
              size="S"
            />
          </div>
          <div className={styles.activityTabs}>
            {['All', 'Comments', 'History'].map(tab => (
              <button
                key={tab}
                className={`${styles.activityTabBtn} ${activityTab === tab ? styles.activityTabActive : ''}`}
                onClick={() => setActivityTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Comment input — supports @mentions */}
          <CommentComposer onSubmit={handleAddComment} />

          {/* Activity log — real audit entries */}
          <div className={styles.activityLog}>
            {activityLogItems}
            {auditLog.length === 0 && (
              <div className={styles.subtaskEmpty}>No activity yet.</div>
            )}
          </div>
        </div>
    </>
  );
}
