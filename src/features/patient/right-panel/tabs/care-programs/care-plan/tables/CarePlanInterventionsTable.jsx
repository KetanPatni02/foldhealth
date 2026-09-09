import { useMemo } from 'react';
import { ActionButton } from '../../../../../../../components/ActionButton/ActionButton';
import { AssigneeChange } from '../../../../../../../components/AssigneeChange/AssigneeChange';
import { WorklistShell } from '../../../../../../../components/WorklistShell/WorklistShell';
import { PriorityIcon } from '../../../../../../../components/PriorityIcon/PriorityIcon';
import { useTableSort } from '../../../../../../../components/HeaderCell/useTableSort';
import {
  INTERVENTION_COLUMNS,
  withSelectColumn,
  GbiCheckboxCell,
  GbiNameCell,
  GbiProgressCell,
  GbiStatusButton,
  GBI_COL_WIDTH,
} from './carePlanTableShared';
import { enrichInterventionRows } from './carePlanTableSort';
import { CARE_PLAN_INTERVENTION_ICONS } from '../lib/carePlanInterventionMenu';
import { KIND_LABELS } from '../../../../../../settings/care-plan-library/interventions/shared/interventionKinds';
import styles from './carePlanTables.module.css';

// "7d" / "1w" / "2m" / "1y" (or config.dueOffset + dueUnit) → "1 week".
// Falls back to the raw string when it can't be parsed so nothing is
// lost for legacy rows.
function formatDurationLabel(intv) {
  if (!intv) return null;
  const raw = intv.config?.dueOffset != null && intv.config?.dueUnit
    ? `${intv.config.dueOffset}${String(intv.config.dueUnit)[0]}`
    : intv.duration;
  if (!raw) return null;
  const m = String(raw).trim().match(/^(\d+)\s*([dwmy])$/i);
  if (!m) return String(raw);
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const dayCount = unit === 'd' ? n : unit === 'w' ? n * 7 : unit === 'm' ? n * 30 : n * 365;
  if (dayCount % 365 === 0) { const y = dayCount / 365; return `${y} year${y === 1 ? '' : 's'}`; }
  if (dayCount % 30  === 0) { const mo = dayCount / 30;  return `${mo} month${mo === 1 ? '' : 's'}`; }
  if (dayCount % 7   === 0) { const w = dayCount / 7;    return `${w} week${w === 1 ? '' : 's'}`; }
  return `${dayCount} day${dayCount === 1 ? '' : 's'}`;
}
function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}
// Due date = user-picked override when present, else createdAt +
// parsed duration. Falls back to null when neither is available so
// the column reads "—" instead of a nonsense date. Returns { iso,
// formatted } so the calendar can seed itself and the cell has a
// display string in one call.
function computeDueDate(intv) {
  const override = intv?.config?.dueDateOverride;
  if (override) {
    const d = new Date(override);
    if (!Number.isNaN(d.getTime())) return { iso: d.toISOString(), formatted: fmtDate(d.toISOString()) };
  }
  const start = intv?.createdAt ? new Date(intv.createdAt) : null;
  if (!start || Number.isNaN(start.getTime())) return { iso: null, formatted: null };
  const raw = intv.config?.dueOffset != null && intv.config?.dueUnit
    ? `${intv.config.dueOffset}${String(intv.config.dueUnit)[0]}`
    : intv.duration;
  const m = raw && String(raw).trim().match(/^(\d+)\s*([dwmy])$/i);
  if (!m) return { iso: null, formatted: null };
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const end = new Date(start);
  if (unit === 'd') end.setDate(end.getDate() + n);
  else if (unit === 'w') end.setDate(end.getDate() + n * 7);
  else if (unit === 'm') end.setMonth(end.getMonth() + n);
  else if (unit === 'y') end.setFullYear(end.getFullYear() + n);
  return { iso: end.toISOString(), formatted: fmtDate(end.toISOString()) };
}

// Tighter widths for the newly-added Due Date column and the now
// avatar-only Assigned To column — the shared GBI widths are sized
// for text-heavy cells and left too much empty space here.
const DUE_DATE_COL_WIDTH  = 108;
const ASSIGNEE_COL_WIDTH  = 72;

const DUE_DATE_COLUMN = {
  key: 'dueDate',
  label: 'Due Date',
  width: DUE_DATE_COL_WIDTH,
  sortKey: '_sortDueDate',
  sortType: 'date',
  thStyle: { paddingLeft: 6, paddingRight: 6 },
};
// Inject Due Date immediately before the Assigned To column so the
// row reads: Priority · Name · Due Date · Assigned To · Adherence · Status.
function insertBefore(cols, key, col) {
  const i = cols.findIndex(c => c.key === key);
  if (i < 0) return [...cols, col];
  return [...cols.slice(0, i), col, ...cols.slice(i)];
}
const INTERVENTION_COLUMNS_WITH_DUE = insertBefore(INTERVENTION_COLUMNS, 'assignee', DUE_DATE_COLUMN)
  // Shrink the assignee column too — the avatar-only pill only needs
  // ~72px, freeing the whole intervention row from unnecessary padding.
  .map(c => c.key === 'assignee' ? { ...c, width: ASSIGNEE_COL_WIDTH } : c);

// The one and only rule for the assignee avatar's color:
//   • Member (patient) → 'patient' variant (primary / purple)
//   • User   (staff)   → 'staff'   variant (secondary)
// Look up the assignee in the merged users+patients list (`role`
// field). Fall back to a `patients` name match so a member whose
// intervention has an isMemberTask override still lands in the
// patient bucket. Never guess by intervention kind — the identity
// is what colors the pill.
export function isMemberAssignee(name, users, patients) {
  if (!name || name === 'Unassigned') return false;
  const hit = (users || []).find(u => u.name === name);
  if (hit) return hit.role === 'Member';
  return (patients || []).some(p => p.name === name);
}
export function assigneeAvatarVariant(name, users, patients) {
  return isMemberAssignee(name, users, patients) ? 'patient' : 'staff';
}

export function CarePlanInterventionsTable({
  rows,
  canEdit,
  bulkMode,
  selectedIds,
  onSelectAll,
  onToggleSelect,
  onPriorityMenu,
  onStatusMenu,
  onRowMenu,
  onOpenIntervention,
  onAssigneeChange,
  linked,
  platformUsers,
  // Merged into the inline picker so a member (patient) can be assigned
  // to an intervention from the row as well — matches the picker in the
  // Intervention drawer (Figma 8629:178).
  patients,
  template = false,
  emptyState,
}) {
  // A template row has no assignee, adherence or status, but it still gets
  // its row menu when the caller can act on one.
  const showActions = !template || Boolean(onRowMenu);
  const columns = useMemo(() => {
    if (template) {
      return withSelectColumn(
        INTERVENTION_COLUMNS_WITH_DUE.filter(c => c.key === 'priority' || c.key === 'title'
          || (showActions && c.key === 'actions')),
        bulkMode,
      );
    }
    return withSelectColumn(INTERVENTION_COLUMNS_WITH_DUE, bulkMode);
  }, [bulkMode, template, showActions]);

  const initialsOf = (name) => (name || '').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  // Merge platform users + patients so members can be assigned inline.
  // Each row picker mirrors the drawer's shape: staff avatar for users,
  // patient avatar (rounded, purple) for members.
  const assigneeUsers = useMemo(() => ([
    ...(platformUsers || []).map(u => ({
      id: u.id || `user:${u.name}`,
      name: u.name,
      initials: u.initials || initialsOf(u.name),
      role: u.role || 'User',
    })),
    ...(patients || []).map(p => ({
      id: p.id || `member:${p.name}`,
      name: p.name,
      initials: p.initials || initialsOf(p.name),
      role: 'Member',
      avatarVariant: 'patient',
    })),
  ]), [platformUsers, patients]);

  const sortableRows = useMemo(() => enrichInterventionRows(rows), [rows]);
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(sortableRows, 'title', 'asc');

  return (
    <div className={styles.tableWrap}>
      <WorklistShell
        embedded
        embeddedNoScroll
        header={null}
        hideBulkBar
        columns={columns}
        rows={sorted}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={requestSort}
        selectedIds={selectedIds}
        onSelectAll={onSelectAll}
        minTableWidth={0}
        emptyState={emptyState}
        renderRow={(i) => (
            <tr
              key={i.id}
              className={`${styles.row} ${styles.rowClickable} ${styles.gbiRow}`}
              onClick={() => onOpenIntervention(i)}
            >
              {bulkMode && (
                <GbiCheckboxCell
                  checked={selectedIds.includes(i.id)}
                  onToggle={() => onToggleSelect(i.id)}
                  label={`Select ${i.title}`}
                  disabled={!canEdit}
                />
              )}
              <td className={styles.priorityTd} onClick={e => e.stopPropagation()}>
                {canEdit ? (
                  <button
                    type="button"
                    className={styles.priorityBtn}
                    onClick={(e) => onPriorityMenu({ kind: 'intv', item: i, rect: e.currentTarget.getBoundingClientRect() })}
                    aria-label="Change priority"
                  >
                    <PriorityIcon priority={i.priority} size={16} />
                  </button>
                ) : (
                  <PriorityIcon priority={i.priority} size={16} />
                )}
              </td>
              <td className={styles.titleTd}>
                <GbiNameCell
                  // Look up the kind-based icon so rows stay in sync with
                  // the Add Intervention menu (single source of truth) —
                  // legacy rows saved with a stale `icon` still show the
                  // right glyph as long as `kind` is set.
                  icon={CARE_PLAN_INTERVENTION_ICONS[i.kind] || i.icon || 'solar:clipboard-list-linear'}
                  iconTitle={KIND_LABELS[i.kind] || 'Intervention'}
                  // `config.repeat` is the drawer's Repeat toggle; a
                  // truthy value renders the small refresh glyph in
                  // the name cell.
                  recurring={!!i.config?.repeat}
                  title={i.title}
                  /* Start date + duration read below the title in a
                     stacked layout: "Started 03/20/2026 · 1 week". Font
                     size is 12px (--font-sm) from the shared
                     .nameSecondary rule; the muted class overrides the
                     default neutral-300 with grey200 per spec. */
                  meta={(() => {
                    const start = fmtDate(i.createdAt);
                    const dur = formatDurationLabel(i);
                    const bits = [];
                    if (start) bits.push(`Started ${start}`);
                    if (dur) bits.push(dur);
                    if (bits.length === 0) return null;
                    return <span className={styles.intvSubMeta}>{bits.join(' · ')}</span>;
                  })()}
                  layout="stacked"
                  linked={linked(i)}
                  canEdit={canEdit}
                  />
              </td>
              {!template && (
                /* Read-only due date — plain text in --neutral-300
                   aligned with the "Due Date" header. Empty rows
                   render "—" instead of a call-to-action; changing
                   the date happens in the Intervention drawer. */
                <td className={styles.valueTd}>
                  <span className={styles.dueDateText}>
                    {computeDueDate(i).formatted || '-'}
                  </span>
                </td>
              )}
              {!template && (() => {
                // Only Internal Task lets the user reassign — every
                // other intervention kind runs on the member and the
                // assignee is BY DESIGN the patient, even if the row
                // hasn't been backfilled yet. In that case we force
                // the member's identity + patient variant + `unassigned=
                // false`, so the pill never renders as the generic
                // outlined-person icon on a member task.
                const isMemberTask = i.kind !== 'internal-task';
                const memberRow = (patients || [])[0] || null;
                const rawName = i.assignee?.name || '';
                const rawInitials = i.assignee?.initials || '';
                const effectiveName = isMemberTask
                  ? (memberRow?.name || rawName)
                  : rawName;
                const effectiveInitials = isMemberTask
                  ? (memberRow?.initials || rawInitials)
                  : rawInitials;
                // Member tasks are always the member — force patient
                // variant even if the row's name field is still
                // "Unassigned" (legacy data). Internal tasks derive
                // from actual identity.
                const avatarVariant = isMemberTask
                  ? 'patient'
                  : assigneeAvatarVariant(effectiveName, assigneeUsers, patients);
                // Same rule: a member task is never truly unassigned —
                // the patient owns it — so the AssigneeChange pill
                // must not render the unassigned generic state on
                // those rows.
                const showAsUnassigned = !isMemberTask
                  && (!effectiveName || effectiveName === 'Unassigned');
                return (
                <>
                  <td className={styles.assigneeTd} onClick={e => e.stopPropagation()}>
                    {/* Avatar-only trigger — the row's assignee reads
                        as a compact chip (no name text), matching the
                        Figma spec. Full name still surfaces via the
                        avatar's built-in hover tooltip. */}
                    <AssigneeChange
                      size="S"
                      avatarOnly
                      name={effectiveName || (isMemberTask ? 'Member' : undefined)}
                      initials={effectiveInitials}
                      ariaLabel={showAsUnassigned ? 'Assign' : effectiveName}
                      unassigned={showAsUnassigned}
                      users={assigneeUsers}
                      avatarVariant={avatarVariant}
                      pickerTitle="Change assignee"
                      onSelect={(u) => onAssigneeChange(i, u)}
                      disabled={!canEdit || isMemberTask}
                    />
                  </td>
                  <td className={styles.adherenceTd} onClick={e => e.stopPropagation()}>
                    <GbiProgressCell progress={i.adherence} />
                  </td>
                  <td className={styles.statusTd} onClick={e => e.stopPropagation()}>
                    <GbiStatusButton
                      value={i.status}
                      disabled={!canEdit}
                      onOpen={rect => onStatusMenu({ kind: 'intv', item: i, rect })}
                    />
                  </td>
                </>
                );
              })()}
              {showActions && (
                <td className={styles.actionsTd} onClick={e => e.stopPropagation()}>
                  <ActionButton
                    icon="solar:menu-dots-linear"
                    size="S"
                    tooltip="More"
                    tooltipBelow
                    tooltipLeft
                    disabled={!template && !canEdit}
                    onClick={(e) => onRowMenu({ kind: 'intv-menu', item: i, rect: e.currentTarget.getBoundingClientRect() })}
                  />
                </td>
              )}
            </tr>
        )}
      />
    </div>
  );
}
