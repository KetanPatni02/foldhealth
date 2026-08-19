import { ActionButton } from '../../components/ActionButton/ActionButton';
import { useAppStore } from '../../store/useAppStore';
import { KanbanBoard, EmptyState } from './TasksViewKanban';
import { StatusGroup, SkeletonRow } from './TasksViewList';
import styles from './TasksView.module.css';

// Personal tabs need a signed-in identity to filter against.
const PERSONAL_TABS = new Set(['assigned', 'created', 'mentions']);

export function TasksViewContent({
  tasksLoading,
  tasks,
  filteredTasks,
  tasksViewMode,
  kanbanGroups,
  grouped,
  viewBy,
  hideAssignedTo,
  handleToggle,
  handleTaskMove,
  onTaskClick,
  onAddTask,
}) {
  const currentUserProfile = useAppStore(s => s.currentUserProfile);
  const tasksTab = useAppStore(s => s.tasksTab);
  if (tasksLoading && tasks.length === 0) {
    return (
      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <div className={`${styles.thCell} ${styles.colCheck}`}>
            <ActionButton icon="solar:sort-from-top-to-bottom-linear" size="S" />
          </div>
          <div className={`${styles.thCell} ${styles.colTask}`}>Tasks</div>
          <div className={`${styles.thCell} ${styles.colP}`}>P</div>
          <div className={`${styles.thCell} ${styles.colStatus}`}>Status</div>
          <div className={`${styles.thCell} ${styles.colDue}`}>Due Date</div>
          {!hideAssignedTo && <div className={`${styles.thCell} ${styles.colAssigned}`}>Assigned To</div>}
          <div className={`${styles.thCell} ${styles.colMember}`}>Member</div>
          <div className={`${styles.thCell} ${styles.colLabels}`}>Labels</div>
        </div>
        {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (filteredTasks.length === 0) {
    // A "personal" tab (Assigned to Me / Created by Me / Mentions) with no
    // signed-in profile always yields zero — tell the user why instead of
    // sending them chasing a filter that isn't the problem.
    if (PERSONAL_TABS.has(tasksTab) && !currentUserProfile?.id && !currentUserProfile?.name) {
      return (
        <EmptyState
          title="Sign in to see your tasks"
          description="Assigned to Me, Created by Me, and Mentions filter against your signed-in profile."
          icon="solar:user-linear"
        />
      );
    }
    return (
      <EmptyState
        title="No tasks found"
        description="Try adjusting your filters or switch to a different tab."
        icon="solar:magnifer-linear"
      />
    );
  }

  if (tasksViewMode === 'board') {
    return (
      <KanbanBoard
        kanbanGroups={kanbanGroups}
        viewBy={viewBy}
        onToggle={handleToggle}
        onTaskMove={handleTaskMove}
        onTaskClick={onTaskClick}
      />
    );
  }

  return (
    <div className={styles.tableWrap}>
      <div className={styles.tableHeader}>
        <div className={`${styles.thCell} ${styles.colCheck}`}>
          <ActionButton icon="solar:sort-from-top-to-bottom-linear" size="S" />
        </div>
        <div className={`${styles.thCell} ${styles.colTask}`}>Tasks</div>
        <div className={`${styles.thCell} ${styles.colP}`}>P</div>
        <div className={`${styles.thCell} ${styles.colStatus}`}>Status</div>
        <div className={`${styles.thCell} ${styles.colDue}`}>Due Date</div>
        {!hideAssignedTo && <div className={`${styles.thCell} ${styles.colAssigned}`}>Assigned To</div>}
        <div className={`${styles.thCell} ${styles.colMember}`}>Member</div>
        <div className={`${styles.thCell} ${styles.colLabels}`}>Labels</div>
        <div className={`${styles.thCell} ${styles.colActions}`} />
      </div>

      {grouped.map(g => (
        <StatusGroup
          key={g.status}
          status={g.status}
          label={g.label}
          tasks={g.tasks}
          onToggle={handleToggle}
          onTaskClick={onTaskClick}
          hideAssignedTo={hideAssignedTo}
          onAddTask={onAddTask}
        />
      ))}
    </div>
  );
}
