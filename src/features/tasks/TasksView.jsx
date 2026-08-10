import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import { SectionTitleBar } from '../../components/SectionTitleBar/SectionTitleBar';
import { Drawer } from '../../components/Drawer/Drawer';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { CommentComposer } from '../../components/CommentComposer/CommentComposer';
import { PdfPreviewOverlay } from '../../components/PdfPreviewOverlay/PdfPreviewOverlay';
import { ClinicalNotePanel } from '../hedis-worklist/ClinicalNotePanel';
import { Select } from '../../components/Select/Select';
import { SectionPagination } from '../../components/SectionPagination/SectionPagination';
import { MenuPopover } from '../../components/MenuPopover/MenuPopover';
import { FilterBar } from '../../components/FilterBar/FilterBar';
import { RingEmptyState } from '../../components/RingEmptyState/RingEmptyState';
import { useAppStore } from '../../store/useAppStore';
import { toast } from '../../components/Toast/Toast';
import styles from './TasksView.module.css';

const TABS = [
  { key: 'all', label: 'All Tasks' },
  { key: 'assigned', label: 'Assigned to Me' },
  { key: 'pool', label: 'My Task Pool' },
  { key: 'created', label: 'Created by Me' },
  { key: 'mentions', label: 'Mentions' },
];

function KanbanIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <path d="M7.75 6C7.75 5.59 7.41 5.25 7 5.25C6.59 5.25 6.25 5.59 6.25 6H7.75ZM6.25 17C6.25 17.41 6.59 17.75 7 17.75C7.41 17.75 7.75 17.41 7.75 17H6.25ZM12.75 6C12.75 5.59 12.41 5.25 12 5.25C11.59 5.25 11.25 5.59 11.25 6H12.75ZM11.25 12C11.25 12.41 11.59 12.75 12 12.75C12.41 12.75 12.75 12.41 12.75 12H11.25ZM17.75 6C17.75 5.59 17.41 5.25 17 5.25C16.59 5.25 16.25 5.59 16.25 6H17.75ZM16.25 15.5C16.25 15.91 16.59 16.25 17 16.25C17.41 16.25 17.75 15.91 17.75 15.5H16.25ZM12 22V21.25C9.62 21.25 7.91 21.25 6.61 21.07C5.34 20.9 4.56 20.57 3.99 20.01L3.46 20.54L2.93 21.07C3.83 21.96 4.97 22.366 6.41 22.56C7.84 22.75 9.66 22.75 12 22.75V22ZM2 12H1.25C1.25 14.34 1.25 16.16 1.44 17.59C1.63 19.031 2.04 20.17 2.93 21.07L3.46 20.54L3.99 20.01C3.43 19.44 3.1 18.66 2.93 17.39C2.75 16.09 2.75 14.38 2.75 12H2ZM22 12H21.25C21.25 14.38 21.25 16.09 21.07 17.39C20.9 18.66 20.57 19.44 20.01 20.01L20.54 20.54L21.07 21.07C21.96 20.17 22.366 19.031 22.56 17.59C22.75 16.16 22.75 14.34 22.75 12H22ZM12 22V22.75C14.34 22.75 16.16 22.75 17.59 22.56C19.031 22.366 20.17 21.96 21.07 21.07L20.54 20.54L20.01 20.01C19.44 20.57 18.66 20.9 17.39 21.07C16.09 21.25 14.38 21.25 12 21.25V22ZM12 2V2.75C14.38 2.75 16.09 2.75 17.39 2.93C18.66 3.1 19.44 3.43 20.01 3.99L20.54 3.46L21.07 2.93C20.17 2.04 19.031 1.63 17.59 1.44C16.16 1.25 14.34 1.25 12 1.25V2ZM22 12H22.75C22.75 9.66 22.75 7.84 22.56 6.41C22.366 4.97 21.96 3.83 21.07 2.93L20.54 3.46L20.01 3.99C20.57 4.56 20.9 5.34 21.07 6.61C21.25 7.91 21.25 9.62 21.25 12H22ZM12 2V1.25C9.66 1.25 7.84 1.25 6.41 1.44C4.97 1.63 3.83 2.04 2.93 2.93L3.46 3.46L3.99 3.99C4.56 3.43 5.34 3.1 6.61 2.93C7.91 2.75 9.62 2.75 12 2.75V2ZM2 12H2.75C2.75 9.62 2.75 7.91 2.93 6.61C3.1 5.34 3.43 4.56 3.99 3.99L3.46 3.46L2.93 2.93C2.04 3.83 1.63 4.97 1.44 6.41C1.25 7.84 1.25 9.66 1.25 12H2ZM7 6H6.25V17H7H7.75V6H7ZM12 6H11.25V12H12H12.75V6H12ZM17 6H16.25V15.5H17H17.75V6H17Z" fill="currentColor"/>
    </svg>
  );
}

const VIEW_TOGGLE_ITEMS = [
  { key: 'list', icon: 'solar:list-linear' },
  { key: 'board', icon: <KanbanIcon size={16} /> },
];

function getInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').slice(0, 2) : '';
}

const AUDIT_LOG_VERB_MAP = {
  created: 'created the task.',
  status_changed: 'changed the Status',
  priority_changed: 'changed the Priority',
  due_date_changed: 'changed the Due Date',
  assignee_changed: 'changed the Assignee',
  label_added: 'added a Label',
  label_removed: 'removed a Label',
  description_changed: 'updated the Description',
  renamed: 'renamed the task',
  comment_added: 'added a Comment',
  subtask_added: 'added a Subtask',
  claimed: 'claimed the task',
  deleted: 'deleted the task',
};

// `primary: true` → chip renders by default in the shared FilterBar.
const TASK_FILTER_DEFS = [
  { key: 'assigned_to', label: 'Assigned to', primary: true, options: [
    { value: 'Dr. JeDee Potter', label: 'Dr. JeDee Potter' },
    { value: 'Deborah Hintz', label: 'Deborah Hintz' },
    { value: 'Dr. Robert Frost', label: 'Dr. Robert Frost' },
  ]},
  { key: 'view_by', label: 'View By', primary: true, options: [
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'due_date', label: 'Due Date' },
  ]},
  { key: 'sort_by', label: 'Sort By', primary: true, options: [
    { value: 'due_date', label: 'Due Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'name', label: 'Name' },
  ]},
  { key: 'created_by', label: 'Created By', primary: true, options: [
    { value: 'Dr. JeDee Potter', label: 'Dr. JeDee Potter' },
    { value: 'Deborah Hintz', label: 'Deborah Hintz' },
    { value: 'Dr. Robert Frost', label: 'Dr. Robert Frost' },
  ]},
  { key: 'task_status', label: 'Task Status', primary: true, options: [
    { value: 'pending', label: 'Pending' },
    { value: 'missed', label: 'Missed' },
    { value: 'completed', label: 'Completed' },
  ]},
  { key: 'priority', label: 'Priority', primary: true, options: [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ]},
  { key: 'labels', label: 'Labels', primary: true, options: [
    { value: 'Hypertension', label: 'Hypertension' },
    { value: 'Exercise', label: 'Exercise' },
    { value: 'Document Collection', label: 'Document Collection' },
  ]},
];

const STATUS_ORDER = ['pending', 'missed', 'completed'];
const STATUS_LABELS = { pending: 'Pending', missed: 'Missed', completed: 'Completed' };
const PRIORITY_ORDER = ['high', 'medium', 'low', 'none'];
const PRIORITY_LABELS = { high: 'High', medium: 'Medium', low: 'Low', none: 'None' };
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

/* ── Date helpers ── */
function parseTaskDate(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.split('-').map(Number);
  if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) return null;
  const [m, d, y] = parts;
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  return date;
}

function todayStart() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function todayMMDDYYYY() {
  const t = new Date();
  return `${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}-${t.getFullYear()}`;
}

function isOverdue(task) {
  if (!task || !task.due_date || task.status === 'completed') return false;
  const d = parseTaskDate(task.due_date);
  if (!d) return false;
  return d < todayStart() || task.status === 'missed';
}

function formatDateFriendly(str) {
  if (!str) return 'Select Date';
  const d = parseTaskDate(str);
  if (!d) return str;
  const today = todayStart();
  const diff = Math.round((d - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return str;
}

function SubtaskIcon({ size = 16, color = 'var(--primary-300)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M3.33 6H12.67C13.77 6 14.67 5.1 14.67 4C14.67 2.9 13.77 2 12.67 2H3.33C2.23 2 1.33 2.9 1.33 4C1.33 5.1 2.23 6 3.33 6ZM3.33 6L3.33 9.33C3.33 10.81 4.53 12 6 12M6 12C6 13.1 6.9 14 8 14H12.67C13.77 14 14.67 13.1 14.67 12C14.67 10.9 13.77 10 12.67 10H8C6.9 10 6 10.9 6 12Z" stroke={color} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PriorityIcon({ priority, size = 24 }) {
  const s = size;
  if (priority === 'high') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path fillRule="evenodd" clipRule="evenodd" d="M19.71 12.2C19.46 12.37 19.12 12.47 18.762 12.47C18.41 12.47 18.06 12.37 17.81 12.2L12.04 8.13L6.28 12.2C6.02 12.37 5.68 12.46 5.33 12.462C4.98 12.46 4.64 12.36 4.39 12.18C4.14 12.01 4 11.77 4 11.52C4 11.27 4.13 11.04 4.38 10.86L11.09 6.12C11.35 5.94 11.69 5.84 12.04 5.84C12.4 5.84 12.74 5.94 12.99 6.12L19.71 10.86C19.96 11.03 20.11 11.28 20.11 11.53C20.11 11.78 19.96 12.02 19.71 12.2ZM19.71 17.88C19.46 18.06 19.12 18.16 18.762 18.16C18.41 18.16 18.06 18.06 17.81 17.88L12.04 13.81L6.28 17.88C6.02 18.05 5.68 18.15 5.33 18.15C4.98 18.14 4.64 18.04 4.39 17.869C4.14 17.69 4 17.46 4 17.21C4 16.96 4.13 16.72 4.38 16.54L11.09 11.8C11.35 11.63 11.69 11.53 12.04 11.53C12.4 11.53 12.74 11.63 12.99 11.8L19.71 16.54C19.96 16.72 20.11 16.96 20.11 17.21C20.11 17.46 19.96 17.7 19.71 17.88Z" fill="url(#priorityHigh)"/>
        <defs><linearGradient id="priorityHigh" x1="12.0526" y1="5.8421" x2="12.0526" y2="18.1579" gradientUnits="userSpaceOnUse"><stop stopColor="#FF623E"/><stop offset="1" stopColor="#ED876F"/></linearGradient></defs>
      </svg>
    );
  }
  if (priority === 'medium') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path d="M4.5 13C3.81 13 3.25 13.56 3.25 14.25C3.25 14.94 3.81 15.5 4.5 15.5H19.5C20.19 15.5 20.75 14.94 20.75 14.25C20.75 13.56 20.19 13 19.5 13H4.5ZM4.5 8C3.81 8 3.25 8.56 3.25 9.25C3.25 9.94 3.81 10.5 4.5 10.5H19.5C20.19 10.5 20.75 9.94 20.75 9.25C20.75 8.56 20.19 8 19.5 8H4.5Z" fill="#FFAB00"/>
      </svg>
    );
  }
  if (priority === 'low') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path fillRule="evenodd" clipRule="evenodd" d="M20.58 12.293C20.32 12.11 19.96 12 19.58 12C19.21 12 18.85 12.11 18.58 12.293L12.49 16.59L6.4 12.293C6.14 12.11 5.78 12.01 5.41 12.01C5.03 12.01 4.68 12.12 4.42 12.31C4.15 12.49 4 12.74 4 13C4 13.27 4.14 13.52 4.4 13.707L11.49 18.71C11.75 18.89 12.12 19 12.49 19C12.87 19 13.23 18.89 13.49 18.71L20.58 13.707C20.85 13.52 21 13.27 21 13C21 12.73 20.85 12.48 20.58 12.293ZM20.58 6.29C20.32 6.11 19.96 6 19.58 6C19.21 6 18.85 6.11 18.58 6.29L12.49 10.59L6.4 6.29C6.14 6.11 5.78 6.01 5.41 6.01C5.03 6.01 4.68 6.12 4.42 6.3C4.15 6.49 4 6.74 4 7C4 7.27 4.14 7.52 4.4 7.71L11.49 12.707C11.75 12.89 12.12 13 12.49 13C12.87 13 13.23 12.89 13.49 12.707L20.58 7.71C20.85 7.52 21 7.26 21 7C21 6.73 20.85 6.48 20.58 6.29Z" fill="url(#priorityLow)"/>
        <defs><linearGradient id="priorityLow" x1="12.5" y1="6" x2="12.5" y2="19" gradientUnits="userSpaceOnUse"><stop stopColor="#6AA3F9"/><stop offset="1" stopColor="#0065FF"/></linearGradient></defs>
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 5.35C8.33 5.35 5.35 8.33 5.35 12C5.35 15.67 8.33 18.65 12 18.65C15.67 18.65 18.65 15.67 18.65 12C18.65 8.33 15.67 5.35 12 5.35ZM3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12Z" fill="#6F7A90"/>
    </svg>
  );
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/* ── Date Picker (inline calendar, same as appointment drawer) ── */
function TaskDatePicker({ value, onSelect, overdue }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) return new Date(+parts[2], +parts[0] - 1, 1);
    }
    return new Date();
  });
  const btnRef = useRef(null);

  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const selectedParts = value ? value.split('-') : null;
  const selectedDay = selectedParts ? +selectedParts[1] : null;
  const selectedMonth = selectedParts ? +selectedParts[0] - 1 : null;
  const selectedYear = selectedParts ? +selectedParts[2] : null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const isToday = (d) => d === todayDay && month === todayMonth && year === todayYear;
  const isSelected = (d) => d === selectedDay && month === selectedMonth && year === selectedYear;

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        className={styles.detailValue}
        style={{ color: overdue ? 'var(--status-error)' : (value ? 'var(--neutral-300)' : 'var(--neutral-200)') }}
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
      >
        <Icon name="solar:calendar-linear" size={16} color={overdue ? 'var(--status-error)' : (value ? 'var(--neutral-300)' : 'var(--neutral-200)')} />
        <span>{formatDateFriendly(value)}</span>
      </button>
      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)}>
          <div
            className={styles.calendarDropdown}
            style={{ position: 'fixed', top: btnRef.current?.getBoundingClientRect().bottom + 4, left: btnRef.current?.getBoundingClientRect().left, zIndex: 9999 }}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.calendarHeader}>
              <ActionButton icon="solar:alt-arrow-left-linear" size="S" onClick={() => setViewDate(new Date(year, month - 1, 1))} />
              <span className={styles.calendarTitle}>{MONTH_NAMES[month]} {year}</span>
              <ActionButton icon="solar:alt-arrow-right-linear" size="S" onClick={() => setViewDate(new Date(year, month + 1, 1))} />
            </div>
            <div className={styles.calendarGrid}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className={styles.calendarDayLabel}>{d}</div>)}
              {days.map((d, i) => d ? (
                <button
                  key={i}
                  className={[styles.calendarDay, isToday(d) ? styles.calendarToday : '', isSelected(d) ? styles.calendarSelected : ''].filter(Boolean).join(' ')}
                  onClick={() => { onSelect(`${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}-${year}`); setOpen(false); }}
                >{d}</button>
              ) : <div key={i} />)}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── Inline Label Dropdown for list rows (multi-select with search + create) ── */
function RowLabelDropdown({ task, children }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const btnRef = useRef(null);
  const updateTask = useAppStore(s => s.updateTask);
  const showToast = useAppStore(s => s.showToast);
  const taskLabels = useAppStore(s => s.taskLabels);
  const createTaskLabel = useAppStore(s => s.createTaskLabel);
  const labels = Array.isArray(task.labels) ? task.labels : [];
  const labelSet = useMemo(() => new Set(labels), [labels]);
  const filtered = taskLabels.filter(l => !search || l.toLowerCase().includes(search.toLowerCase()));
  const exact = taskLabels.find(l => l.toLowerCase() === search.trim().toLowerCase());
  const canCreate = search.trim() && !exact;

  const toggle = (l) => {
    const next = labels.includes(l) ? labels.filter(x => x !== l) : [...labels, l];
    updateTask(task.id, { labels: next });
    showToast(labels.includes(l) ? `Label "${l}" removed` : `Label "${l}" added`);
  };

  const handleCreate = async () => {
    const created = await createTaskLabel(search.trim());
    if (created) {
      showToast(`Label "${created}" created`);
      const next = [...labels, created];
      updateTask(task.id, { labels: next });
      setSearch('');
    }
  };

  return (
    <div ref={btnRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setOpen(v => !v); }}>
      {children || (
        <button className={styles.addLabel}>
          <Icon name="solar:tag-linear" size={13} color="var(--neutral-200)" />
          Add Label
        </button>
      )}
      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={e => { e.stopPropagation(); setOpen(false); setSearch(''); }}>
          <div
            className={styles.simpleDropdown}
            style={{ position: 'fixed', top: btnRef.current?.getBoundingClientRect().bottom + 4, left: btnRef.current?.getBoundingClientRect().left, zIndex: 9999 }}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.dropdownSearch}>
              <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-200)" />
              <input
                className={styles.dropdownSearchInput}
                placeholder="Search or create..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && canCreate) handleCreate(); }}
                autoFocus
              />
            </div>
            {filtered.map(l => (
              <button key={l} className={styles.simpleDropItem} onClick={() => toggle(l)}>
                <input type="checkbox" checked={labelSet.has(l)} readOnly style={{ accentColor: 'var(--primary-300)', width: 15, height: 15, flexShrink: 0 }} />
                {l}
              </button>
            ))}
            {canCreate && (
              <button className={styles.simpleDropItem} style={{ color: 'var(--primary-300)', fontWeight: 500 }} onClick={handleCreate}>
                <Icon name="solar:add-circle-linear" size={14} color="var(--primary-300)" />
                Create "{search.trim()}"
              </button>
            )}
            {filtered.length === 0 && !canCreate && (
              <div className={styles.simpleDropItem} style={{ color: 'var(--neutral-200)', cursor: 'default' }}>No results</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── Three-dot Action Menu for rows and kanban cards ── */
function RowActionMenu({ task }) {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const btnRef = useRef(null);
  const updateTask = useAppStore(s => s.updateTask);
  const deleteTask = useAppStore(s => s.deleteTask);
  const showToast = useAppStore(s => s.showToast);
  const allTasks = useAppStore(s => s.tasks);
  const completeCareGapSignOffTask = useAppStore(s => s.completeCareGapSignOffTask);
  const subCount = allTasks.filter(t => t.parent_task_id === task.id).length;

  // HEDIS sign-off tasks route through a dedicated store action so all gaps
  // in the task transition to Completed atomically (AC-13).
  const completeTask = () => {
    if (task.hedisMemberId) {
      completeCareGapSignOffTask(task.id, 'NP');
      showToast('Sign-off task completed — gaps closed');
    } else {
      updateTask(task.id, { status: 'completed' });
      showToast('Task marked as complete');
    }
  };

  const actions = [];
  if (task.status === 'pending') {
    actions.push({ key: 'complete', label: 'Mark as Complete', icon: 'solar:check-circle-linear', handler: completeTask });
    actions.push({ key: 'missed', label: 'Mark as Missed', icon: 'solar:close-circle-linear', handler: () => { updateTask(task.id, { status: 'missed' }); showToast('Task marked as missed'); } });
  } else if (task.status === 'missed') {
    actions.push({ key: 'pending', label: 'Mark as Pending', icon: 'solar:clock-circle-linear', handler: () => { updateTask(task.id, { status: 'pending' }); showToast('Task marked as pending'); } });
    actions.push({ key: 'complete', label: 'Mark as Complete', icon: 'solar:check-circle-linear', handler: completeTask });
  } else if (task.status === 'completed') {
    actions.push({ key: 'pending', label: 'Mark as Pending', icon: 'solar:clock-circle-linear', handler: () => { updateTask(task.id, { status: 'pending' }); showToast('Task marked as pending'); } });
    actions.push({ key: 'missed', label: 'Mark as Missed', icon: 'solar:close-circle-linear', handler: () => { updateTask(task.id, { status: 'missed' }); showToast('Task marked as missed'); } });
  }
  // HEDIS sign-off tasks carry the consolidated clinical-note PDF. The
  // preview is rendered inline via PdfPreviewOverlay so the user stays in
  // the Tasks view (matches production "preview in the same window").
  if (task.consolidatedPdf?.blob) {
    actions.unshift({
      key: 'view-pdf',
      label: 'View consolidated PDF',
      icon: 'solar:document-text-linear',
      handler: () => setPdfPreview(task.consolidatedPdf),
    });
  }
  actions.push({ key: 'delete', label: 'Delete', icon: 'solar:trash-bin-trash-linear', danger: true, handler: () => setShowDeleteConfirm(true) });

  return (
    <div ref={btnRef} style={{ position: 'relative' }}>
      <button className={styles.actionMenuBtn} onClick={e => { e.stopPropagation(); setOpen(v => !v); }}>
        <Icon name="solar:menu-dots-bold" size={16} color="var(--neutral-300)" />
      </button>
      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={e => { e.stopPropagation(); setOpen(false); }}>
          <div
            className={styles.actionMenuDropdown}
            style={{ position: 'fixed', top: btnRef.current?.getBoundingClientRect().bottom + 4, left: btnRef.current?.getBoundingClientRect().right - 180, zIndex: 9999 }}
            onClick={e => e.stopPropagation()}
          >
            {actions.map(a => (
              <button key={a.key} className={`${styles.actionMenuItem} ${a.danger ? styles.actionMenuDanger : ''}`} onClick={() => { a.handler(); setOpen(false); }}>
                <Icon name={a.icon} size={16} />
                {a.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
      {pdfPreview && (
        <PdfPreviewOverlay
          blob={pdfPreview.blob}
          filename={pdfPreview.filename}
          onClose={() => setPdfPreview(null)}
        />
      )}
      {showDeleteConfirm && (
        <ConfirmDialog
          icon="solar:danger-triangle-linear"
          iconColor="var(--status-error)"
          title="Delete this task?"
          description={subCount > 0 ? `This task has ${subCount} subtask(s). Deleting it will also delete all subtasks. This cannot be undone.` : 'This action cannot be undone.'}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="error"
          onConfirm={() => { deleteTask(task.id); showToast('Task deleted'); setShowDeleteConfirm(false); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

/* ── Inline Status Dropdown for list rows ── */
function RowStatusDropdown({ task }) {
  const updateTask = useAppStore(s => s.updateTask);
  const showToast = useAppStore(s => s.showToast);
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        aria-label="Change status"
      >
        <Badge variant={STATUS_BADGE_VARIANTS[task.status]} label={STATUS_LABELS[task.status]} trailingIcon="solar:alt-arrow-down-linear" />
      </button>
      {open && (
        <MenuPopover
          anchorRef={btnRef}
          items={STATUS_ORDER.map(s => ({ key: s, label: STATUS_LABELS[s] }))}
          onSelect={v => { updateTask(task.id, { status: v }); showToast(`Status changed to ${STATUS_LABELS[v]}`); }}
          onClose={() => setOpen(false)}
          width={160}
          align="left"
          ariaLabel="Change status"
        />
      )}
    </>
  );
}

/* ── Inline Assignee Dropdown for list rows ──
 * Mirrors the look of RowLabelDropdown: small pill in the row that
 * opens a portal-anchored picker. Sources its options from
 * useAppStore.taskProfiles (profiles table) with the current user
 * pinned at top with "(You)". When the row has no assignee, renders an
 * "Assign" empty-state pill in neutral-200 (same pattern as Add Label).
 */
function RowAssignDropdown({ task }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const btnRef = useRef(null);
  const updateTask = useAppStore(s => s.updateTask);
  const showToast = useAppStore(s => s.showToast);
  const taskProfiles = useAppStore(s => s.taskProfiles);
  const currentUserProfile = useAppStore(s => s.currentUserProfile);

  // Build picker options: current user first (with "(You)"), then everyone else.
  const profiles = (() => {
    const seen = new Set();
    const list = [];
    if (currentUserProfile?.id) {
      list.push({ ...currentUserProfile, label: `${currentUserProfile.name} (You)` });
      seen.add(currentUserProfile.id);
    }
    (taskProfiles || []).forEach(p => {
      if (seen.has(p.id)) return;
      list.push({ ...p, label: p.name });
      seen.add(p.id);
    });
    return list;
  })();

  const filtered = profiles.filter(p => !search || (p.name || '').toLowerCase().includes(search.toLowerCase()));

  const pick = (profile) => {
    updateTask(task.id, { assigned_to: profile.name, assigned_to_id: profile.id || null });
    showToast(`Assigned to ${profile.name}`);
    setOpen(false);
    setSearch('');
  };

  const handleUnassign = () => {
    updateTask(task.id, { assigned_to: null, assigned_to_id: null });
    showToast('Unassigned');
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={btnRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }} onClick={e => { e.stopPropagation(); setOpen(v => !v); }}>
      {task.assigned_to ? (
        <button className={styles.assignPill} aria-label={`Assigned to ${task.assigned_to}. Click to change.`}>
          <Icon name="solar:user-linear" size={14} color="var(--neutral-300)" />
          <span>{task.assigned_to}</span>
        </button>
      ) : (
        <button className={styles.assignEmpty} aria-label="Assign">
          <Icon name="solar:user-linear" size={13} color="var(--neutral-200)" />
          Assign
        </button>
      )}
      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={e => { e.stopPropagation(); setOpen(false); setSearch(''); }}>
          <div
            className={styles.simpleDropdown}
            style={{ position: 'fixed', top: btnRef.current?.getBoundingClientRect().bottom + 4, left: btnRef.current?.getBoundingClientRect().left, zIndex: 9999 }}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.dropdownSearch}>
              <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-200)" />
              <input
                className={styles.dropdownSearchInput}
                placeholder="Search assignees..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            {filtered.map(p => {
              const initials = (p.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <button key={p.id || p.name} className={styles.simpleDropItem} onClick={() => pick(p)}>
                  <Avatar variant="assignee" initials={initials} className={styles.avatarXs} />
                  <span>{p.label}</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className={styles.simpleDropItem} style={{ color: 'var(--neutral-200)', cursor: 'default' }}>No matches</div>
            )}
            {task.assigned_to && (
              <button className={styles.simpleDropItem} style={{ color: 'var(--status-error)', borderTop: '0.5px solid var(--neutral-100)' }} onClick={handleUnassign}>
                <Icon name="solar:close-circle-linear" size={14} color="var(--status-error)" />
                Unassign
              </button>
            )}
          </div>
        </div>,
        document.body
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
function TaskRow({ task, onToggle, onTaskClick, hideAssignedTo, hideMember, pinnedEnds }) {
  const isCompleted = task.status === 'completed';
  const labels = Array.isArray(task.labels) ? task.labels : [];
  const updateTask = useAppStore(s => s.updateTask);
  const showToast = useAppStore(s => s.showToast);

  return (
    <div className={styles.taskRow} onClick={() => onTaskClick?.(task)}>
      <div className={`${styles.cellCheck} ${pinnedEnds ? styles.pinLeft0 : ''}`}>
        <button
          className={`${styles.taskCheckbox} ${isCompleted ? styles.taskCheckboxChecked : ''}`}
          onClick={e => { e.stopPropagation(); onToggle(task); }}
          aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
        >
          <span className={styles.taskCheckIcon}>
            <Icon name="solar:check-read-linear" size={13} color="var(--neutral-0)" />
          </span>
        </button>
      </div>

      <div className={`${styles.cellTask} ${pinnedEnds ? styles.pinLeftCheck : ''}`}>
        <div className={styles.taskInfo}>
          {task.parent_task && (
            <span className={styles.parentLabel}>Parent Task : {task.parent_task}</span>
          )}
          {task.is_subtask ? (
            <div className={styles.subtaskRow}>
              <SubtaskIcon size={14} color="var(--primary-300)" />
              <span className={`${styles.taskName} ${isCompleted ? styles.taskNameDone : ''}`}>{task.name}</span>
            </div>
          ) : (
            <span className={`${styles.taskName} ${isCompleted ? styles.taskNameDone : ''}`}>{task.name}</span>
          )}
          <span className={styles.taskMeta}>
            {`By : ${task.created_by?.trim() || 'System Automation'}${task.meta ? ` • ${task.meta}` : ''}`}
          </span>
        </div>
        <div className={styles.taskAttachments}>
          {task.attachments > 0 && (
            <span className={styles.attachBadge}>
              <Icon name="solar:paperclip-linear" size={14} color="var(--neutral-300)" />
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

      <div className={styles.cellStatus} onClick={e => e.stopPropagation()}>
        <RowStatusDropdown task={task} />
      </div>

      <div className={`${styles.cellDue} ${isOverdue(task) ? styles.dueMissed : ''}`} onClick={e => e.stopPropagation()}>
        <TaskDatePicker value={task.due_date} overdue={isOverdue(task)} onSelect={v => { updateTask(task.id, { due_date: v }); showToast('Due date updated'); }} />
      </div>

      {!hideAssignedTo && (
        <div className={styles.cellAssigned} onClick={e => e.stopPropagation()}>
          <RowAssignDropdown task={task} />
        </div>
      )}

      {!hideMember && (
        <div className={styles.cellMember}>
          <Icon name="solar:user-linear" size={14} color="var(--neutral-300)" />
          <span
            className={styles.memberLink}
            onClick={(e) => {
              e.stopPropagation();
              const state = useAppStore.getState();
              const match = state.patients.find(p => p.name === task.member)
                || (state.allPatients || []).find(p => p.name === task.member);
              if (match) state.openQuickView(match);
            }}
          >
            {task.member}
          </span>
        </div>
      )}

      <div className={styles.cellLabels} onClick={e => e.stopPropagation()}>
        <RowLabelDropdown task={task}>
          {labels.length > 0 ? (
            <>
              {labels.slice(0, 2).map(l => (
                <Badge key={l} variant="overflow" label={l} />
              ))}
              {labels.length > 2 && (
                <span className={styles.labelOverflow} title={labels.slice(2).join(', ')}>+{labels.length - 2}</span>
              )}
            </>
          ) : (
            <button className={styles.addLabel}>
              <Icon name="solar:tag-linear" size={13} color="var(--neutral-200)" />
              Add Label
            </button>
          )}
        </RowLabelDropdown>
      </div>

      <div className={`${styles.cellActions} ${pinnedEnds ? styles.pinRight0 : ''}`} onClick={e => e.stopPropagation()}>
        <RowActionMenu task={task} />
      </div>
    </div>
  );
}

/* ── List View: Status Group ── */
const PAGE_SIZE = 5;

function StatusGroup({ status, label: labelProp, tasks, onToggle, onTaskClick, hideAssignedTo, hideMember, onAddTask }) {
  const [collapsed, setCollapsed] = useState(false);
  const [page, setPage] = useState(0);
  const label = labelProp || STATUS_LABELS[status];
  const totalPages = Math.max(1, Math.ceil(tasks.length / PAGE_SIZE));
  // Reset to a valid page when the task list shrinks/grows past current page
  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [totalPages, page]);
  const paginated = tasks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className={styles.statusGroup}>
      <div className={styles.groupHeader} onClick={() => setCollapsed(v => !v)}>
        <div className={styles.groupHeaderLeft}>
          <span className={styles.groupTitle}>{label}</span>
          <Badge variant="overflow" label={`${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`} />
        </div>
        {/* tooltipLeft: these sit at the scroll container's right edge —
            a right-opening tooltip bubble extends scrollWidth past the
            container and produces a phantom horizontal scrollbar. */}
        <div className={styles.groupActions}>
          <ActionButton
            icon="solar:add-circle-linear"
            size="S"
            tooltip="Add task"
            tooltipLeft
            onClick={e => { e.stopPropagation(); onAddTask?.(status); }}
          />
          <div style={{ width: 0.5, height: 16, background: 'var(--neutral-150)' }} />
          <ActionButton
            icon={collapsed ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-up-linear'}
            size="S"
            tooltip={collapsed ? 'Expand' : 'Collapse'}
            tooltipLeft
            onClick={e => { e.stopPropagation(); setCollapsed(v => !v); }}
          />
        </div>
      </div>
      {!collapsed && (
        <>
          {paginated.map(t => <TaskRow key={t.id} task={t} onToggle={onToggle} onTaskClick={onTaskClick} hideAssignedTo={hideAssignedTo} hideMember={hideMember} />)}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button className={styles.pageBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <Icon name="solar:alt-arrow-left-linear" size={14} />
              </button>
              <span className={styles.pageInfo}>{page + 1} / {totalPages}</span>
              <button className={styles.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <Icon name="solar:alt-arrow-right-linear" size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * ProgramTaskSection — one "Open"/"Completed" section: a title, then the shared
 * Tasks table header + TaskRows in a fixed ~5-row scroll box, with the Task
 * Title (+ check) pinned left and the action column pinned right. Reuses the
 * standard TaskRow so rows look exactly like the Tasks module. When the section
 * has no tasks it shows the ring empty state instead of the table.
 */
const PROG_TASKS_PER_PAGE = 5;

function ProgramTaskSection({ title, tasks, onToggle, onTaskClick, hideAssignedTo, hideMember, onAddTask, emptyLabel }) {
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
 * "Open" = anything not completed; "Completed" only renders when non-empty.
 * Toggling completion updates the shared task store. Pass `hideMember` when
 * already in a member context.
 */
export function TaskListSection({ tasks = [], onTaskClick, hideAssignedTo = false, hideMember = false, onAddTask }) {
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
        onAddTask={onAddTask}
        emptyLabel="No Tasks Added"
      />
      {completed.length > 0 && (
        <ProgramTaskSection
          title="Completed"
          tasks={completed}
          onToggle={handleToggle}
          onTaskClick={onTaskClick}
          hideAssignedTo={hideAssignedTo}
          hideMember={hideMember}
          onAddTask={onAddTask}
        />
      )}
    </>
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
            <span className={`${styles.cardDue} ${isOverdue(task) ? styles.cardDueMissed : ''}`}>
              Due : {formatDateFriendly(task.due_date) === 'Today' || formatDateFriendly(task.due_date) === 'Tomorrow' || formatDateFriendly(task.due_date) === 'Yesterday' ? formatDateFriendly(task.due_date) : task.due_date}
            </span>
          </div>
          <button
            className={`${styles.taskCheckbox} ${isCompleted ? styles.taskCheckboxChecked : ''}`}
            onClick={(e) => e.stopPropagation()}
            aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
          >
            <span className={styles.taskCheckIcon}>
            <Icon name="solar:check-read-linear" size={13} color="var(--neutral-0)" />
          </span>
          </button>
        </div>

        {/* Row 2: Parent task (if subtask) */}
        {task.is_subtask && task.parent_task && (
          <span className={styles.cardParent}>
            <SubtaskIcon size={12} color="var(--primary-300)" />
            {task.parent_task}
          </span>
        )}

        {/* Row 3: Task title */}
        <span className={`${styles.cardTitle} ${isCompleted ? styles.taskNameDone : ''}`}>{task.name}</span>

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
                if (match) state.openQuickView(match);
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
          <span className={styles.cardFooterMeta}>
            {`By : ${task.created_by?.trim() || 'System Automation'}${task.meta ? ` • ${task.meta}` : ''}`}
          </span>
          <div className={styles.cardLinked}>
            {task.is_subtask && (
              <span className={styles.linkedItem}>
                <SubtaskIcon size={16} color="var(--primary-300)" />
                1
              </span>
            )}
            {task.attachments > 0 && (
              <span className={styles.linkedItem}>
                <Icon name="solar:paperclip-linear" size={16} color="var(--neutral-300)" />
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

      {/* Action menu */}
      <div className={styles.cardActionMenu} onClick={e => e.stopPropagation()}>
        <RowActionMenu task={task} />
      </div>
    </>
  );
}

/* ── Kanban View: Draggable Card ── */
function DraggableKanbanCard({ task, groupKey, onToggle, onTaskClick }) {
  const wasDragging = useRef(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(task.id),
    data: { type: 'task', task, groupKey },
  });

  useEffect(() => {
    if (isDragging) wasDragging.current = true;
  }, [isDragging]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleClick = useCallback(() => {
    if (wasDragging.current) {
      wasDragging.current = false;
      return;
    }
    onTaskClick?.(task);
  }, [task, onTaskClick]);

  return (
<div
      ref={setNodeRef}
      style={style}
      className={`${styles.kanbanCard} ${isDragging ? styles.kanbanCardDragging : ''}`}
      {...attributes}
      {...listeners}
      onClick={handleClick}
    >
      <KanbanCardContent task={task} />
    </div>
  );
}

/* ── Kanban View: Droppable Column ── */
function DroppableKanbanColumn({ groupKey, label, tasks, onToggle, onTaskClick }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${groupKey}`,
    data: { type: 'column', groupKey },
  });

  return (
    <div className={`${styles.kanbanColumn} ${isOver ? styles.kanbanColumnOver : ''}`}>
      <div className={styles.kanbanColumnHeader}>
        <div className={styles.kanbanColumnTitle}>
          <div className={styles.kanbanStatusDot} style={{ background: `var(--status-${groupKey}, var(--neutral-200))` }} />
          <span className={styles.kanbanStatusLabel}>{label}</span>
          <Badge variant="ai-neutral" label={tasks.length.toString()} />
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
        data-group={groupKey}
      >
        {tasks.map(t => (
          <DraggableKanbanCard key={t.id} task={t} groupKey={groupKey} onToggle={onToggle} onTaskClick={onTaskClick} />
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
function KanbanBoard({ kanbanGroups, onToggle, onTaskMove, onTaskClick }) {
  const [activeTask, setActiveTask] = useState(null);

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

  const resolveGroupKey = useCallback((over) => {
    if (!over) return null;
    const overData = over.data?.current;
    if (overData?.type === 'column') return overData.groupKey;
    if (overData?.type === 'task') return overData.groupKey;
    return null;
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !active) {
      toast.error('Drag failed: missing over or active');
      return;
    }

    const draggedTask = allTasks[active.id];
    if (!draggedTask) {
      toast.error(`Drag failed: no dragged task found for id ${active.id}`);
      return;
    }

    const targetGroupKey = resolveGroupKey(over);
    const sourceGroupKey = active.data?.current?.groupKey;
    
    if (targetGroupKey && targetGroupKey !== sourceGroupKey) {
      toast.info(`Moving from ${sourceGroupKey} to ${targetGroupKey}`);
      onTaskMove(draggedTask.id, targetGroupKey, sourceGroupKey);
    } else {
      toast.error(`Drag ignored: target=${targetGroupKey}, source=${sourceGroupKey}`);
    }
  }, [allTasks, resolveGroupKey, onTaskMove]);

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
      onDragEnd={handleDragEnd}
    >
      <div className={styles.kanbanWrap}>
        {kanbanGroups.map(g => (
          <DroppableKanbanColumn
            key={g.status}
            groupKey={g.status}
            label={g.label || (g.status.charAt(0).toUpperCase() + g.status.slice(1))}
            tasks={g.tasks}
            onToggle={onToggle}
            onTaskClick={onTaskClick}
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

/* ── Add Task Drawer ── */
export function AddTaskDrawer({ onClose, defaultStatus, initialMember, onTaskCreated }) {
  const initialStatus = defaultStatus || 'pending';
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState(initialStatus);
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [member, setMember] = useState(initialMember || '');
  const [pool, setPool] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  // Subtasks are staged locally (the parent task has no id yet) and created
  // once the task is saved.
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [subtaskName, setSubtaskName] = useState('');
  const [stagedSubtasks, setStagedSubtasks] = useState([]);
  const editorRef = useRef(null);

  const addStagedSubtask = () => {
    const trimmed = subtaskName.trim();
    if (!trimmed) return;
    setStagedSubtasks(prev => [...prev, trimmed.slice(0, TITLE_MAX)]);
    setSubtaskName('');
    setShowAddSubtask(false);
  };
  const removeStagedSubtask = (idx) => setStagedSubtasks(prev => prev.filter((_, i) => i !== idx));

  const createTask = useAppStore(s => s.createTask);
  const showToast = useAppStore(s => s.showToast);
  const taskProfiles = useAppStore(s => s.taskProfiles);
  const currentUserProfile = useAppStore(s => s.currentUserProfile);
  const allPatients = useAppStore(s => s.allPatients);
  const taskPools = useAppStore(s => s.taskPools);

  const assigneeOptions = useMemo(() => {
    const list = [];
    const seenNames = new Set();
    if (currentUserProfile && currentUserProfile.name) {
      list.push({ value: currentUserProfile.name, label: `${currentUserProfile.name} (You)` });
      seenNames.add(currentUserProfile.name);
    }
    (taskProfiles || []).forEach(p => {
      if (seenNames.has(p.name)) return;
      list.push({ value: p.name, label: p.name });
      seenNames.add(p.name);
    });
    if (list.length === 0) return ASSIGNEE_OPTIONS.map(n => ({ value: n, label: n }));
    return list;
  }, [taskProfiles, currentUserProfile]);

  const memberOptions = useMemo(() => {
    const names = (allPatients || []).flatMap(p => p.name ? [p.name] : []);
    return names.length > 0 ? names : MEMBER_OPTIONS;
  }, [allPatients]);

  const isDirty =
    name.trim() !== '' ||
    dueDate !== '' ||
    assignedTo !== '' ||
    member !== '' ||
    pool !== '' ||
    description.replace(/<[^>]*>/g, '').trim() !== '' ||
    selectedLabels.length > 0 ||
    priority !== 'medium' ||
    status !== initialStatus ||
    stagedSubtasks.length > 0;

  const canSave = name.trim() !== '' && isDirty && name.length <= TITLE_MAX;

  const handleSave = async () => {
    if (!canSave) return;
    const me = currentUserProfile?.name || 'Dr. JeDee Potter';
    const meId = currentUserProfile?.id || null;
    // Resolve the picked assignee's profile id by name (taskProfiles
    // is the same dropdown source). Falls back to the current user.
    const pickedAssignee = assignedTo
      ? (taskProfiles || []).find(p => p.name === assignedTo)
      : null;
    const finalAssigneeName = pool ? null : (assignedTo || me);
    const finalAssigneeId = pool
      ? null
      : (pickedAssignee?.id || (assignedTo === me ? meId : null) || meId);
    const task = {
      name: name.trim().slice(0, TITLE_MAX),
      status,
      priority,
      due_date: dueDate || todayMMDDYYYY(),
      assigned_to: finalAssigneeName,
      assigned_to_id: finalAssigneeId,
      member: member || (allPatients?.[0]?.name) || 'Celia Gerhold',
      labels: selectedLabels,
      meta: pool ? `Pool : ${pool}` : '',
      description: description || '',
      pool: pool || null,
      mentions: [],
      attachments: 0,
      comments: 0,
      is_subtask: false,
      parent_task: null,
      parent_task_id: null,
      created_by: me,
      created_by_id: meId,
    };
    const result = await createTask(task);
    if (result) {
      // Persist the staged subtasks now that we have the parent id.
      await Promise.all(stagedSubtasks.map(subName => createTask({
        name: subName.slice(0, TITLE_MAX),
        status: 'pending',
        priority: 'medium',
        due_date: task.due_date,
        assigned_to: finalAssigneeName,
        assigned_to_id: finalAssigneeId,
        member: task.member,
        labels: [],
        parent_task: task.name,
        parent_task_id: result.id,
        is_subtask: true,
        attachments: 0,
        comments: 0,
        meta: '',
        description: '',
        pool: null,
        mentions: [],
        created_by: me,
        created_by_id: meId,
      })));
      showToast('Task created');
      onTaskCreated?.(result);
    }
  };

  const handleClose = () => {
    if (isDirty) setShowCloseConfirm(true);
    else onClose();
  };

  const toggleLabel = (l) => {
    setSelectedLabels(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  };

  return (
    <>
      <Drawer
        title="Add Task"
        onClose={handleClose}
        headerRight={
          <Button variant="primary" size="L" disabled={!canSave} onClick={handleSave}>
            Save Task
          </Button>
        }
      >
        <div className={styles.drawerContent}>
          {/* Toolbar — Status + task actions (parity with Task Details). The
              id-dependent actions are disabled until the task is saved. */}
          <div className={styles.drawerToolbar}>
            <Select
              style={{ width: 120 }}
              options={STATUS_ORDER.map(s => ({ value: s, label: STATUS_LABELS[s] }))}
              value={status}
              onChange={setStatus}
            />
            <div className={styles.drawerToolbarRight}>
              <ActionButton icon="solar:paperclip-linear" size="L" tooltip="Attachments" />
              <span className={styles.iconDivider} />
              <ActionButton icon="solar:link-minimalistic-linear" size="L" tooltip="Copy link" state="disabled" />
              <span className={styles.iconDivider} />
              <ActionButton icon="solar:clipboard-text-linear" size="L" tooltip="Copy ID" state="disabled" />
              <span className={styles.iconDivider} />
              <ActionButton icon="solar:trash-bin-trash-linear" size="L" tooltip="Delete" state="disabled" />
            </div>
          </div>

          {/* Task Name */}
          <div className={styles.drawerSection}>
            <span className={styles.drawerSectionLabel}>Task Name</span>
            <input
              className={`${styles.drawerTaskTitleInput} ${name.length > TITLE_MAX ? styles.inputInvalid : ''}`}
              style={{ margin: 0, width: '100%' }}
              placeholder="Enter task name..."
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
            <div className={styles.fieldHelper}>
              <span className={styles.fieldError}>
                {name.length > TITLE_MAX ? `Title must be ${TITLE_MAX} characters or fewer` : ''}
              </span>
              <span className={`${styles.charCount} ${name.length > TITLE_MAX ? styles.charCountOver : ''}`}>
                {name.length}/{TITLE_MAX}
              </span>
            </div>
          </div>

          {/* Detail rows */}
          <div className={styles.drawerDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Task Pool</span>
              <DetailDropdown
                value={pool}
                options={['— Direct assign —', ...(taskPools || []).map(p => p.name)]}
                onSelect={v => setPool(v === '— Direct assign —' ? '' : v)}
              >
                <span style={{ color: pool ? 'var(--neutral-400)' : 'var(--neutral-200)' }}>
                  {pool || '— Direct assign —'}
                </span>
              </DetailDropdown>
            </div>
            {!pool && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Assigned To</span>
                <DetailDropdown
                  value={assignedTo}
                  options={assigneeOptions}
                  onSelect={setAssignedTo}
                  renderOption={opt => {
                    const label = typeof opt === 'string' ? opt : opt.label;
                    const val = typeof opt === 'string' ? opt : opt.value;
                    const initials = (val || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <>
                        <Avatar variant="assignee" initials={initials} className={styles.avatarXs} />
                        <span>{label}</span>
                      </>
                    );
                  }}
                >
                  {assignedTo ? (
                    <>
                      <Avatar variant="assignee" initials={(assignedTo || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()} className={styles.avatarXs} />
                      <span>{currentUserProfile?.name === assignedTo ? `${assignedTo} (You)` : assignedTo}</span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--neutral-200)' }}>Select assignee</span>
                  )}
                </DetailDropdown>
              </div>
            )}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Due Date</span>
              <TaskDatePicker value={dueDate} onSelect={setDueDate} />
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Priority</span>
              <DetailDropdown
                value={priority}
                options={PRIORITY_OPTIONS}
                onSelect={setPriority}
                renderOption={opt => (
                  <><PriorityIcon priority={opt} size={16} /> <span style={{ textTransform: 'capitalize' }}>{opt}</span></>
                )}
              >
                <PriorityIcon priority={priority} size={16} />
                <span style={{ textTransform: 'capitalize' }}>{priority}</span>
              </DetailDropdown>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Member</span>
              <DetailDropdown
                value={member}
                options={memberOptions}
                onSelect={setMember}
                renderOption={opt => {
                  const val = typeof opt === 'string' ? opt : opt.value;
                  const initials = (val || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <>
                      <Avatar variant="patient" initials={initials} className={styles.avatarXs} />
                      <span>{val}</span>
                    </>
                  );
                }}
              >
                {member ? (
                  <>
                    <Avatar variant="patient" initials={(member || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()} className={styles.avatarXs} />
                    <span>{member}</span>
                  </>
                ) : (
                  <span style={{ color: 'var(--neutral-200)' }}>Select member</span>
                )}
              </DetailDropdown>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Labels</span>
              <div className={styles.detailValueLabels}>
                {selectedLabels.map(l => (
                  <Badge key={l} variant="overflow" label={l} trailingIcon="solar:close-circle-linear" onClick={() => toggleLabel(l)} />
                ))}
                <CreatableLabelDropdown selectedLabels={selectedLabels} onToggle={toggleLabel} />
              </div>
            </div>
          </div>

          {/* Description with rich text editor */}
          <div className={styles.drawerSection}>
            <span className={styles.drawerSectionLabel}>Description</span>
            <div className={styles.descEditor}>
              <div
                ref={editorRef}
                className={styles.descEditable}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Add a description..."
                onInput={e => setDescription(e.currentTarget.innerHTML)}
              />
              <div className={styles.descToolbar}>
                <ActionButton icon="solar:paperclip-linear" size="S" tooltip="Attach" />
                <span className={styles.toolbarDivider} />
                <ActionButton icon="solar:text-bold-linear" size="S" tooltip="Bold" onClick={() => document.execCommand('bold')} />
                <ActionButton icon="solar:text-italic-linear" size="S" tooltip="Italic" onClick={() => document.execCommand('italic')} />
                <ActionButton icon="solar:text-underline-linear" size="S" tooltip="Underline" onClick={() => document.execCommand('underline')} />
                <ActionButton icon="solar:text-cross-linear" size="S" tooltip="Strikethrough" onClick={() => document.execCommand('strikeThrough')} />
                <span className={styles.toolbarDivider} />
                <ActionButton icon="solar:list-linear" size="S" tooltip="List" onClick={() => document.execCommand('insertUnorderedList')} />
              </div>
            </div>
          </div>

          {/* Subtasks — staged locally, created once the task is saved. */}
          <div className={styles.drawerSection}>
            <div className={styles.subtaskHeader}>
              <h4 className={styles.drawerSectionTitle}>
                Subtasks {stagedSubtasks.length > 0 && <span className={styles.subtaskCount}>{stagedSubtasks.length}</span>}
              </h4>
              <button className={styles.subtaskAddBtn} onClick={() => setShowAddSubtask(v => !v)}>
                <Icon name="solar:add-circle-linear" size={14} color="var(--primary-300)" />
                Add Subtask
              </button>
            </div>
            {showAddSubtask && (
              <div className={styles.subtaskAddRow}>
                <input
                  className={styles.subtaskAddInput}
                  placeholder="Enter subtask name..."
                  maxLength={TITLE_MAX}
                  value={subtaskName}
                  onChange={e => setSubtaskName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addStagedSubtask(); if (e.key === 'Escape') { setShowAddSubtask(false); setSubtaskName(''); } }}
                  autoFocus
                />
                <Button variant="primary" size="S" onClick={addStagedSubtask} disabled={!subtaskName.trim()}>Add</Button>
                <Button variant="secondary" size="S" onClick={() => { setShowAddSubtask(false); setSubtaskName(''); }}>Cancel</Button>
              </div>
            )}
            {stagedSubtasks.map((sub, i) => (
              <div key={i} className={styles.subtaskCard}>
                <div className={styles.subtaskCardBody}>
                  <div className={styles.subtaskCardRow}>
                    <PriorityIcon priority="medium" size={16} />
                    <span className={styles.subtaskCardName}>{sub}</span>
                  </div>
                </div>
                <ActionButton icon="solar:close-circle-linear" size="S" tooltip="Remove" onClick={() => removeStagedSubtask(i)} />
              </div>
            ))}
            {stagedSubtasks.length === 0 && !showAddSubtask && (
              <div className={styles.subtaskEmpty}>No subtasks yet. Break this task down into smaller steps.</div>
            )}
          </div>
        </div>
      </Drawer>
      {showCloseConfirm && (
        <ConfirmDialog
          icon="solar:danger-triangle-linear"
          iconColor="var(--status-warning)"
          title="Discard unsaved task?"
          description="You have unsaved changes. Closing now will discard them."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          variant="error"
          onConfirm={() => { setShowCloseConfirm(false); onClose(); }}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}
    </>
  );
}

/* ── Task Detail Drawer ── */
const ASSIGNEE_OPTIONS = ['Dr. JeDee Potter', 'Deborah Hintz', 'Dr. Robert Frost', 'Celia Gerhold'];
const TASK_POOL_OPTIONS = ['Patient Outreach', 'Care Management', 'Follow-up', 'Documentation', 'HEDIS Sign-Off'];
const MEMBER_OPTIONS = ['Celia Gerhold', 'Ralph Kessler', 'Robert Langdon', 'Cameron Haley'];
const PRIORITY_OPTIONS = ['high', 'medium', 'low'];
const LABEL_OPTIONS = ['Hypertension', 'Exercise', 'Document Collection', 'Medication', 'Diabetes', 'Follow-up'];

function CreatableLabelDropdown({ selectedLabels, onToggle, children }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const btnRef = useRef(null);
  const taskLabels = useAppStore(s => s.taskLabels);
  const createTaskLabel = useAppStore(s => s.createTaskLabel);
  const showToast = useAppStore(s => s.showToast);

  const filtered = taskLabels.filter(l => !search || l.toLowerCase().includes(search.toLowerCase()));
  const exact = taskLabels.find(l => l.toLowerCase() === search.trim().toLowerCase());
  const canCreate = search.trim() && !exact;
  const selectedLabelSet = useMemo(() => new Set(selectedLabels), [selectedLabels]);

  const handleCreate = async () => {
    const created = await createTaskLabel(search.trim());
    if (created) {
      showToast(`Label "${created}" created`);
      onToggle(created);
      setSearch('');
    }
  };

  return (
    <div ref={btnRef} style={{ position: 'relative' }}>
      <button className={styles.detailValue} onClick={e => { e.stopPropagation(); setOpen(v => !v); }}>
        {children || <Icon name="solar:add-circle-linear" size={14} color="var(--neutral-200)" />}
      </button>
      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => { setOpen(false); setSearch(''); }}>
          <div
            className={styles.simpleDropdown}
            style={{ position: 'fixed', top: btnRef.current?.getBoundingClientRect().bottom + 4, left: btnRef.current?.getBoundingClientRect().left, zIndex: 9999 }}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.dropdownSearch}>
              <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-200)" />
              <input
                className={styles.dropdownSearchInput}
                placeholder="Search or create..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && canCreate) handleCreate(); }}
                autoFocus
              />
            </div>
            {filtered.map(l => (
              <button key={l} className={styles.simpleDropItem} onClick={() => onToggle(l)}>
                <input type="checkbox" checked={selectedLabelSet.has(l)} readOnly style={{ accentColor: 'var(--primary-300)', width: 15, height: 15, flexShrink: 0 }} />
                {l}
              </button>
            ))}
            {canCreate && (
              <button className={styles.simpleDropItem} style={{ color: 'var(--primary-300)', fontWeight: 500 }} onClick={handleCreate}>
                <Icon name="solar:add-circle-linear" size={14} color="var(--primary-300)" />
                Create "{search.trim()}"
              </button>
            )}
            {filtered.length === 0 && !canCreate && (
              <div className={styles.simpleDropItem} style={{ color: 'var(--neutral-200)', cursor: 'default' }}>No results</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function DetailDropdown({ value, options, onSelect, icon, renderOption, children, searchable = true, multiSelect, selected }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const btnRef = useRef(null);
  const selectedSet = useMemo(() => new Set(selected || []), [selected]);

  const filtered = options.filter(opt => {
    if (!search) return true;
    const label = typeof opt === 'string' ? opt : opt.label;
    return label.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={{ position: 'relative' }}>
      <button ref={btnRef} className={styles.detailValue} onClick={e => { e.stopPropagation(); setOpen(v => !v); }}>
        {children || value || '—'}
      </button>
      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => { setOpen(false); setSearch(''); }}>
          <div
            className={styles.simpleDropdown}
            style={{ position: 'fixed', top: btnRef.current?.getBoundingClientRect().bottom + 4, left: btnRef.current?.getBoundingClientRect().left, zIndex: 9999 }}
            onClick={e => e.stopPropagation()}
          >
            {searchable && options.length > 3 && (
              <div className={styles.dropdownSearch}>
                <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-200)" />
                <input className={styles.dropdownSearchInput} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
              </div>
            )}
            {filtered.map(opt => {
              const label = typeof opt === 'string' ? opt : opt.label;
              const val = typeof opt === 'string' ? opt : opt.value;
              const isChecked = multiSelect && selectedSet.has(val);
              return (
                <button key={val} className={styles.simpleDropItem} onClick={() => {
                  onSelect(val);
                  if (!multiSelect) { setOpen(false); setSearch(''); }
                }}>
                  {multiSelect && <input type="checkbox" checked={isChecked} readOnly style={{ accentColor: 'var(--primary-300)', width: 15, height: 15, flexShrink: 0 }} />}
                  {renderOption ? renderOption(opt) : label}
                </button>
              );
            })}
            {filtered.length === 0 && <div className={styles.simpleDropItem} style={{ color: 'var(--neutral-200)', cursor: 'default' }}>No results</div>}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const ACTIVITY_LOGS = [
  { user: 'John Doe', initials: 'JD', action: 'added a', target: 'Comment', type: 'comment', body: 'All patients who have been either admitted or discharged within last 29 days.' },
  { user: 'John Doe', initials: 'JD', action: 'changed the', target: 'Status', type: 'status', from: 'Pending', to: 'Completed' },
  { user: 'John Doe', initials: 'JD', action: 'changed the', target: 'Priority', type: 'priority', from: 'High', to: 'Medium' },
  { user: 'John Doe', initials: 'JD', action: 'added the', target: 'Description', type: 'description', from: 'None', to: 'Please collect the medication documents and gather before the appointment' },
  { user: 'John Doe', initials: 'JD', action: 'created the task.', target: '', type: 'created' },
];

const TITLE_MAX = 200;

export function TaskDetailDrawer({ task, onClose, onSelectTask }) {
  const [activityTab, setActivityTab] = useState('All');
  const [activityToggle, setActivityToggle] = useState('Activity');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [subtaskName, setSubtaskName] = useState('');
  const [pdfPreview, setPdfPreview] = useState(null);
  const [editingNote, setEditingNote] = useState(false);
  const titleRef = useRef(null);
  const updateTask = useAppStore(s => s.updateTask);
  const deleteTask = useAppStore(s => s.deleteTask);
  const createTask = useAppStore(s => s.createTask);
  const claimTask = useAppStore(s => s.claimTask);
  const completeCareGapSignOffTask = useAppStore(s => s.completeCareGapSignOffTask);
  const hedisMembers = useAppStore(s => s.hedisMembers);
  const showToast = useAppStore(s => s.showToast);
  const hedisMember = task.hedisMemberId ? hedisMembers.find(m => m.id === task.hedisMemberId) : null;
  const allTasks = useAppStore(s => s.tasks);
  const taskAuditLogs = useAppStore(s => s.taskAuditLogs);
  const fetchTaskAuditLog = useAppStore(s => s.fetchTaskAuditLog);
  const logTaskAudit = useAppStore(s => s.logTaskAudit);
  const taskPools = useAppStore(s => s.taskPools);
  const taskProfiles = useAppStore(s => s.taskProfiles);
  const allPatients = useAppStore(s => s.allPatients);
  const currentUserProfile = useAppStore(s => s.currentUserProfile);

  useEffect(() => { if (task?.id) fetchTaskAuditLog(task.id); }, [task?.id]);

  const auditLog = task ? (taskAuditLogs[task.id] || []) : [];

  const activityLogItems = useMemo(() => {
    const items = [];
    for (const log of auditLog) {
      const visible = activityTab === 'All'
        || (activityTab === 'Comments' && log.action_type === 'comment_added')
        || (activityTab === 'History' && log.action_type !== 'comment_added');
      if (!visible) continue;
      const initials = (log.user_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2);
      items.push(
        <div key={log.id} className={styles.logEntry}>
          <Avatar variant="patient" initials={initials} className={styles.avatarXs} />
          <div className={styles.logBody}>
            <div className={styles.logAction}>
              <span className={styles.logUser}>{log.user_name}</span>
              <span>{AUDIT_LOG_VERB_MAP[log.action_type] || log.action_type}</span>
            </div>
            {log.action_type === 'comment_added' && log.to_value && (
              <div className={styles.logComment}>
                <p>{log.to_value}</p>
              </div>
            )}
            {log.action_type === 'status_changed' && log.from_value && log.to_value && (
              <div className={styles.logChange}>
                <Badge variant={STATUS_BADGE_VARIANTS[log.from_value] || 'overflow'} label={STATUS_LABELS[log.from_value] || log.from_value} />
                <Icon name="solar:arrow-right-linear" size={16} color="var(--neutral-200)" />
                <Badge variant={STATUS_BADGE_VARIANTS[log.to_value] || 'overflow'} label={STATUS_LABELS[log.to_value] || log.to_value} />
              </div>
            )}
            {log.action_type === 'priority_changed' && (
              <div className={styles.logChange}>
                <div className={styles.logChangeItem}>
                  <PriorityIcon priority={log.from_value} size={16} />
                  <span style={{ textTransform: 'capitalize' }}>{log.from_value}</span>
                </div>
                <Icon name="solar:arrow-right-linear" size={16} color="var(--neutral-200)" />
                <div className={styles.logChangeItem}>
                  <PriorityIcon priority={log.to_value} size={16} />
                  <span style={{ textTransform: 'capitalize' }}>{log.to_value}</span>
                </div>
              </div>
            )}
            {(log.action_type === 'due_date_changed' || log.action_type === 'assignee_changed' || log.action_type === 'renamed' || log.action_type === 'label_added' || log.action_type === 'label_removed' || log.action_type === 'subtask_added' || log.action_type === 'claimed') && (
              <div className={styles.logChange}>
                {log.from_value && <span className={styles.logChangeText}>{log.from_value}</span>}
                {log.from_value && log.to_value && <Icon name="solar:arrow-right-linear" size={16} color="var(--neutral-200)" />}
                {log.to_value && <span className={styles.logChangeText}>{log.to_value}</span>}
              </div>
            )}
          </div>
        </div>,
      );
    }
    return items;
  }, [auditLog, activityTab]);

  if (!task) return null;

  const labels = Array.isArray(task.labels) ? task.labels : [];
  const memberInitials = task.member ? task.member.split(' ').map(w => w[0]).join('').slice(0, 2) : '';
  const assigneeInitials = task.assigned_to ? task.assigned_to.split(' ').map(w => w[0]).join('').slice(0, 2) : '';
  const subtasks = allTasks.filter(t => t.parent_task_id === task.id || (t.is_subtask && t.parent_task === task.name));
  const completedSubs = subtasks.filter(t => t.status === 'completed').length;

  // Dynamic dropdown sources — same shape as the AddTaskDrawer.
  const assigneeNames = (() => {
    const seen = new Set();
    const list = [];
    if (currentUserProfile?.name) { list.push(currentUserProfile.name); seen.add(currentUserProfile.name); }
    (taskProfiles || []).forEach(p => { if (p.name && !seen.has(p.name)) { list.push(p.name); seen.add(p.name); } });
    return list.length > 0 ? list : ASSIGNEE_OPTIONS;
  })();
  const memberNames = (allPatients || []).flatMap(p => p.name ? [p.name] : []);
  const memberOptionsForDrawer = memberNames.length > 0 ? memberNames : MEMBER_OPTIONS;

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'completed' && subtasks.length > 0 && completedSubs < subtasks.length) {
      toast.error(`Cannot complete: ${subtasks.length - completedSubs} subtask(s) still open`);
      return;
    }
    updateTask(task.id, { status: newStatus });
    const msg = `Status changed to ${STATUS_LABELS[newStatus]}`;
    if (newStatus === 'completed') toast.success(msg);
    else if (newStatus === 'missed') toast.error(msg);
    else toast.info(msg);
  };

  const handleTitleSave = () => {
    const trimmed = titleDraft.trim().slice(0, TITLE_MAX);
    if (trimmed && trimmed !== task.name) {
      updateTask(task.id, { name: trimmed });
      showToast('Title updated');
    }
    setEditingTitle(false);
  };

  const handleAddSubtask = async () => {
    const trimmed = subtaskName.trim();
    if (!trimmed) return;
    const sub = {
      name: trimmed.slice(0, TITLE_MAX),
      status: 'pending',
      priority: task.priority || 'medium',
      due_date: task.due_date || todayMMDDYYYY(),
      assigned_to: task.assigned_to || currentUserProfile?.name || null,
      // Inherit assignee FK from parent when present, otherwise the
      // current user; either way keeps the new id-based filter honest.
      assigned_to_id: task.assigned_to_id || currentUserProfile?.id || null,
      member: task.member,
      labels: [],
      parent_task: task.name,
      parent_task_id: task.id,
      is_subtask: true,
      attachments: 0,
      comments: 0,
      meta: '',
      description: '',
      pool: null,
      mentions: [],
      created_by: currentUserProfile?.name || 'Current User',
      created_by_id: currentUserProfile?.id || null,
    };
    const created = await createTask(sub);
    if (created) {
      logTaskAudit(task.id, 'subtask_added', { to: trimmed });
      setSubtaskName('');
      setShowAddSubtask(false);
      showToast('Subtask added');
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    await deleteTask(task.id);
    showToast('Task deleted');
    onClose();
  };

  const handleClaim = async () => {
    await claimTask(task.id);
    showToast('Task claimed');
  };

  const handleAddComment = (text) => {
    if (!text) return;
    const mentions = (text.match(/@(\w+(?:\s+\w+)?)/g) || []).map(m => m.slice(1).trim());
    logTaskAudit(task.id, 'comment_added', { to: text });
    if (mentions.length > 0) {
      const existingMentions = Array.isArray(task.mentions) ? task.mentions : [];
      const newMentions = [...new Set([...existingMentions, ...mentions])];
      updateTask(task.id, { mentions: newMentions });
    }
    showToast('Comment added');
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleTitleSave(); }
    if (e.key === 'Escape') setEditingTitle(false);
  };

  return (
    <Drawer title="Task Details" onClose={onClose}>
      <div className={styles.drawerContent}>
        {/* Toolbar */}
        <div className={styles.drawerToolbar}>
          <Select
            style={{ width: 120 }}
            options={STATUS_ORDER.map(s => ({ value: s, label: STATUS_LABELS[s] }))}
            value={task.status}
            onChange={handleStatusChange}
          />
          <div className={styles.drawerToolbarRight}>
            {task.pool && !task.assigned_to && (
              <Button variant="primary" size="S" onClick={handleClaim}>Claim Task</Button>
            )}
            <ActionButton icon="solar:paperclip-linear" size="L" tooltip="Attachments" />
            <span className={styles.iconDivider} />
            <ActionButton icon="solar:link-minimalistic-linear" size="L" tooltip="Copy link" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/#/tasks?taskId=${task.id}`); showToast('Link copied'); }} />
            <span className={styles.iconDivider} />
            <ActionButton icon="solar:clipboard-text-linear" size="L" tooltip="Copy ID" onClick={() => { navigator.clipboard?.writeText(String(task.id)); showToast('ID copied'); }} />
            <span className={styles.iconDivider} />
            <ActionButton icon="solar:trash-bin-trash-linear" size="L" tooltip="Delete" onClick={() => setShowDeleteConfirm(true)} />
          </div>
        </div>

        {/* Label + Title */}
        <div className={styles.drawerTitleBlock}>
          {task.is_subtask && task.parent_task && (
            <Badge variant="overflow" label={task.parent_task} />
          )}
          {labels.length > 0 && !task.is_subtask && (
            <Badge variant="overflow" label={labels[0]} />
          )}
          {editingTitle ? (
            <input
              ref={titleRef}
              className={styles.drawerTaskTitleInput}
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              autoFocus
            />
          ) : (
            <h3
              className={styles.drawerTaskTitle}
              onClick={() => { setTitleDraft(task.name); setEditingTitle(true); }}
            >
              {task.name}
            </h3>
          )}
        </div>

        {/* Detail rows */}
        <div className={styles.drawerDetails}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Assigned To</span>
            <DetailDropdown
              value={task.assigned_to}
              options={assigneeNames}
              onSelect={v => {
                const picked = (taskProfiles || []).find(p => p.name === v);
                updateTask(task.id, { assigned_to: v, assigned_to_id: picked?.id || null });
                showToast(`Assigned to ${v}`);
              }}
              renderOption={opt => (
                <><Avatar variant="assignee" initials={getInitials(opt)} className={styles.avatarXs} /> {opt}</>
              )}
            >
              <Avatar variant="assignee" initials={assigneeInitials} className={styles.avatarXs} />
              <span>{task.assigned_to || '—'}</span>
            </DetailDropdown>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Task Pool</span>
            <DetailDropdown
              value={task.pool || '— None —'}
              options={['— None —', ...taskPools.map(p => p.name)]}
              onSelect={v => {
                const next = v === '— None —' ? null : v;
                updateTask(task.id, { pool: next });
                showToast(next ? `Pool set to ${next}` : 'Removed from pool');
              }}
            />
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Due Date</span>
            <TaskDatePicker value={task.due_date} overdue={isOverdue(task)} onSelect={v => { updateTask(task.id, { due_date: v }); showToast('Due date updated'); }} />
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Priority</span>
            <DetailDropdown
              value={task.priority}
              options={PRIORITY_OPTIONS}
              onSelect={v => { updateTask(task.id, { priority: v }); showToast(`Priority set to ${v}`); }}
              renderOption={opt => (
                <><PriorityIcon priority={opt} size={16} /> <span style={{ textTransform: 'capitalize' }}>{opt}</span></>
              )}
            >
              <PriorityIcon priority={task.priority} size={16} />
              <span style={{ textTransform: 'capitalize' }}>{task.priority}</span>
            </DetailDropdown>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Member</span>
            <DetailDropdown
              value={task.member}
              options={memberOptionsForDrawer}
              onSelect={v => { updateTask(task.id, { member: v }); showToast(`Member set to ${v}`); }}
              renderOption={opt => (
                <><Avatar variant="patient" initials={getInitials(opt)} className={styles.avatarXs} /> {opt}</>
              )}
            >
              <Avatar variant="patient" initials={memberInitials} className={styles.avatarXs} />
              <span>{task.member}</span>
            </DetailDropdown>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Labels</span>
            <div className={styles.detailValueLabels}>
              {labels.map(l => (
                <Badge
                  key={l}
                  variant="overflow"
                  label={l}
                  trailingIcon="solar:close-circle-linear"
                  onClick={() => {
                    updateTask(task.id, { labels: labels.filter(x => x !== l) });
                    showToast(`Label "${l}" removed`);
                  }}
                />
              ))}
              <DetailDropdown
                value=""
                options={LABEL_OPTIONS.filter(l => !labels.includes(l))}
                onSelect={v => {
                  updateTask(task.id, { labels: [...labels, v] });
                  showToast(`Label "${v}" added`);
                }}
              >
                <Icon name="solar:add-circle-linear" size={14} color="var(--neutral-200)" />
              </DetailDropdown>
            </div>
          </div>
        </div>

        {/* HEDIS Sign-Off: consolidated PDF + completion CTA. Only renders
            for tasks created by createCareGapSignOffTask (i.e. hedisMemberId set). */}
        {task.hedisMemberId && task.consolidatedPdf?.blob && (
          <div className={styles.drawerSection}>
            <span className={styles.drawerSectionLabel}>Consolidated Clinical Note</span>
            <button
              type="button"
              className={styles.hedisPdfCard}
              onClick={() => setPdfPreview(task.consolidatedPdf)}
            >
              <span className={styles.hedisPdfIcon}>
                <Icon name="solar:document-text-linear" size={20} color="var(--primary-300)" />
              </span>
              <span className={styles.hedisPdfInfo}>
                <span className={styles.hedisPdfName}>
                  {task.consolidatedPdf.filename || 'consolidated-clinical-note.pdf'}
                </span>
                <span className={styles.hedisPdfMeta}>
                  Covers {(task.hedisGapCodes || []).length} care gap{(task.hedisGapCodes || []).length === 1 ? '' : 's'} · click to preview
                </span>
              </span>
              <span className={styles.hedisPdfOpenBadge}>
                <Icon name="solar:eye-linear" size={14} color="var(--neutral-300)" />
                Preview
              </span>
            </button>

            {task.status !== 'completed' && (
              <div className={styles.hedisSignOffRow}>
                {hedisMember && (
                  <Button
                    variant="secondary"
                    size="L"
                    leadingIcon="solar:pen-new-square-linear"
                    onClick={() => setEditingNote(true)}
                  >
                    Edit clinical note
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="L"
                  leadingIcon="solar:check-circle-linear"
                  onClick={() => {
                    completeCareGapSignOffTask(task.id, 'NP');
                    showToast('Sign-off complete — all gaps marked Completed');
                    onClose?.();
                  }}
                >
                  Complete sign-off
                </Button>
                <span className={styles.hedisSignOffHint}>
                  Marks all gaps ({(task.hedisGapCodes || []).join(', ')}) as Completed.
                </span>
              </div>
            )}
            {task.status === 'completed' && (
              <div className={styles.hedisSignOffComplete}>
                <Icon name="solar:check-circle-bold" size={16} color="var(--status-success)" />
                Sign-off complete — gaps closed.
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <div className={styles.drawerSection}>
          <span className={styles.drawerSectionLabel}>Description</span>
          {editingDesc ? (
            <div className={styles.descEditor}>
              <div
                className={styles.descEditable}
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: descDraft }}
                onInput={e => setDescDraft(e.currentTarget.innerHTML)}
              />
              <div className={styles.descToolbar}>
                <ActionButton icon="solar:paperclip-linear" size="S" tooltip="Attach" />
                <span className={styles.toolbarDivider} />
                <ActionButton icon="solar:text-bold-linear" size="S" tooltip="Bold" onClick={() => document.execCommand('bold')} />
                <ActionButton icon="solar:text-italic-linear" size="S" tooltip="Italic" onClick={() => document.execCommand('italic')} />
                <ActionButton icon="solar:text-underline-linear" size="S" tooltip="Underline" onClick={() => document.execCommand('underline')} />
                <ActionButton icon="solar:text-cross-linear" size="S" tooltip="Strikethrough" onClick={() => document.execCommand('strikeThrough')} />
                <span className={styles.toolbarDivider} />
                <ActionButton icon="solar:list-linear" size="S" tooltip="List" onClick={() => document.execCommand('insertUnorderedList')} />
                <div style={{ flex: 1 }} />
                <ActionButton icon="solar:close-circle-linear" size="S" tooltip="Discard" onClick={() => setEditingDesc(false)} />
                <ActionButton icon="solar:check-read-linear" size="S" tooltip="Save" onClick={() => { updateTask(task.id, { description: descDraft }); setEditingDesc(false); showToast('Description saved'); }} />
              </div>
            </div>
          ) : (
            <div
              className={styles.descriptionBox}
              onClick={() => { setDescDraft(task.description || ''); setEditingDesc(true); }}
              dangerouslySetInnerHTML={{ __html: task.description || '<span style="color: var(--neutral-200);">Click to add description...</span>' }}
            />
          )}
        </div>

        {/* Subtasks — show progress + list of children, allow adding new ones */}
        {!task.is_subtask && (
          <div className={styles.drawerSection}>
            <div className={styles.subtaskHeader}>
              <h4 className={styles.drawerSectionTitle}>
                Subtasks {subtasks.length > 0 && <span className={styles.subtaskCount}>{completedSubs}/{subtasks.length}</span>}
              </h4>
              <button className={styles.subtaskAddBtn} onClick={() => setShowAddSubtask(v => !v)}>
                <Icon name="solar:add-circle-linear" size={14} color="var(--primary-300)" />
                Add Subtask
              </button>
            </div>
            {subtasks.length > 0 && (
              <div className={styles.subtaskProgressBar}>
                <div className={styles.subtaskProgressFill} style={{ width: `${(completedSubs / subtasks.length) * 100}%` }} />
              </div>
            )}
            {showAddSubtask && (
              <div className={styles.subtaskAddRow}>
                <input
                  className={styles.subtaskAddInput}
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
                  className={`${styles.taskCheckbox} ${sub.status === 'completed' ? styles.taskCheckboxChecked : ''}`}
                  aria-label={sub.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                  onClick={e => {
                    e.stopPropagation();
                    updateTask(sub.id, { status: sub.status === 'completed' ? 'pending' : 'completed' });
                  }}
                >
                  {sub.status === 'completed' && <Icon name="solar:check-read-linear" size={13} color="var(--neutral-0)" />}
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
            <button
              className={styles.subtaskParentLink}
              onClick={() => {
                const parent = allTasks.find(t => t.id === task.parent_task_id);
                if (parent) onSelectTask?.(parent);
              }}
            >
              <Icon name="solar:link-minimalistic-linear" size={14} color="var(--primary-300)" />
              {task.parent_task}
            </button>
          </div>
        )}

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
          <div className={styles.activityTabs}>
            {['All', 'Comments', 'History'].map(tab => (
              <button
                key={tab}
                className={`${styles.activityTabBtn} ${activityTab === tab ? styles.activityTabActive : ''}`}
                onClick={() => setActivityTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Comment input — supports @mentions */}
          <CommentComposer onSubmit={handleAddComment} />

          {/* Activity log — real audit entries */}
          <div className={styles.activityLog}>
            {activityLogItems}
            {auditLog.length === 0 && (
              <div className={styles.subtaskEmpty}>No activity yet.</div>
            )}
          </div>
        </div>
      </div>
      {showDeleteConfirm && (
        <ConfirmDialog
          icon="solar:danger-triangle-linear"
          iconColor="var(--status-error)"
          title="Delete this task?"
          description={subtasks.length > 0 ? `This task has ${subtasks.length} subtask(s). Deleting it will also delete all subtasks. This cannot be undone.` : 'This action cannot be undone.'}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="error"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      {pdfPreview && (
        <PdfPreviewOverlay
          blob={pdfPreview.blob}
          filename={pdfPreview.filename}
          onClose={() => setPdfPreview(null)}
        />
      )}
      {editingNote && hedisMember && (
        <ClinicalNotePanel
          member={hedisMember}
          gapCode={task.hedisGapCodes?.[0]}
          year={2026}
          editingTaskId={task.id}
          onClose={() => setEditingNote(false)}
        />
      )}
    </Drawer>
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
  const createTask = useAppStore(s => s.createTask);
  const pendingAddTask = useAppStore(s => s.pendingAddTask);
  const clearPendingAddTask = useAppStore(s => s.clearPendingAddTask);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [addDrawerStatus, setAddDrawerStatus] = useState('pending');
  const [addDrawerInitialMember, setAddDrawerInitialMember] = useState(null);

  const fetchTaskProfiles = useAppStore(s => s.fetchTaskProfiles);
  const fetchTaskLabels = useAppStore(s => s.fetchTaskLabels);
  const fetchTaskPools = useAppStore(s => s.fetchTaskPools);
  const fetchAllPatients = useAppStore(s => s.fetchAllPatients);
  const allPatients = useAppStore(s => s.allPatients);
  const taskProfiles = useAppStore(s => s.taskProfiles);
  const currentUserProfile = useAppStore(s => s.currentUserProfile);

  useEffect(() => {
    fetchTasks();
    fetchTaskProfiles();
    fetchTaskLabels();
    fetchTaskPools();
    if (!allPatients || allPatients.length === 0) fetchAllPatients();
  }, []);

  useEffect(() => {
    if (!pendingAddTask) return;
    setAddDrawerStatus('pending');
    setAddDrawerInitialMember(pendingAddTask.member || null);
    setShowAddDrawer(true);
    clearPendingAddTask();
  }, [pendingAddTask]);

  // The user-scoped tabs (Assigned / Created / Mentions) require a real
  // signed-in profile to compare against; if there's no auth session
  // those filters short-circuit to an empty set rather than pretending
  // to be the seed user.
  const meId = currentUserProfile?.id || null;
  const meName = currentUserProfile?.name || null;

  // Match by FK first; fall back to name string for legacy rows where the
  // tasks_assignee_id_migration backfill couldn't find a matching profile
  // (e.g. seed rows assigned to "Dr. JeDee Potter"). When a row has BOTH
  // an id and a different-named text value, the id wins.
  const matchAssignee = (t) => {
    if (!meId && !meName) return false;
    if (t.assigned_to_id) return t.assigned_to_id === meId;
    return !!meName && t.assigned_to === meName;
  };
  const matchCreator = (t) => {
    if (!meId && !meName) return false;
    if (t.created_by_id) return t.created_by_id === meId;
    return !!meName && t.created_by === meName;
  };

  // Show all tasks in the list (parents + subtasks). Subtasks render with a
  // "Parent Task : ..." prefix and the subtask icon so they're visually nested.
  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (tasksTab === 'all') {
      // No user filter — show every task in the org/DB.
    } else if (tasksTab === 'assigned') {
      result = result.filter(matchAssignee);
    } else if (tasksTab === 'pool') {
      result = result.filter(t => t.pool && !t.assigned_to && !t.assigned_to_id);
    } else if (tasksTab === 'created') {
      result = result.filter(matchCreator);
    } else if (tasksTab === 'mentions') {
      result = meName ? result.filter(t => Array.isArray(t.mentions) && t.mentions.includes(meName)) : [];
    }

    Object.entries(tasksFilters).forEach(([key, value]) => {
      if (!value) return;
      if (key === 'task_status') result = result.filter(t => t.status === value);
      else if (key === 'priority') result = result.filter(t => t.priority === value);
      else if (key === 'assigned_to') {
        // value is a profile.id from the dynamic filter chip; legacy
        // rows without an FK fall back to a name match against the
        // picked profile's display name.
        const pickedName = (taskProfiles || []).find(p => p.id === value)?.name;
        result = result.filter(t =>
          t.assigned_to_id === value || (pickedName && t.assigned_to === pickedName)
        );
      }
      else if (key === 'created_by') {
        const pickedName = (taskProfiles || []).find(p => p.id === value)?.name;
        result = result.filter(t =>
          t.created_by_id === value || (pickedName && t.created_by === pickedName)
        );
      }
      else if (key === 'member') result = result.filter(t => t.member === value);
      else if (key === 'labels') result = result.filter(t => Array.isArray(t.labels) && t.labels.includes(value));
    });

    return result;
  }, [tasks, tasksTab, tasksFilters, meName, taskProfiles]);

  const tabCounts = useMemo(() => ({
    all: tasks.length,
    assigned: tasks.filter(matchAssignee).length,
    pool: tasks.filter(t => t.pool && !t.assigned_to && !t.assigned_to_id).length,
    created: tasks.filter(matchCreator).length,
    mentions: meName ? tasks.filter(t => Array.isArray(t.mentions) && t.mentions.includes(meName)).length : 0,
  }), [tasks, meName]);

  const handleToggle = useCallback((task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateTask(task.id, { status: newStatus });
  }, [updateTask]);

  const handleStatusChange = useCallback((taskId, newStatus) => {
    const taskToUpdate = tasks.find(t => t.id === taskId);
    let patch = { status: newStatus };
    let msg = `Task moved to ${STATUS_LABELS[newStatus]}`;
    let variant = 'info';
    
    if (taskToUpdate?.status === 'missed' && newStatus === 'pending') {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      patch.due_date = `${mm}-${dd}-${d.getFullYear()}`;
      msg = 'Task moved to Pending. Due date extended by 7 days.';
      variant = 'warning';
    } else if (newStatus === 'completed') {
      variant = 'success';
    } else if (newStatus === 'missed') {
      variant = 'error';
    }
    
    updateTask(taskId, patch);
    toast[variant](msg);
  }, [updateTask, tasks]);

  const sortedTasks = useMemo(() => {
    const sortBy = tasksFilters.sort_by;
    if (!sortBy) return filteredTasks;
    const sorted = [...filteredTasks];
    if (sortBy === 'due_date') {
      sorted.sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        const pa = a.due_date.split('-'); const pb = b.due_date.split('-');
        const da = new Date(+pa[2], +pa[0] - 1, +pa[1]);
        const db = new Date(+pb[2], +pb[0] - 1, +pb[1]);
        return da - db;
      });
    } else if (sortBy === 'priority') {
      const order = { high: 0, medium: 1, low: 2, none: 3 };
      sorted.sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3));
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return sorted;
  }, [filteredTasks, tasksFilters.sort_by]);

  // Build the filter chip definitions with dynamic options for the
  // user/patient-driven filters. Other chips (View By / Sort By /
  // Status / Priority / Labels) keep their static option lists from
  // TASK_FILTER_DEFS. assigned_to and created_by use profile.id as
  // the value so the filter compares against the FK; member uses
  // patient name (no FK in tasks → patients yet).
  const filterDefs = useMemo(() => {
    const profileOpts = (taskProfiles || []).map(p => ({ value: p.id, label: p.name }));
    const memberOpts = (allPatients || []).map(p => ({ value: p.name, label: p.name }));
    return TASK_FILTER_DEFS
      .map(fd => {
        // People-shaped filters get the dynamic option list + in-popover
        // search (long lists) — value is profile.id so the filter compares
        // against the FK.
        if (fd.key === 'assigned_to') return profileOpts.length ? { ...fd, options: profileOpts, searchable: true } : fd;
        if (fd.key === 'created_by')  return profileOpts.length ? { ...fd, options: profileOpts, searchable: true } : fd;
        return fd;
      })
      // Insert a Member filter after Created By so it sits next to the
      // other identity-related chips. Skip when no patients are loaded
      // so the chip doesn't render with an empty dropdown.
      .flatMap(fd => {
        if (fd.key === 'created_by' && memberOpts.length) {
          return [fd, { key: 'member', label: 'Member', options: memberOpts, primary: true, searchable: true }];
        }
        return [fd];
      });
  }, [taskProfiles, allPatients]);

  const grouped = useMemo(() => {
    const viewBy = tasksFilters.view_by || 'status';
    if (viewBy === 'priority') {
      return PRIORITY_ORDER.reduce((acc, p) => {
        const items = sortedTasks.filter(t => (t.priority || 'none') === p);
        if (items.length) acc.push({ status: p, label: PRIORITY_LABELS[p], tasks: items });
        return acc;
      }, []);
    }
    if (viewBy === 'due_date') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const buckets = { overdue: [], today: [], upcoming: [], no_date: [] };
      sortedTasks.forEach(t => {
        if (!t.due_date) { buckets.no_date.push(t); return; }
        const p = t.due_date.split('-');
        const d = new Date(+p[2], +p[0] - 1, +p[1]); d.setHours(0, 0, 0, 0);
        if (d < today) buckets.overdue.push(t);
        else if (d.getTime() === today.getTime()) buckets.today.push(t);
        else buckets.upcoming.push(t);
      });
      const result = [];
      if (buckets.overdue.length) result.push({ status: 'overdue', label: 'Overdue', tasks: buckets.overdue });
      if (buckets.today.length) result.push({ status: 'today', label: 'Today', tasks: buckets.today });
      if (buckets.upcoming.length) result.push({ status: 'upcoming', label: 'Upcoming', tasks: buckets.upcoming });
      return result;
    }
    return STATUS_ORDER.reduce((acc, status) => {
      const items = sortedTasks.filter(t => t.status === status);
      if (items.length) acc.push({ status, tasks: items });
      return acc;
    }, []);
  }, [sortedTasks, tasksFilters.view_by]);

  const kanbanGroups = useMemo(() => {
    const viewBy = tasksFilters.view_by || 'status';
    if (viewBy === 'priority') {
      return PRIORITY_ORDER.map(p => ({
        status: p,
        label: PRIORITY_LABELS[p],
        tasks: sortedTasks.filter(t => (t.priority || 'none') === p),
      }));
    }
    if (viewBy === 'due_date') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const buckets = { overdue: [], today: [], upcoming: [], no_date: [] };
      sortedTasks.forEach(t => {
        if (!t.due_date) { buckets.no_date.push(t); return; }
        const p = t.due_date.split('-');
        const d = new Date(+p[2], +p[0] - 1, +p[1]); d.setHours(0, 0, 0, 0);
        if (d < today) buckets.overdue.push(t);
        else if (d.getTime() === today.getTime()) buckets.today.push(t);
        else buckets.upcoming.push(t);
      });
      return [
        { status: 'overdue', label: 'Overdue', tasks: buckets.overdue },
        { status: 'today', label: 'Today', tasks: buckets.today },
        { status: 'upcoming', label: 'Upcoming', tasks: buckets.upcoming }
      ];
    }
    return STATUS_ORDER.map(status => ({
      status,
      label: STATUS_LABELS[status] || (status.charAt(0).toUpperCase() + status.slice(1)),
      tasks: sortedTasks.filter(t => t.status === status),
    }));
  }, [sortedTasks, tasksFilters.view_by]);

  const hideAssignedTo = !!tasksFilters.assigned_to;

  const handleTaskMove = async (taskId, targetGroupKey, sourceGroupKey) => {
    const viewBy = tasksFilters.view_by || 'status';
    const task = tasks.find(t => String(t.id) === String(taskId));
    if (!task) return;

    try {
      if (viewBy === 'status') {
        setTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, status: targetGroupKey } : t));
        await updateTask(taskId, { status: targetGroupKey });
      } else if (viewBy === 'priority') {
        const priorityVal = targetGroupKey === 'none' ? null : targetGroupKey;
        setTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, priority: priorityVal } : t));
        await updateTask(taskId, { priority: priorityVal });
      } else if (viewBy === 'due_date') {
        let newDate = null;
        if (targetGroupKey === 'today') {
          const d = new Date();
          newDate = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`;
        } else if (targetGroupKey === 'upcoming') {
          const d = new Date(); d.setDate(d.getDate() + 7);
          newDate = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`;
        } else if (targetGroupKey === 'overdue') {
          const d = new Date(); d.setDate(d.getDate() - 1);
          newDate = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`;
        }
        setTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, due_date: newDate } : t));
        await updateTask(taskId, { due_date: newDate });
      }
      toast.success(`Task moved to ${targetGroupKey}`);
    } catch (err) {
      console.error('handleTaskMove error:', err);
      toast.error(`Move Error: ${err.message || 'Unknown error'}`);
    }
  };

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
          onTaskClick={setSelectedTask}
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
          <StatusGroup key={g.status} status={g.status} label={g.label} tasks={g.tasks} onToggle={handleToggle} onTaskClick={setSelectedTask} hideAssignedTo={hideAssignedTo} onAddTask={(s) => { setAddDrawerStatus(s); setShowAddDrawer(true); }} />
        ))}
      </div>
    );
  };

  return (
    <div className={styles.wrapper}>
      <TopBar />

      <SectionTitleBar
        tabs={TABS.map(t => ({ ...t, count: tabCounts[t.key] }))}
        activeTab={tasksTab}
        onTabChange={setTasksTab}
        rightExtras={
          <>
            <Toggle
              items={VIEW_TOGGLE_ITEMS}
              active={tasksViewMode}
              onChange={setTasksViewMode}
              size="S"
            />
            <span style={{ width: 1, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} aria-hidden="true" />
          </>
        }
        showFilter
        filterActive={showTasksFilterBar}
        onFilter={toggleTasksFilterBar}
        primaryActionLabel="Add Task"
        onPrimaryAction={() => { setAddDrawerStatus('pending'); setShowAddDrawer(true); }}
      />

      {showTasksFilterBar && (
        <FilterBar
          leading={null}
          filterDefs={filterDefs}
          filters={tasksFilters}
          onFilterChange={setTasksFilter}
          onClearAll={clearTasksFilters}
          getOptions={(def) => def.options || []}
          showMoreFilters={false}
          showSaveFilter={false}
        />
      )}

      {renderContent()}

      {selectedTask && (
        <TaskDetailDrawer
          task={tasks.find(t => t.id === selectedTask.id) || selectedTask}
          onClose={() => setSelectedTask(null)}
          onSelectTask={t => setSelectedTask(t)}
        />
      )}
      {showAddDrawer && (
        <AddTaskDrawer
          onClose={() => { setShowAddDrawer(false); setAddDrawerInitialMember(null); }}
          defaultStatus={addDrawerStatus}
          initialMember={addDrawerInitialMember}
          onTaskCreated={(task) => {
            setShowAddDrawer(false);
            setAddDrawerInitialMember(null);
            setSelectedTask(task);
          }}
        />
      )}
    </div>
  );
}
