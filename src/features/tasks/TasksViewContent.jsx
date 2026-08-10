import { ActionButton } from '../../components/ActionButton/ActionButton';
import { KanbanBoard, EmptyState } from './TasksViewKanban';
import { StatusGroup, SkeletonRow } from './TasksViewList';
import styles from './TasksView.module.css';

export function TasksViewContent({
  tasksLoading,
  tasks,
  filteredTasks,
  tasksViewMode,
  kanbanGroups,
  grouped,
  hideAssignedTo,
  handleToggle,
  handleTaskMove,
  onTaskClick,
  onAddTask,
}) {
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
