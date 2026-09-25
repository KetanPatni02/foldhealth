import { useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { DownChevronIcon } from '../../components/Icon/DownChevronIcon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { SearchBar } from '../../components/SearchBar/SearchBar';
import { MenuPopover } from '../../components/MenuPopover/MenuPopover';
import { FilterChip } from '../../components/FilterChip/FilterChip';
import { AssigneeChange } from '../../components/AssigneeChange/AssigneeChange';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { initialsOf } from './CareGapDetailDrawer.utils';
import styles from './CareGapAppointmentsTab.module.css';

const VIEW_OPTIONS = ['Upcoming', 'Past', 'All'];
const EMPTY_FILTERS = { type: [], assignee: [] };

// Appointments store dates as YYYY-MM-DD or MM/DD/YYYY depending on the
// writer; normalize to a local Date so Upcoming / Past can compare.
function parseDate(value) {
  const s = String(value || '').trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  // Anything else the browser understands ("Sep 24, 2026", ISO timestamps).
  const d = s ? new Date(s) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}
// "8:30 am" / "10:30 AM" / "14:05" → [hours, minutes] (24h), or null.
function parseClock(value) {
  const m = /^(\d{1,2}):(\d{2})\s*([ap]m)?/i.exec(String(value || '').trim());
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h !== 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return [h, min];
}
const icsStamp = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
const icsText = (v) => String(v || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => `\\${m}`);

// Download: the appointment as a calendar file (.ics) the user can open in
// Outlook / Google / Apple Calendar. Floating local time; 30 min when no end.
function downloadIcs(row) {
  const a = row.raw;
  const start = row.date ? new Date(row.date) : new Date();
  const [sh, sm] = parseClock(a.time_start) || [9, 0];
  start.setHours(sh, sm, 0, 0);
  const end = new Date(start);
  const endClock = parseClock(a.time_end);
  if (endClock) end.setHours(endClock[0], endClock[1], 0, 0);
  else end.setMinutes(end.getMinutes() + 30);
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fold Health//Care Gap//EN',
    'BEGIN:VEVENT',
    `UID:${a.id}@fold.health`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsText(row.title)}`,
    row.subtitle ? `DESCRIPTION:${icsText(row.subtitle)}` : null,
    a.location ? `LOCATION:${icsText(a.location)}` : null,
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${row.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'appointment'}.ics`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const ROW_ACTIONS = [
  { key: 'edit', icon: 'solar:pen-linear', label: 'Edit' },
  { key: 'download', icon: 'solar:download-minimalistic-linear', label: 'Download' },
  { key: 'delete', icon: 'solar:trash-bin-2-linear', label: 'Delete', danger: true },
];

const apptDateValue = (a) => a.date || a.appointment_date || a.start_date || a.start_time || a.starts_at || '';
// Time: the stored start time, or the clock part of a full timestamp.
const apptTime = (a) => {
  if (a.time_start) return a.time_start;
  const d = parseDate(a.start_time || a.starts_at);
  return d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
};
const fmtDate = (d) => (d
  ? `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`
  : '');

/**
 * Care Gap drawer — Appt/Reminders tab (Figma 225:93430). A table of the
 * member's appointments with a View By (Upcoming / Past / All) switch,
 * search, and Type / Assignee filter chips. Rows carry the appointment
 * type, reason, date and time, and an assignee picker.
 */
export function CareGapAppointmentsTab({ appointments = [], platformUsers = [], onAssigneeChange, onEdit, onDelete, onOpen }) {
  const [view, setView] = useState('Upcoming');
  const [viewMenu, setViewMenu] = useState(null);
  const viewBtnRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [chipsOpen, setChipsOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selected, setSelected] = useState(() => new Set());
  const [rowMenu, setRowMenu] = useState(null); // { row, rect } | null
  const anyFilter = filters.type.length > 0 || filters.assignee.length > 0;

  const rows = useMemo(() => appointments.map(a => ({
    id: a.id,
    title: a.appointment_type_name || 'Appointment',
    subtitle: a.reason_for_visit || a.mode || '',
    // Reminders share this table once they are stored; today every row is
    // an appointment.
    type: a.kind === 'reminder' ? 'Reminder' : 'Appointment',
    recurring: !!a.recurring,
    date: parseDate(apptDateValue(a)),
    time: apptTime(a),
    assignee: a.primary_user || '',
    raw: a,
  })), [appointments]);

  const assigneeOptions = useMemo(
    () => [...new Set(rows.map(r => r.assignee).filter(Boolean))].sort((x, y) => x.localeCompare(y)),
    [rows],
  );

  const visible = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const q = search.trim().toLowerCase();
    return rows
      .filter(r => {
        if (view === 'Upcoming' && r.date && r.date < today) return false;
        if (view === 'Past' && (!r.date || r.date >= today)) return false;
        if (filters.type.length && !filters.type.includes(r.type)) return false;
        if (filters.assignee.length && !filters.assignee.includes(r.assignee)) return false;
        if (q && !`${r.title} ${r.subtitle} ${r.assignee}`.toLowerCase().includes(q)) return false;
        return true;
      })
      // Soonest first (latest first for Past); undated rows go last.
      .toSorted((x, y) => {
        if (!x.date || !y.date) return (x.date ? 0 : 1) - (y.date ? 0 : 1);
        return (view === 'Past' ? -1 : 1) * (x.date - y.date);
      });
  }, [rows, view, filters, search]);

  const allChecked = visible.length > 0 && visible.every(r => selected.has(r.id));
  const someChecked = visible.some(r => selected.has(r.id));
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(visible.map(r => r.id)));
  const toggleOne = (id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <button
          ref={viewBtnRef}
          type="button"
          className={styles.viewBy}
          onClick={() => setViewMenu(viewMenu ? null : viewBtnRef.current?.getBoundingClientRect())}
        >
          View By: <span className={styles.viewByValue}>{view}</span>
          <DownChevronIcon size={14} color="var(--neutral-400)" />
        </button>
        <div className={styles.toolbarActions}>
          {searchOpen ? (
            <SearchBar
              className={styles.searchBar}
              placeholder="Search appointments"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClose={() => { setSearchOpen(false); setSearch(''); }}
            />
          ) : (
            <ActionButton size="S" icon="solar:magnifer-linear" tooltip="Search" onClick={() => setSearchOpen(true)} />
          )}
          <span className={styles.divider} />
          <ActionButton
            size="S"
            icon="custom:filter"
            tooltip={chipsOpen ? 'Hide filters' : 'Filter'}
            iconColor={chipsOpen || anyFilter ? 'var(--primary-300)' : undefined}
            onClick={() => setChipsOpen(v => !v)}
          />
        </div>
      </div>

      {chipsOpen && (
        <div className={styles.chips}>
          <FilterChip size="S" label="Type" options={['Appointment', 'Reminder']} selected={filters.type} onChange={v => setFilters(f => ({ ...f, type: v }))} />
          <FilterChip size="S" label="Assignee" options={assigneeOptions} selected={filters.assignee} onChange={v => setFilters(f => ({ ...f, assignee: v }))} searchable />
          {anyFilter && (
            <button type="button" className={styles.clearAll} onClick={() => setFilters(EMPTY_FILTERS)}>
              <Icon name="solar:close-circle-linear" size={14} color="currentColor" />
              Clear All
            </button>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="solar:calendar-linear" size={36} color="var(--neutral-200)" />
          <p className={styles.emptyTitle}>
            {rows.length === 0 ? 'No appointments scheduled yet.' : `No ${view === 'All' ? '' : `${view.toLowerCase()} `}appointments or reminders.`}
          </p>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={[styles.grid, styles.head].join(' ')}>
            <span className={styles.checkCell}>
              <Checkbox
                checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                onCheckedChange={toggleAll}
                aria-label="Select all"
              />
            </span>
            <span>Title</span>
            <span>Type</span>
            <span>Date &amp; Time</span>
            <span className={styles.assigneeHead}>Assignee</span>
            <span />
          </div>
          {visible.map(r => (
            <div key={r.id} className={[styles.grid, styles.row].join(' ')}>
              <span className={styles.checkCell}>
                <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleOne(r.id)} aria-label={`Select ${r.title}`} />
              </span>
              <button
                type="button"
                className={styles.titleCell}
                onClick={() => onOpen?.(r.raw)}
                aria-label={`Open ${r.title} details`}
              >
                <span className={styles.title}>{r.title}</span>
                {r.subtitle && <span className={styles.subtitle}>{r.subtitle}</span>}
              </button>
              <div className={styles.typeCell}>
                <span>{r.type}</span>
                {r.recurring && (
                  <Tooltip label="Recurring">
                    <span className={styles.recurring}>
                      <Icon name="solar:repeat-linear" size={12} color="var(--primary-300)" />
                    </span>
                  </Tooltip>
                )}
              </div>
              <div className={styles.dateCell}>
                <span>{fmtDate(r.date) || '—'}</span>
                {r.time && <span>{r.time}</span>}
              </div>
              <div className={styles.assigneeCell}>
                <AssigneeChange
                  avatarOnly
                  unassigned={!r.assignee}
                  name={r.assignee || undefined}
                  initials={r.assignee ? initialsOf(r.assignee) : undefined}
                  ariaLabel={r.assignee || 'Assign'}
                  users={platformUsers}
                  pickerTitle={r.assignee ? 'Change assignee' : 'Assign to'}
                  onSelect={(u) => { if (u?.name && u.name !== r.assignee) onAssigneeChange?.(r.raw, u.name); }}
                />
              </div>
              <div className={styles.actionsCell}>
                <ActionButton
                  icon="solar:menu-dots-linear"
                  size="S"
                  tooltip="More actions"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setRowMenu(prev => (prev?.row.id === r.id ? null : { row: r, rect }));
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {rowMenu && (
        <MenuPopover
          anchorRect={rowMenu.rect}
          align="right"
          width={168}
          ariaLabel="Appointment actions"
          items={ROW_ACTIONS}
          onSelect={(key) => {
            const row = rowMenu.row;
            setRowMenu(null);
            if (key === 'edit') onEdit?.(row.raw);
            else if (key === 'download') downloadIcs(row);
            else if (key === 'delete') onDelete?.(row.raw);
          }}
          onClose={() => setRowMenu(null)}
        />
      )}

      {viewMenu && (
        <MenuPopover
          anchorRect={viewMenu}
          align="left"
          width={160}
          ariaLabel="View by"
          items={VIEW_OPTIONS.map(v => ({
            key: v,
            label: <span style={{ color: v === view ? 'var(--primary-300)' : undefined }}>{v}</span>,
          }))}
          onSelect={(key) => { setView(key); setSelected(new Set()); }}
          onClose={() => setViewMenu(null)}
        />
      )}
    </div>
  );
}
