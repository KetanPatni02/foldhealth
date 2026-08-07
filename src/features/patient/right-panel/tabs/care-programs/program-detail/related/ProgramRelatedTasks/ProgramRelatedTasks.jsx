import { useMemo } from 'react';
import { TaskListSection } from '../../../../../../../tasks/TasksView';
import { useAppStore } from '../../../../../../../../store/useAppStore';
import styles from './ProgramRelatedTasks.module.css';

/**
 * Program Related Tasks — Open / Completed sections built from the shared Tasks
 * module row (TaskRow), with the Member column hidden since we're already in a
 * member's care program. Tasks are created via the Add Task drawer and live in
 * the shared task store, so status toggles/edits stay live.
 */
export function ProgramRelatedTasks({ programCode, onAddTask }) {
  const added = useAppStore(s => s.programAddedTasks[programCode]);
  const globalTasks = useAppStore(s => s.tasks);
  // Prefer the live store row (reflects status/edits) but fall back to the
  // stored copy if it isn't in the global list.
  const tasks = useMemo(() => {
    const list = added || [];
    return list.map(a => globalTasks.find(g => g.id === a.id) || a);
  }, [added, globalTasks]);

  return (
    <div className={styles.wrap}>
      <TaskListSection tasks={tasks} hideMember onAddTask={onAddTask} />
    </div>
  );
}
