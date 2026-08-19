import { Icon } from '../../components/Icon/Icon';
import { Button } from '../../components/Button/Button';
import { Badge } from '../../components/Badge/Badge';
import { CheckboxTick } from '../../components/CheckboxTick/CheckboxTick';
import { Input } from '../../components/Input/Input';
import { Link } from '../../components/Link/Link';
import { TITLE_MAX, isOverdue, formatDateFriendly, STATUS_LABELS, STATUS_BADGE_VARIANTS } from './TasksView.utils';
import { PriorityIcon } from './TasksViewIcons';
import styles from './TasksView.module.css';

export function TaskDetailDrawerSubtasks({
  task, subtasks, completedSubs, showAddSubtask, setShowAddSubtask, subtaskName, setSubtaskName,
  handleAddSubtask, updateTask, onSelectTask, allTasks,
}) {
  return (
    <>
        {/* Subtasks — show progress + list of children, allow adding new ones */}
        {!task.is_subtask && (
          <div className={styles.drawerSection}>
            <div className={styles.subtaskHeader}>
              <h4 className={styles.drawerSectionTitle}>
                Subtasks {subtasks.length > 0 && <span className={styles.subtaskCount}>{completedSubs}/{subtasks.length}</span>}
              </h4>
              <Button
                variant="ghost"
                size="S"
                leadingIcon="solar:add-circle-linear"
                onClick={() => setShowAddSubtask(v => !v)}
              >
                Add Subtask
              </Button>
            </div>
            {subtasks.length > 0 && (
              <div className={styles.subtaskProgressBar}>
                <div className={styles.subtaskProgressFill} style={{ width: `${(completedSubs / subtasks.length) * 100}%` }} />
              </div>
            )}
            {showAddSubtask && (
              <div className={styles.subtaskAddRow}>
                <Input
                  aria-label="Subtask name"
                  wrapperClassName={styles.subtaskAddInputWrap}
                  placeholder="Enter subtask name..."
                  maxLength={TITLE_MAX}
                  value={subtaskName}
                  onChange={e => setSubtaskName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask(); if (e.key === 'Escape') { setShowAddSubtask(false); setSubtaskName(''); } }}
                  autoFocus
                />
                <Button variant="primary" size="S" onClick={handleAddSubtask} disabled={!subtaskName.trim()}>Add</Button>
                <Button variant="secondary" size="S" onClick={() => { setShowAddSubtask(false); setSubtaskName(''); }}>Cancel</Button>
              </div>
            )}
            {subtasks.map(sub => (
              <div key={sub.id} className={styles.subtaskCard} onClick={() => onSelectTask?.(sub)}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={sub.status === 'completed'}
                  className={styles.subtaskCheckboxBtn}
                  aria-label={sub.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                  onClick={e => {
                    e.stopPropagation();
                    updateTask(sub.id, { status: sub.status === 'completed' ? 'pending' : 'completed' });
                  }}
                >
                  <CheckboxTick checked={sub.status === 'completed'} size={16} />
                </button>
                <div className={styles.subtaskCardBody}>
                  <div className={styles.subtaskCardRow}>
                    <PriorityIcon priority={sub.priority} size={16} />
                    <span className={`${styles.subtaskCardName} ${sub.status === 'completed' ? styles.subtaskCardNameDone : ''}`}>{sub.name}</span>
                    <Badge variant={STATUS_BADGE_VARIANTS[sub.status]} label={STATUS_LABELS[sub.status]} />
                    <span className={`${styles.subtaskCardDate} ${isOverdue(sub) ? styles.dueMissed : ''}`}>
                      {formatDateFriendly(sub.due_date)}
                    </span>
                  </div>
                  {(sub.attachments > 0 || sub.comments > 0) && (
                    <div className={styles.subtaskCardAttachments}>
                      {sub.attachments > 0 && (
                        <span className={styles.linkedItem}>
                          <Icon name="solar:paperclip-linear" size={14} color="var(--neutral-300)" />
                          {sub.attachments}
                        </span>
                      )}
                      {sub.comments > 0 && (
                        <span className={styles.linkedItem}>
                          <Icon name="solar:chat-round-line-linear" size={14} color="var(--neutral-300)" />
                          {sub.comments}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {subtasks.length === 0 && !showAddSubtask && (
              <div className={styles.subtaskEmpty}>No subtasks yet. Break this task down into smaller steps.</div>
            )}
          </div>
        )}
        {task.is_subtask && task.parent_task && (
          <div className={styles.drawerSection}>
            <span className={styles.drawerSectionLabel}>Parent Task</span>
            <Link
              className={styles.subtaskParentLink}
              onClick={() => {
                const parent = allTasks.find(t => t.id === task.parent_task_id);
                if (parent) onSelectTask?.(parent);
              }}
            >
              <Icon name="solar:link-minimalistic-linear" size={14} color="var(--primary-300)" />
              {task.parent_task}
            </Link>
          </div>
        )}
    </>
  );
}
