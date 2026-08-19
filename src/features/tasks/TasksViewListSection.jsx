import { useState, useCallback } from 'react';
import { Badge } from '../../components/Badge/Badge';
import { SectionPagination } from '../../components/SectionPagination/SectionPagination';
import { useAppStore } from '../../store/useAppStore';
import { PROG_TASKS_PER_PAGE } from './TasksView.utils';
import { TaskRow } from './TasksViewRows';
import { RingEmptyState } from '../../components/RingEmptyState/RingEmptyState';
import styles from './TasksView.module.css';

/**
 * ProgramTaskSection — one "Open"/"Completed" section: a title, then the shared
 * Tasks table header + TaskRows in a fixed ~5-row scroll box, with the Task
 * Title (+ check) pinned left and the action column pinned right. Reuses the
 * standard TaskRow so rows look exactly like the Tasks module. When the section
 * has no tasks it shows the ring empty state instead of the table.
 */
export function ProgramTaskSection({ title, tasks, onToggle, onTaskClick, hideAssignedTo, hideMember, emptyLabel }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(tasks.length / PROG_TASKS_PER_PAGE));
  // Clamp if the list shrank (e.g. a task moved sections) so we never land on
  // an empty page.
  const safePage = Math.min(page, totalPages);
  const pageTasks = tasks.slice((safePage - 1) * PROG_TASKS_PER_PAGE, safePage * PROG_TASKS_PER_PAGE);

  return (
    <div className={styles.progSection}>
      <div className={styles.progSectionHead}>
        <span className={styles.progSectionTitle}>{title}</span>
        <Badge variant="overflow" label={`${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`} />
      </div>
      {tasks.length === 0 ? (
        <div className={styles.progEmpty}>
          <RingEmptyState icon="solar:checklist-minimalistic-linear" label={emptyLabel || 'No Tasks Added'} />
        </div>
      ) : (
        <>
          <div className={`${styles.progScroll} ${hideMember ? styles.tableNoMember : ''}`}>
            <div className={`${styles.tableHeader} ${styles.progHeader}`}>
              <div className={`${styles.thCell} ${styles.colCheck} ${styles.pinLeft0}`} />
              <div className={`${styles.thCell} ${styles.colTask} ${styles.pinLeftCheck}`}>Tasks</div>
              <div className={`${styles.thCell} ${styles.colP}`}>P</div>
              <div className={`${styles.thCell} ${styles.colStatus}`}>Status</div>
              <div className={`${styles.thCell} ${styles.colDue}`}>Due Date</div>
              {!hideAssignedTo && <div className={`${styles.thCell} ${styles.colAssigned}`}>Assigned To</div>}
              {!hideMember && <div className={`${styles.thCell} ${styles.colMember}`}>Member</div>}
              <div className={`${styles.thCell} ${styles.colLabels}`}>Labels</div>
              <div className={`${styles.thCell} ${styles.colActions} ${styles.pinRight0}`} />
            </div>
            {pageTasks.map(t => (
              <TaskRow
                key={t.id}
                task={t}
                onToggle={onToggle}
                onTaskClick={onTaskClick}
                hideAssignedTo={hideAssignedTo}
                hideMember={hideMember}
                pinnedEnds
              />
            ))}
          </div>
          {tasks.length > PROG_TASKS_PER_PAGE && (
            <SectionPagination
              page={safePage}
              perPage={PROG_TASKS_PER_PAGE}
              total={tasks.length}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * TaskListSection — Open / Completed sections built from the shared Tasks
 * TaskRow, for embedding outside the full Tasks page (e.g. a care program).
 * "Open" = anything not completed. Both sections always render (each shows its
 * own empty state when it has no tasks).
 * Toggling completion updates the shared task store. Pass `hideMember` when
 * already in a member context.
 */
export function TaskListSection({ tasks = [], onTaskClick, hideAssignedTo = false, hideMember = false }) {
  const updateTask = useAppStore(s => s.updateTask);
  const handleToggle = useCallback((task) => {
    updateTask(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' });
  }, [updateTask]);

  const open = tasks.filter(t => t.status !== 'completed');
  const completed = tasks.filter(t => t.status === 'completed');

  return (
    <>
      <ProgramTaskSection
        title="Open"
        tasks={open}
        onToggle={handleToggle}
        onTaskClick={onTaskClick}
        hideAssignedTo={hideAssignedTo}
        hideMember={hideMember}
        emptyLabel="No Open Tasks"
      />
      <ProgramTaskSection
        title="Completed"
        tasks={completed}
        onToggle={handleToggle}
        onTaskClick={onTaskClick}
        hideAssignedTo={hideAssignedTo}
        hideMember={hideMember}
        emptyLabel="No Completed Tasks"
      />
    </>
  );
}


