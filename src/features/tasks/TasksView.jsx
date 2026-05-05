import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Button } from '../../components/Button/Button';
import { Badge } from '../../components/Badge/Badge';
import { Toggle } from '../../components/Toggle/Toggle';
import { Avatar } from '../../components/Avatar/Avatar';
import { TopBar } from '../../components/TopBar/TopBar';
import { useAppStore } from '../../store/useAppStore';
import styles from './TasksView.module.css';

const TABS = [
  { key: 'assigned', label: 'Assigned to Me' },
  { key: 'pool', label: 'My Task Pool' },
  { key: 'created', label: 'Created by Me' },
  { key: 'mentions', label: 'Mentions' },
];

function KanbanIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <path d="M7.75 6C7.75 5.58579 7.41421 5.25 7 5.25C6.58579 5.25 6.25 5.58579 6.25 6H7.75ZM6.25 17C6.25 17.4142 6.58579 17.75 7 17.75C7.41421 17.75 7.75 17.4142 7.75 17H6.25ZM12.75 6C12.75 5.58579 12.4142 5.25 12 5.25C11.5858 5.25 11.25 5.58579 11.25 6H12.75ZM11.25 12C11.25 12.4142 11.5858 12.75 12 12.75C12.4142 12.75 12.75 12.4142 12.75 12H11.25ZM17.75 6C17.75 5.58579 17.4142 5.25 17 5.25C16.5858 5.25 16.25 5.58579 16.25 6H17.75ZM16.25 15.5C16.25 15.9142 16.5858 16.25 17 16.25C17.4142 16.25 17.75 15.9142 17.75 15.5H16.25ZM12 22V21.25C9.62178 21.25 7.91356 21.2484 6.61358 21.0736C5.33517 20.9018 4.56445 20.5749 3.9948 20.0052L3.46447 20.5355L2.93414 21.0659C3.82895 21.9607 4.96897 22.366 6.41371 22.5603C7.83687 22.7516 9.66418 22.75 12 22.75V22ZM2 12H1.25C1.25 14.3358 1.24841 16.1631 1.43975 17.5863C1.63399 19.031 2.03933 20.1711 2.93414 21.0659L3.46447 20.5355L3.9948 20.0052C3.42514 19.4355 3.09825 18.6648 2.92637 17.3864C2.75159 16.0864 2.75 14.3782 2.75 12H2ZM22 12H21.25C21.25 14.3782 21.2484 16.0864 21.0736 17.3864C20.9018 18.6648 20.5749 19.4355 20.0052 20.0052L20.5355 20.5355L21.0659 21.0659C21.9607 20.1711 22.366 19.031 22.5603 17.5863C22.7516 16.1631 22.75 14.3358 22.75 12H22ZM12 22V22.75C14.3358 22.75 16.1631 22.7516 17.5863 22.5603C19.031 22.366 20.1711 21.9607 21.0659 21.0659L20.5355 20.5355L20.0052 20.0052C19.4355 20.5749 18.6648 20.9018 17.3864 21.0736C16.0864 21.2484 14.3782 21.25 12 21.25V22ZM12 2V2.75C14.3782 2.75 16.0864 2.75159 17.3864 2.92637C18.6648 3.09825 19.4355 3.42514 20.0052 3.9948L20.5355 3.46447L21.0659 2.93414C20.1711 2.03933 19.031 1.63399 17.5863 1.43975C16.1631 1.24841 14.3358 1.25 12 1.25V2ZM22 12H22.75C22.75 9.66418 22.7516 7.83687 22.5603 6.41371C22.366 4.96897 21.9607 3.82895 21.0659 2.93414L20.5355 3.46447L20.0052 3.9948C20.5749 4.56445 20.9018 5.33517 21.0736 6.61358C21.2484 7.91356 21.25 9.62178 21.25 12H22ZM12 2V1.25C9.66418 1.25 7.83687 1.24841 6.41371 1.43975C4.96897 1.63399 3.82895 2.03933 2.93414 2.93414L3.46447 3.46447L3.9948 3.9948C4.56445 3.42514 5.33517 3.09825 6.61358 2.92637C7.91356 2.75159 9.62178 2.75 12 2.75V2ZM2 12H2.75C2.75 9.62178 2.75159 7.91356 2.92637 6.61358C3.09825 5.33517 3.42514 4.56445 3.9948 3.9948L3.46447 3.46447L2.93414 2.93414C2.03933 3.82895 1.63399 4.96897 1.43975 6.41371C1.24841 7.83687 1.25 9.66418 1.25 12H2ZM7 6H6.25V17H7H7.75V6H7ZM12 6H11.25V12H12H12.75V6H12ZM17 6H16.25V15.5H17H17.75V6H17Z" fill="currentColor"/>
    </svg>
  );
}

const VIEW_TOGGLE_ITEMS = [
  { key: 'list', icon: 'solar:list-linear' },
  { key: 'board', icon: <KanbanIcon size={16} /> },
];

const TASK_FILTER_DEFS = [
  { key: 'assigned_to', label: 'Assigned to', options: [
    { value: 'Dr. JeDee Potter', label: 'Dr. JeDee Potter' },
    { value: 'Deborah Hintz', label: 'Deborah Hintz' },
    { value: 'Dr. Robert Frost', label: 'Dr. Robert Frost' },
  ]},
  { key: 'view_by', label: 'View By', options: [
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'due_date', label: 'Due Date' },
  ]},
  { key: 'sort_by', label: 'Sort By', options: [
    { value: 'due_date', label: 'Due Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'name', label: 'Name' },
  ]},
  { key: 'created_by', label: 'Created By', options: [
    { value: 'Dr. JeDee Potter', label: 'Dr. JeDee Potter' },
    { value: 'Deborah Hintz', label: 'Deborah Hintz' },
    { value: 'Dr. Robert Frost', label: 'Dr. Robert Frost' },
  ]},
  { key: 'task_status', label: 'Task Status', options: [
    { value: 'pending', label: 'Pending' },
    { value: 'missed', label: 'Missed' },
    { value: 'completed', label: 'Completed' },
  ]},
  { key: 'priority', label: 'Priority', options: [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ]},
  { key: 'labels', label: 'Labels', options: [
    { value: 'Hypertension', label: 'Hypertension' },
    { value: 'Exercise', label: 'Exercise' },
    { value: 'Document Collection', label: 'Document Collection' },
  ]},
];

const STATUS_ORDER = ['pending', 'missed', 'completed'];
const STATUS_LABELS = { pending: 'Pending', missed: 'Missed', completed: 'Completed' };
const STATUS_BADGE_VARIANTS = {
  pending: 'status-queued',
  missed: 'status-failed',
  completed: 'status-completed',
};
const STATUS_COLORS = {
  pending: 'var(--status-warning)',
  missed: 'var(--status-error)',
  completed: 'var(--status-success)',
};

const PRIORITY_COLORS = {
  high: '#FF623E',
  medium: '#FFAB00',
  low: '#0065FF',
  none: '#6F7A90',
};

function PriorityIcon({ priority, size = 24 }) {
  const s = size;
  if (priority === 'high') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path fillRule="evenodd" clipRule="evenodd" d="M19.7119 12.1961C19.46 12.3737 19.1183 12.4735 18.762 12.4735C18.4058 12.4735 18.0641 12.3737 17.8122 12.1961L12.0445 8.12892L6.27686 12.1961C6.02347 12.3687 5.68409 12.4642 5.33183 12.462C4.97957 12.4599 4.6426 12.3602 4.3935 12.1846C4.14441 12.0089 4.00311 11.7713 4.00005 11.5229C3.99699 11.2745 4.13241 11.0352 4.37714 10.8565L11.0947 6.11949C11.3466 5.94188 11.6883 5.8421 12.0445 5.8421C12.4008 5.8421 12.7424 5.94188 12.9944 6.11949L19.7119 10.8565C19.9638 11.0341 20.1053 11.2751 20.1053 11.5263C20.1053 11.7775 19.9638 12.0184 19.7119 12.1961ZM19.7119 17.8805C19.46 18.0581 19.1183 18.1579 18.762 18.1579C18.4058 18.1579 18.0641 18.0581 17.8122 17.8805L12.0445 13.8133L6.27686 17.8805C6.02347 18.0531 5.68409 18.1486 5.33183 18.1464C4.97957 18.1443 4.6426 18.0446 4.3935 17.869C4.14441 17.6933 4.00311 17.4557 4.00005 17.2073C3.99699 16.9589 4.13241 16.7196 4.37714 16.5409L11.0947 11.8039C11.3466 11.6263 11.6883 11.5265 12.0445 11.5265C12.4008 11.5265 12.7424 11.6263 12.9944 11.8039L19.7119 16.5409C19.9638 16.7185 20.1053 16.9595 20.1053 17.2107C20.1053 17.4619 19.9638 17.7028 19.7119 17.8805Z" fill="url(#priorityHigh)"/>
        <defs><linearGradient id="priorityHigh" x1="12.0526" y1="5.8421" x2="12.0526" y2="18.1579" gradientUnits="userSpaceOnUse"><stop stopColor="#FF623E"/><stop offset="1" stopColor="#ED876F"/></linearGradient></defs>
      </svg>
    );
  }
  if (priority === 'medium') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path d="M4.5 13C3.80859 13 3.25 13.5586 3.25 14.25C3.25 14.9414 3.80859 15.5 4.5 15.5H19.5C20.1914 15.5 20.75 14.9414 20.75 14.25C20.75 13.5586 20.1914 13 19.5 13H4.5ZM4.5 8C3.80859 8 3.25 8.55859 3.25 9.25C3.25 9.94141 3.80859 10.5 4.5 10.5H19.5C20.1914 10.5 20.75 9.94141 20.75 9.25C20.75 8.55859 20.1914 8 19.5 8H4.5Z" fill="#FFAB00"/>
      </svg>
    );
  }
  if (priority === 'low') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path fillRule="evenodd" clipRule="evenodd" d="M20.5848 12.293C20.3188 12.1055 19.9582 12.0002 19.5822 12.0002C19.2061 12.0002 18.8455 12.1055 18.5795 12.293L12.4914 16.5861L6.40335 12.293C6.13588 12.1108 5.77766 12.01 5.40582 12.0123C5.03399 12.0146 4.6783 12.1198 4.41537 12.3052C4.15243 12.4906 4.00328 12.7414 4.00005 13.0036C3.99682 13.2658 4.13976 13.5184 4.39809 13.707L11.4888 18.7072C11.7548 18.8947 12.1154 19 12.4914 19C12.8675 19 13.2281 18.8947 13.4941 18.7072L20.5848 13.707C20.8506 13.5195 21 13.2652 21 13C21 12.7348 20.8506 12.4805 20.5848 12.293ZM20.5848 6.2928C20.3188 6.10532 19.9582 6 19.5822 6C19.2061 6 18.8455 6.10532 18.5795 6.2928L12.4914 10.5859L6.40335 6.2928C6.13588 6.11063 5.77766 6.00983 5.40582 6.01211C5.03399 6.01439 4.6783 6.11956 4.41537 6.30498C4.15243 6.49039 4.00328 6.74121 4.00005 7.00342C3.99682 7.26562 4.13976 7.51823 4.39809 7.70684L11.4888 12.707C11.7548 12.8945 12.1154 12.9998 12.4914 12.9998C12.8675 12.9998 13.2281 12.8945 13.4941 12.707L20.5848 7.70684C20.8506 7.51931 21 7.26499 21 6.99982C21 6.73465 20.8506 6.48033 20.5848 6.2928Z" fill="url(#priorityLow)"/>
        <defs><linearGradient id="priorityLow" x1="12.5" y1="6" x2="12.5" y2="19" gradientUnits="userSpaceOnUse"><stop stopColor="#6AA3F9"/><stop offset="1" stopColor="#0065FF"/></linearGradient></defs>
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 5.34783C8.32611 5.34783 5.34783 8.32611 5.34783 12C5.34783 15.6739 8.32611 18.6522 12 18.6522C15.6739 18.6522 18.6522 15.6739 18.6522 12C18.6522 8.32611 15.6739 5.34783 12 5.34783ZM3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12Z" fill="#6F7A90"/>
    </svg>
  );
}

/* ── Filter Chip (mirrors FilterBar's FilterChip) ── */
function TaskFilterChip({ filterDef, value, onSet, onClear }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedLabel = value ? filterDef.options.find(o => o.value === value)?.label || value : null;

  return (
    <div className={styles.chipWrap} ref={ref}>
      <button
        className={[styles.filterChip, value ? styles.filterChipActive : ''].filter(Boolean).join(' ')}
        onClick={() => setOpen(v => !v)}
      >
        {filterDef.label}
        {selectedLabel && <>
          <span style={{ color: 'var(--primary-200)' }}>:</span>
          <span className={styles.filterValue}>{selectedLabel}</span>
        </>}
        {value ? (
          <span
            className={styles.chipClear}
            onClick={(e) => { e.stopPropagation(); onClear(); setOpen(false); }}
          >
            ✕
          </span>
        ) : (
          <Icon name="solar:alt-arrow-down-linear" size={14} />
        )}
      </button>
      {open && (
        <div className={styles.dropdown}>
          {filterDef.options.map(opt => (
            <button
              key={opt.value}
              className={[styles.dropdownItem, value === opt.value ? styles.selected : ''].filter(Boolean).join(' ')}
              onClick={() => {
                if (value === opt.value) onClear();
                else onSet(opt.value);
                setOpen(false);
              }}
            >
              <span className={styles.dropdownCheck}>
                {value === opt.value ? '✓' : ''}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Skeleton Loading ── */
function SkeletonRow() {
  return (
    <div className={styles.taskRow}>
      <div className={styles.cellCheck}>
        <div className={`${styles.skeleton} ${styles.skeletonCircle}`} />
      </div>
      <div className={styles.cellTask}>
        <div className={styles.taskInfo}>
          <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '70%' }} />
          <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '40%', height: 10 }} />
        </div>
      </div>
      <div className={styles.cellP}>
        <div className={`${styles.skeleton} ${styles.skeletonSmall}`} />
      </div>
      <div className={styles.cellStatus}>
        <div className={`${styles.skeleton} ${styles.skeletonBadge}`} />
      </div>
      <div className={styles.cellDue}>
        <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '80%' }} />
      </div>
      <div className={styles.cellMember}>
        <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '60%' }} />
      </div>
      <div className={styles.cellLabels}>
        <div className={`${styles.skeleton} ${styles.skeletonBadge}`} />
      </div>
    </div>
  );
}

/* ── List View: Task Row ── */
function TaskRow({ task, onToggle }) {
  const isCompleted = task.status === 'completed';
  const labels = Array.isArray(task.labels) ? task.labels : [];

  return (
    <div className={styles.taskRow}>
      <div className={styles.cellCheck}>
        <button
          className={`${styles.taskCheckbox} ${isCompleted ? styles.taskCheckboxChecked : ''}`}
          onClick={() => onToggle(task)}
          aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
        >
          {isCompleted && <Icon name="solar:check-read-linear" size={13} color="#fff" />}
        </button>
      </div>

      <div className={styles.cellTask}>
        <div className={styles.taskInfo}>
          {task.parent_task && (
            <span className={styles.parentLabel}>Parent Task : {task.parent_task}</span>
          )}
          {task.is_subtask ? (
            <div className={styles.subtaskRow}>
              <Icon name="solar:reorder-linear" size={14} color="var(--neutral-200)" />
              <span className={styles.taskName}>{task.name}</span>
            </div>
          ) : (
            <span className={styles.taskName}>{task.name}</span>
          )}
          <span className={styles.taskMeta}>{task.meta}</span>
        </div>
        <div className={styles.taskAttachments}>
          {task.attachments > 0 && (
            <span className={styles.attachBadge}>
              <Icon name="solar:paperclip-2-linear" size={14} color="var(--neutral-300)" />
              {task.attachments}
            </span>
          )}
          {task.comments > 0 && (
            <span className={styles.attachBadge}>
              <Icon name="solar:chat-round-line-linear" size={14} color="var(--neutral-300)" />
              {task.comments}
            </span>
          )}
        </div>
      </div>

      <div className={styles.cellP}>
        <PriorityIcon priority={task.priority} size={16} />
      </div>

      <div className={styles.cellStatus}>
        <Badge
          variant={STATUS_BADGE_VARIANTS[task.status]}
          label={STATUS_LABELS[task.status]}
          trailingIcon="solar:alt-arrow-down-linear"
        />
      </div>

      <div className={`${styles.cellDue} ${task.due_missed ? styles.dueMissed : ''}`}>
        {task.due_missed && (
          <Icon name="solar:clock-circle-linear" size={14} color="var(--status-error)" />
        )}
        {task.due_date}
      </div>

      <div className={styles.cellMember}>
        <Icon name="solar:user-linear" size={14} color="var(--neutral-300)" />
        <span
          className={styles.memberLink}
          onClick={(e) => {
            e.stopPropagation();
            const state = useAppStore.getState();
            const match = state.patients.find(p => p.name === task.member)
              || (state.allPatients || []).find(p => p.name === task.member);
            if (match) state.navigateToPatient(match.id);
          }}
        >
          {task.member}
        </span>
      </div>

      <div className={styles.cellLabels}>
        {labels.length > 0
          ? labels.map(l => (
              <Badge key={l} variant="overflow" label={l} />
            ))
          : (
            <button className={styles.addLabel}>
              <Icon name="solar:tag-linear" size={13} color="var(--neutral-200)" />
              Add Label
            </button>
          )
        }
      </div>
    </div>
  );
}

/* ── List View: Status Group ── */
function StatusGroup({ status, tasks, onToggle }) {
  const [collapsed, setCollapsed] = useState(false);
  const label = STATUS_LABELS[status];

  return (
    <div className={styles.statusGroup}>
      <div className={styles.groupHeader} onClick={() => setCollapsed(v => !v)}>
        <div className={styles.groupHeaderLeft}>
          <span className={styles.groupTitle}>{label}</span>
          <Badge variant="overflow" label={`${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`} />
        </div>
        <div className={styles.groupActions}>
          <ActionButton
            icon="solar:add-circle-linear"
            size="S"
            tooltip="Add task"
            onClick={e => e.stopPropagation()}
          />
          <div style={{ width: 0.5, height: 16, background: 'var(--neutral-150)' }} />
          <ActionButton
            icon={collapsed ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-up-linear'}
            size="S"
            tooltip={collapsed ? 'Expand' : 'Collapse'}
            onClick={e => { e.stopPropagation(); setCollapsed(v => !v); }}
          />
        </div>
      </div>
      {!collapsed && tasks.map(t => <TaskRow key={t.id} task={t} onToggle={onToggle} />)}
    </div>
  );
}

/* ── Kanban View: Card content (shared between real card and drag overlay) ── */
function KanbanCardContent({ task }) {
  const isCompleted = task.status === 'completed';
  const labels = Array.isArray(task.labels) ? task.labels : [];
  const memberInitials = task.member ? task.member.split(' ').map(w => w[0]).join('').slice(0, 2) : '';
  const assigneeInitials = task.assigned_to ? task.assigned_to.split(' ').map(w => w[0]).join('').slice(0, 2) : '';

  return (
    <>
      {/* Left priority color bar */}
      <div className={styles.cardBar}>
        <div
          className={styles.cardBarInner}
          style={{ background: PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.none }}
        />
      </div>

      {/* Card body */}
      <div className={styles.cardBody}>
        {/* Row 1: Priority icon + due date + checkbox */}
        <div className={styles.cardTop}>
          <div className={styles.cardTopLeft}>
            <PriorityIcon priority={task.priority} size={16} />
            <span className={`${styles.cardDue} ${task.due_missed ? styles.cardDueMissed : ''}`}>
              Due : {task.due_date}
            </span>
          </div>
          <button
            className={`${styles.taskCheckbox} ${isCompleted ? styles.taskCheckboxChecked : ''}`}
            onClick={(e) => e.stopPropagation()}
            aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
          >
            {isCompleted && <Icon name="solar:check-read-linear" size={13} color="#fff" />}
          </button>
        </div>

        {/* Row 2: Parent task (if subtask) */}
        {task.is_subtask && task.parent_task && (
          <span className={styles.cardParent}>
            <Icon name="solar:reorder-linear" size={12} color="var(--neutral-200)" />
            {task.parent_task}
          </span>
        )}

        {/* Row 3: Task title */}
        <span className={styles.cardTitle}>{task.name}</span>

        {/* Row 4: Labels */}
        {labels.length > 0 && (
          <div className={styles.cardLabels}>
            {labels.map(l => (
              <Badge key={l} variant="overflow" label={l} />
            ))}
          </div>
        )}

        {/* Row 5: Member (patient) + Assigned to (staff) */}
        <div className={styles.cardPeople}>
          <div className={styles.cardPerson}>
            <Avatar variant="patient" initials={memberInitials} className={styles.avatarXs} />
            <span
              className={`${styles.personName} ${styles.memberLink}`}
              onClick={(e) => {
                e.stopPropagation();
                const state = useAppStore.getState();
                const match = state.patients.find(p => p.name === task.member)
                  || (state.allPatients || []).find(p => p.name === task.member);
                if (match) state.navigateToPatient(match.id);
              }}
            >
              {task.member}
            </span>
            <Icon name="solar:arrow-right-up-linear" size={16} color="var(--neutral-200)" />
          </div>
          {task.assigned_to && (
            <div className={styles.cardPerson}>
              <Avatar variant="assignee" initials={assigneeInitials} className={styles.avatarXs} />
              <span className={styles.personName}>{task.assigned_to}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className={styles.cardDivider} />

        {/* Row 6: Meta + linked counts */}
        <div className={styles.cardFooterRow}>
          <span className={styles.cardFooterMeta}>{task.meta}</span>
          <div className={styles.cardLinked}>
            {task.is_subtask && (
              <span className={styles.linkedItem}>
                <Icon name="solar:reorder-linear" size={16} color="var(--neutral-300)" />
                1
              </span>
            )}
            {task.attachments > 0 && (
              <span className={styles.linkedItem}>
                <Icon name="solar:paperclip-2-linear" size={16} color="var(--neutral-300)" />
                {task.attachments}
              </span>
            )}
            {task.comments > 0 && (
              <span className={styles.linkedItem}>
                <Icon name="solar:chat-round-line-linear" size={16} color="var(--neutral-300)" />
                {task.comments}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Kanban View: Draggable Card ── */
function DraggableKanbanCard({ task, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(task.id),
    data: { type: 'task', task, status: task.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.kanbanCard} ${isDragging ? styles.kanbanCardDragging : ''}`}
      {...attributes}
      {...listeners}
      onClick={() => onToggle(task)}
    >
      <KanbanCardContent task={task} />
    </div>
  );
}

/* ── Kanban View: Droppable Column ── */
function DroppableKanbanColumn({ status, tasks, onToggle }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: 'column', status },
  });

  return (
    <div className={`${styles.kanbanColumn} ${isOver ? styles.kanbanColumnOver : ''}`}>
      <div className={styles.kanbanColumnHeader}>
        <div className={styles.kanbanColumnTitle}>
          <span
            className={styles.kanbanStatusDot}
            style={{ background: STATUS_COLORS[status] }}
          />
          <span className={styles.kanbanStatusLabel}>{STATUS_LABELS[status]}</span>
          <Badge variant="overflow" label={`${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`} />
        </div>
        <div className={styles.kanbanColumnActions}>
          <span className={styles.kanbanSort}>Due Date</span>
          <Icon name="solar:alt-arrow-down-linear" size={14} color="var(--neutral-300)" />
          <ActionButton icon="solar:add-circle-linear" size="S" tooltip="Add task" />
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`${styles.kanbanCards} ${isOver ? styles.kanbanCardsOver : ''}`}
        data-status={status}
      >
        {tasks.map(t => (
          <DraggableKanbanCard key={t.id} task={t} onToggle={onToggle} />
        ))}
        {tasks.length === 0 && (
          <div className={styles.kanbanDropHint}>
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Kanban Board with DnD ── */
function KanbanBoard({ kanbanGroups, onToggle, onStatusChange }) {
  const [activeTask, setActiveTask] = useState(null);
  const [overColumn, setOverColumn] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const allTasks = useMemo(() => {
    const map = {};
    kanbanGroups.forEach(g => g.tasks.forEach(t => { map[String(t.id)] = t; }));
    return map;
  }, [kanbanGroups]);

  const handleDragStart = useCallback((event) => {
    const task = allTasks[event.active.id];
    if (task) setActiveTask(task);
  }, [allTasks]);

  const resolveStatus = useCallback((over) => {
    if (!over) return null;
    const overData = over.data?.current;
    if (overData?.type === 'column') return overData.status;
    if (overData?.type === 'task') return overData.status;
    return null;
  }, []);

  const handleDragOver = useCallback((event) => {
    setOverColumn(resolveStatus(event.over));
  }, [resolveStatus]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveTask(null);
    setOverColumn(null);

    if (!over || !active) return;

    const draggedTask = allTasks[active.id];
    if (!draggedTask) return;

    const targetStatus = resolveStatus(over);
    if (targetStatus && targetStatus !== draggedTask.status) {
      onStatusChange(draggedTask.id, targetStatus);
    }
  }, [allTasks, resolveStatus, onStatusChange]);

  const customCollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return closestCenter(args);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.kanbanWrap}>
        {kanbanGroups.map(g => (
          <DroppableKanbanColumn
            key={g.status}
            status={g.status}
            tasks={g.tasks}
            onToggle={onToggle}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeTask && (
          <div className={`${styles.kanbanCard} ${styles.kanbanCardOverlay}`}>
            <KanbanCardContent task={activeTask} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/* ── Empty State ── */
function EmptyState({ title, description, icon }) {
  return (
    <div className={styles.emptyState}>
      <Icon name={icon || 'solar:inbox-linear'} size={48} color="var(--neutral-200)" />
      <span className={styles.emptyTitle}>{title}</span>
      <span className={styles.emptyDescription}>{description}</span>
    </div>
  );
}

/* ── Main View ── */
export function TasksView() {
  const tasks = useAppStore(s => s.tasks);
  const tasksLoading = useAppStore(s => s.tasksLoading);
  const fetchTasks = useAppStore(s => s.fetchTasks);
  const updateTask = useAppStore(s => s.updateTask);
  const tasksTab = useAppStore(s => s.tasksTab);
  const setTasksTab = useAppStore(s => s.setTasksTab);
  const tasksFilters = useAppStore(s => s.tasksFilters);
  const setTasksFilter = useAppStore(s => s.setTasksFilter);
  const clearTasksFilters = useAppStore(s => s.clearTasksFilters);
  const showTasksFilterBar = useAppStore(s => s.showTasksFilterBar);
  const toggleTasksFilterBar = useAppStore(s => s.toggleTasksFilterBar);
  const tasksViewMode = useAppStore(s => s.tasksViewMode);
  const setTasksViewMode = useAppStore(s => s.setTasksViewMode);
  const showToast = useAppStore(s => s.showToast);

  useEffect(() => { fetchTasks(); }, []);

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (tasksTab === 'assigned') {
      result = result.filter(t => t.assigned_to === 'Dr. JeDee Potter');
    } else if (tasksTab === 'pool') {
      return [];
    } else if (tasksTab === 'created') {
      result = result.filter(t => t.created_by === 'Dr. JeDee Potter');
    } else if (tasksTab === 'mentions') {
      result = result.filter(t => t.comments > 0);
    }

    Object.entries(tasksFilters).forEach(([key, value]) => {
      if (!value) return;
      if (key === 'task_status') result = result.filter(t => t.status === value);
      else if (key === 'priority') result = result.filter(t => t.priority === value);
      else if (key === 'assigned_to') result = result.filter(t => t.assigned_to === value);
      else if (key === 'created_by') result = result.filter(t => t.created_by === value);
      else if (key === 'labels') result = result.filter(t => Array.isArray(t.labels) && t.labels.includes(value));
    });

    return result;
  }, [tasks, tasksTab, tasksFilters]);

  const tabCounts = useMemo(() => ({
    assigned: tasks.filter(t => t.assigned_to === 'Dr. JeDee Potter').length,
    pool: 0,
    created: tasks.filter(t => t.created_by === 'Dr. JeDee Potter').length,
    mentions: tasks.filter(t => t.comments > 0).length,
  }), [tasks]);

  const handleToggle = useCallback((task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateTask(task.id, { status: newStatus });
  }, [updateTask]);

  const handleStatusChange = useCallback((taskId, newStatus) => {
    updateTask(taskId, { status: newStatus });
    showToast(`Task moved to ${STATUS_LABELS[newStatus]}`);
  }, [updateTask, showToast]);

  const grouped = STATUS_ORDER.reduce((acc, status) => {
    const filtered = filteredTasks.filter(t => t.status === status);
    if (filtered.length) acc.push({ status, tasks: filtered });
    return acc;
  }, []);

  const kanbanGroups = STATUS_ORDER.map(status => ({
    status,
    tasks: filteredTasks.filter(t => t.status === status),
  }));

  const activeFilterCount = Object.keys(tasksFilters).length;

  const renderContent = () => {
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
            <div className={`${styles.thCell} ${styles.colMember}`}>Member</div>
            <div className={`${styles.thCell} ${styles.colLabels}`}>Labels</div>
          </div>
          {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
        </div>
      );
    }

    if (tasksTab === 'pool') {
      return (
        <EmptyState
          title="No tasks in your pool"
          description="Tasks assigned to your team but not yet claimed will appear here."
          icon="solar:inbox-linear"
        />
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
          onStatusChange={handleStatusChange}
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
          <div className={`${styles.thCell} ${styles.colMember}`}>Member</div>
          <div className={`${styles.thCell} ${styles.colLabels}`}>Labels</div>
        </div>

        {grouped.map(g => (
          <StatusGroup key={g.status} status={g.status} tasks={g.tasks} onToggle={handleToggle} />
        ))}
      </div>
    );
  };

  return (
    <div className={styles.wrapper}>
      <TopBar />

      <div className={styles.tabBar}>
        <div className={styles.tabLeft}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`${styles.tabItem} ${tasksTab === tab.key ? styles.active : ''}`}
              onClick={() => setTasksTab(tab.key)}
            >
              {tab.label}
              <Badge variant="overflow" label={String(tabCounts[tab.key])} />
            </button>
          ))}
        </div>
        <div className={styles.tabRight}>
          <Toggle
            items={VIEW_TOGGLE_ITEMS}
            active={tasksViewMode}
            onChange={setTasksViewMode}
            size="S"
          />
          <span className={styles.iconDivider} />
          <ActionButton
            icon="solar:filter-linear"
            size="L"
            tooltip={showTasksFilterBar ? 'Hide filters' : 'Show filters'}
            onClick={toggleTasksFilterBar}
          />
          <span className={styles.iconDivider} />
          <Button variant="secondary" size="L" leadingIcon="solar:add-circle-linear" onClick={() => showToast('Add Task — coming soon')}>
            Add Task
          </Button>
          <span className={styles.iconDivider} />
          <ActionButton icon="solar:settings-linear" size="L" tooltip="Settings" />
        </div>
      </div>

      {showTasksFilterBar && (
        <div className={styles.filterBar}>
          {TASK_FILTER_DEFS.map(fd => (
            <TaskFilterChip
              key={fd.key}
              filterDef={fd}
              value={tasksFilters[fd.key] || null}
              onSet={(val) => setTasksFilter(fd.key, val)}
              onClear={() => setTasksFilter(fd.key, null)}
            />
          ))}
          {activeFilterCount > 0 && (
            <span className={styles.activeCount}>{activeFilterCount} active</span>
          )}
          <span className={styles.filterSpacer} />
          <button className={styles.clearAll} onClick={clearTasksFilters}>Clear All</button>
        </div>
      )}

      {renderContent()}
    </div>
  );
}
