import { useState } from 'react';
import { Icon } from '../../../../../../components/Icon/Icon';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { PriorityIcon } from '../../../../../../components/PriorityIcon/PriorityIcon';
import { AssigneeChange } from '../../../../../../components/AssigneeChange/AssigneeChange';
import { PATIENT_TASKS_MOCK } from '../../../../data/patientTasksMock';
import styles from './TasksTab.module.css';

const SCOPES = ['My Tasks', "Patient's Task"];

function fmtDue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
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
      <div className={styles.pCell}><PriorityIcon priority={task.priority} size={16} /></div>
      <div className={styles.assigneeCell}>
        {task.assignee
          ? <AssigneeChange name={task.assignee} initials={task.assigneeInitials} avatarOnly size="S" disabled />
          : <span className={styles.muted}>—</span>}
      </div>
      <div className={`${styles.dueCell} ${task.overdue ? styles.dueOverdue : ''}`}>{fmtDue(task.due)}</div>
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
        <span className={styles.assigneeCell}>Assignee</span>
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
