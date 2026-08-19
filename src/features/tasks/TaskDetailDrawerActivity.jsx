import { CommentComposer } from '../../components/CommentComposer/CommentComposer';
import { Toggle } from '../../components/Toggle/Toggle';
import { TabStrip } from '../../components/TabStrip/TabStrip';
import { ActivityLog } from '../../components/ActivityLog/ActivityLog';
import styles from './TasksView.module.css';

export function TaskDetailDrawerActivity({
  activityToggle, setActivityToggle, activityTab, setActivityTab, handleAddComment, activityLogItems,
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
          <TabStrip
            items={[
              { key: 'All', label: 'All' },
              { key: 'Comments', label: 'Comments' },
              { key: 'History', label: 'History' },
            ]}
            activeKey={activityTab}
            onChange={setActivityTab}
            embedded
          />

          {/* Comment input — supports @mentions */}
          <CommentComposer onSubmit={handleAddComment} />

          {/* Activity log — real audit entries, rendered by the shared
              ActivityLog primitive so date • time • by meta line and the
              typed entry variants (comment / status change / assignee change)
              match the HCC / HEDIS drawers. */}
          <ActivityLog entries={activityLogItems} emptyLabel="No activity yet." />
        </div>
    </>
  );
}
