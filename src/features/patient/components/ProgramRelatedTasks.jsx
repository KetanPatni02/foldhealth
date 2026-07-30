import { useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { PROGRAM_TASKS_MOCK } from '../data/programTasksMock';
import styles from './ProgramRelatedTasks.module.css';

// Priority (P): high = red double-up, medium = amber equals, low = blue double-down.
function PriorityIcon({ level }) {
  if (level === 'high') return <Icon name="solar:double-alt-arrow-up-linear" size={16} color="var(--status-error)" />;
  if (level === 'low') return <Icon name="solar:double-alt-arrow-down-linear" size={16} color="var(--status-info)" />;
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9.5h12M6 14.5h12" stroke="var(--status-warning)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

const STATUS_CLASS = {
  Pending: 'statusPending',
  Overdue: 'statusOverdue',
  Completed: 'statusCompleted',
};

function StatusPill({ value }) {
  return (
    <button type="button" className={`${styles.statusPill} ${styles[STATUS_CLASS[value]] || ''}`}>
      {value}
      <Icon name="solar:alt-arrow-down-linear" size={12} color="currentColor" />
    </button>
  );
}

function MetaCounts({ task }) {
  const has = task.subtasks > 0 || task.attachments > 0 || task.comments > 0;
  if (!has) return <span className={styles.metaCell} />;
  return (
    <span className={styles.metaCell}>
      {task.subtasks > 0 && <span className={styles.metaItem}><Icon name="solar:checklist-minimalistic-linear" size={14} color="var(--neutral-300)" />{task.subtasks}</span>}
      {task.attachments > 0 && <span className={styles.metaItem}><Icon name="solar:paperclip-linear" size={14} color="var(--neutral-300)" />{task.attachments}</span>}
      {task.comments > 0 && <span className={styles.metaItem}><Icon name="solar:chat-round-linear" size={14} color="var(--neutral-300)" />{task.comments}</span>}
    </span>
  );
}

function TaskRow({ task, done, onToggle }) {
  return (
    <div className={styles.row}>
      <span className={styles.statusCell}>
        {done ? (
          <button className={styles.checkBtn} onClick={onToggle} aria-label="Mark incomplete">
            <Icon name="solar:check-circle-bold" size={20} color="var(--status-success)" />
          </button>
        ) : (
          <button className={styles.checkEmpty} onClick={onToggle} aria-label="Mark complete" />
        )}
      </span>
      <span className={styles.titleCell}>
        {task.parentTask && (
          <span className={styles.parentLine}>
            <Icon name="solar:checklist-minimalistic-linear" size={13} color="var(--primary-300)" />
            Parent Task : {task.parentTask}
          </span>
        )}
        <span className={styles.title}>{task.title}</span>
        {task.context && <span className={styles.context}>{task.context}</span>}
      </span>
      <MetaCounts task={task} />
      <span className={styles.pCell}><PriorityIcon level={task.priority} /></span>
      <span className={styles.statusPillCell}><StatusPill value={task.status} /></span>
      <span className={`${styles.dueCell} ${task.overdue ? styles.dueOverdue : ''}`}>{task.due}</span>
      <span className={styles.actionCell}>
        <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
      </span>
    </div>
  );
}

function Section({ title, count, tasks, done, onToggle, footer }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title} ({count})</div>
      <div className={styles.headRow}>
        <span className={styles.statusCell} />
        <span className={styles.titleCell}>Task Title</span>
        <span className={styles.metaCell} />
        <span className={styles.pCell}>P</span>
        <span className={styles.statusPillCell}>Status</span>
        <span className={styles.dueCell}>Due Date</span>
        <span className={styles.actionCell} />
      </div>
      {tasks.map(t => <TaskRow key={t.id} task={t} done={done} onToggle={() => onToggle(t.id)} />)}
      {footer}
    </div>
  );
}

export function ProgramRelatedTasks() {
  const data = PROGRAM_TASKS_MOCK;
  const [completedIds, setCompletedIds] = useState(() => new Set());
  const toggle = (id) => setCompletedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const open = data.open.filter(t => !completedIds.has(t.id));

  return (
    <div className={styles.container}>
      <Section
        title="Open"
        count={open.length}
        tasks={open}
        done={false}
        onToggle={toggle}
        footer={(
          <div className={styles.pager}>
            <span className={styles.pagerText}>1-{Math.min(5, data.openTotal)} of {data.openTotal}</span>
            <ActionButton icon="solar:alt-arrow-left-linear" size="S" tooltip="Previous" />
            <ActionButton icon="solar:alt-arrow-right-linear" size="S" tooltip="Next" />
          </div>
        )}
      />
      <Section
        title="Completed"
        count={data.completed.length}
        tasks={data.completed}
        done
        onToggle={toggle}
      />
    </div>
  );
}
