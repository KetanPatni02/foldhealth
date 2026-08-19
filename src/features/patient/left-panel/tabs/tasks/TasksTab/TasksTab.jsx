import { useState } from 'react';
import { Icon } from '../../../../../../components/Icon/Icon';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { PATIENT_TASKS_MOCK } from '../../../../data/patientTasksMock';
import styles from './TasksTab.module.css';

const SCOPES = ['My Tasks', "Patient's Task"];

// Priority indicator (P column): high = red double-up, medium = amber equals,
// low = blue double-down.
function PriorityIcon({ level }) {
  if (level === 'high') {
    return <Icon name="solar:double-alt-arrow-up-linear" size={16} color="var(--status-error)" />;
  }
  if (level === 'low') {
    return <Icon name="solar:double-alt-arrow-down-linear" size={16} color="var(--status-info)" />;
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9.5h12M6 14.5h12" stroke="var(--status-warning)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function MetaCounts({ task }) {
  return (
    <div className={styles.metaRow}>
      {task.subtasks > 0 && (
        <span className={styles.metaItem}><Icon name="solar:checklist-minimalistic-linear" size={14} color="var(--neutral-300)" />{task.subtasks}</span>
      )}
      {task.attachments > 0 && (
        <span className={styles.metaItem}><Icon name="solar:paperclip-linear" size={14} color="var(--neutral-300)" />{task.attachments}</span>
      )}
      {task.comments > 0 && (
        <span className={styles.metaItem}><Icon name="solar:chat-round-linear" size={14} color="var(--neutral-300)" />{task.comments}</span>
      )}
    </div>
  );
}

function TaskRow({ task, done, onToggle, onClick }) {
  const hasMeta = task.subtasks > 0 || task.attachments > 0 || task.comments > 0;
  return (
    <div
      className={`${styles.row} ${onClick ? styles.rowClickable : ''}`}
      onClick={onClick ? () => onClick(task) : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(task); } } : undefined}
    >
      <div className={styles.checkCell} onClick={e => e.stopPropagation()}>
        {done ? (
          <button className={styles.checkBtn} onClick={onToggle} aria-label="Mark incomplete">
            <Icon name="solar:check-circle-bold" size={20} color="var(--status-success)" />
          </button>
        ) : (
          <button className={styles.checkEmpty} onClick={onToggle} aria-label="Mark complete" />
        )}
      </div>
      <div className={styles.nameCell}>
        <span className={`${styles.taskTitle} ${done ? styles.taskTitleDone : ''}`}>{task.title}</span>
        {done && <span className={styles.completedOn}>Completed on {task.completedOn}</span>}
        {hasMeta && <MetaCounts task={task} />}
      </div>
      <div className={styles.pCell}><PriorityIcon level={task.priority} /></div>
      <div className={`${styles.dueCell} ${task.overdue ? styles.dueOverdue : ''}`}>{task.due}</div>
    </div>
  );
}

function TaskSection({ title, tasks, done, overdue, onToggle, onTaskClick }) {
  if (!tasks.length) return null;
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title} ({tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'})</div>
      <div className={styles.colHead}>
        <span className={styles.checkCell} />
        <span className={styles.nameCell}>Task Name</span>
        <span className={styles.pCell}>P</span>
        <span className={styles.dueCell}>Due</span>
      </div>
      {tasks.map(t => (
        <TaskRow
          key={t.id}
          task={{ ...t, overdue }}
          done={done}
          onToggle={() => onToggle(t.id)}
          onClick={onTaskClick ? () => onTaskClick({ ...t, overdue }, { done, overdue }) : undefined}
        />
      ))}
    </div>
  );
}

export function TasksTab({
  data = PATIENT_TASKS_MOCK,
  scopes = SCOPES,
  hideToolbar = false,
  completedIds: completedIdsProp,
  onToggle: onToggleProp,
  onTaskClick,
}) {
  const [scope, setScope] = useState(scopes[0]);
  const [localCompleted, setLocalCompleted] = useState(() => new Set());
  const completedIds = completedIdsProp ?? localCompleted;

  const toggle = (id) => {
    if (onToggleProp) { onToggleProp(id); return; }
    setLocalCompleted(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  // Checking a pending/overdue task removes it from its section (marks it done).
  const pending = data.pending.filter(t => !completedIds.has(t.id));
  const overdue = data.overdue.filter(t => !completedIds.has(t.id));
  const completed = data.completed || [];
  const empty = !pending.length && !overdue.length && !completed.length;

  return (
    <div className={hideToolbar ? styles.tabFlush : styles.tab}>
      {!hideToolbar && (
        <div className={styles.toolbar}>
          <div className={styles.scopeTabs}>
            {scopes.map(s => (
              <button
                key={s}
                className={`${styles.scopeTab} ${scope === s ? styles.scopeTabActive : ''}`}
                onClick={() => setScope(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <div className={styles.toolbarActions}>
            <ActionButton icon="solar:magnifer-linear" size="S" tooltip="Search" />
            <ActionButton icon="solar:clipboard-add-linear" size="S" tooltip="Add task" />
            <ActionButton icon="custom:filter" size="S" tooltip="Filter" />
          </div>
        </div>
      )}

      <TaskSection title="Pending" tasks={pending} done={false} overdue={false} onToggle={toggle} onTaskClick={onTaskClick} />
      <TaskSection title="Overdue" tasks={overdue} done={false} overdue onToggle={toggle} onTaskClick={onTaskClick} />
      <TaskSection title="Completed" tasks={completed} done onToggle={toggle} onTaskClick={onTaskClick} />
      {empty && <div className={styles.empty}>No tasks match your search or filters.</div>}
    </div>
  );
}
