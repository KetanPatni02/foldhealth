import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../../../../../../../components/Icon/Icon';
import { Badge } from '../../../../../../../../components/Badge/Badge';
import { Avatar } from '../../../../../../../../components/Avatar/Avatar';
import { CloseButton } from '../../../../../../../../components/CloseButton/CloseButton';
import { DownChevronIcon } from '../../../../../../../../components/Icon/DownChevronIcon';
import { PriorityIcon } from '../../../../../../../../components/PriorityIcon/PriorityIcon';
import { RingEmptyState } from '../../../../../../../../components/RingEmptyState/RingEmptyState';
import { TableSkeleton } from '../../../../../../../../components/TableSkeleton/TableSkeleton';
import { WorklistShell } from '../../../../../../../../components/WorklistShell/WorklistShell';
import { MenuPopover } from '../../../../../../../../components/MenuPopover/MenuPopover';
import { AssigneeChange } from '../../../../../../../../components/AssigneeChange/AssigneeChange';
import { useTableSort } from '../../../../../../../../components/HeaderCell/useTableSort';
import { useAppStore } from '../../../../../../../../store/useAppStore';
import { buildCarePlanSnapshot, filterCarePlanSnapshot } from '../carePlanSnapshot';
import {
  GbiNameCell,
  GbiProgressCell,
  GbiStatusButton,
  isClosedBarrier,
  GBI_COL_WIDTH,
  GOAL_COLUMNS,
  INTERVENTION_COLUMNS,
  BARRIER_COLUMNS,
} from '../../tables/carePlanTableShared';
import { enrichGoalRows, enrichInterventionRows } from '../../tables/carePlanTableSort';
import { CARE_PLAN_INTERVENTION_ICONS } from '../../lib/carePlanInterventionMenu';
import { KIND_LABELS } from '../../../../../../../settings/care-plan-library/interventions/shared/interventionKinds';
import { GoalPreviewDrawer } from '../../drawers/GoalPreviewDrawer/GoalPreviewDrawer';
import { InterventionPreviewDrawer } from '../../drawers/InterventionPreviewDrawer/InterventionPreviewDrawer';
import { BarrierDetailDrawer } from '../../drawers/BarrierDetailDrawer/BarrierDetailDrawer';
import sharedRow from '../../tables/carePlanTables.module.css';
import styles from './CarePlanSummaryView.module.css';

const GBI_STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Met', 'Not Met'];
const PRIORITIES = ['high', 'medium', 'low'];

// Read-only Goals/Interventions/Barriers section head — matches the
// CarePlanView's GBI treatment (chevron + title + count pill), minus
// the Add affordance since the Comprehensive Care Plan tab is a
// consolidated snapshot across programs and can't spawn new rows.
function SectionHead({ title, count, open, onToggle }) {
  return (
    <button type="button" className={styles.sectionHead} onClick={onToggle} aria-expanded={open}>
      <DownChevronIcon
        size={16}
        color="var(--neutral-400)"
        className={`${styles.sectionChevron} ${open ? '' : styles.sectionChevronClosed}`}
      />
      <span className={styles.sectionTitle}>{title}</span>
      {count > 0 ? <span className={styles.sectionCount}>{count}</span> : null}
    </button>
  );
}

// Care Plan column — injected before Status in each table so every row
// tells you which program owns it. Sort by the row's `programCode` tag.
const HEADER_COMPACT = { paddingLeft: 6, paddingRight: 6 };
const CARE_PLAN_COLUMN = {
  key: 'carePlan',
  label: 'Care Plan',
  width: 100,
  sortKey: 'programCode',
  sortType: 'alpha',
  thStyle: HEADER_COMPACT,
};

const insertBefore = (cols, key, col) => {
  const i = cols.findIndex(c => c.key === key);
  if (i < 0) return [...cols, col];
  return [...cols.slice(0, i), col, ...cols.slice(i)];
};

const stripActions = (cols) => cols.filter(c => c.key !== 'actions');

const SUMMARY_GOAL_COLUMNS = insertBefore(stripActions(GOAL_COLUMNS), 'status', CARE_PLAN_COLUMN);
const SUMMARY_INTERVENTION_COLUMNS = insertBefore(stripActions(INTERVENTION_COLUMNS), 'status', CARE_PLAN_COLUMN);
const SUMMARY_BARRIER_COLUMNS = insertBefore(stripActions(BARRIER_COLUMNS), 'status', CARE_PLAN_COLUMN);

function GoalsTable({ rows, onOpen, onPriorityMenu, onStatusMenu }) {
  const sortable = useMemo(() => enrichGoalRows(rows), [rows]);
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(sortable, 'title', 'asc');
  return (
    <div className={sharedRow.tableWrap}>
      <WorklistShell
        embedded
        embeddedNoScroll
        header={null}
        hideBulkBar
        columns={SUMMARY_GOAL_COLUMNS}
        rows={sorted}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={requestSort}
        minTableWidth={0}
        emptyState={<div className={styles.emptyRow}>No goals match.</div>}
        renderRow={(g) => (
          <tr
            key={`${g.programCode}-${g.id}`}
            className={`${sharedRow.row} ${sharedRow.rowClickable} ${sharedRow.gbiRow}`}
            onClick={() => onOpen(g)}
          >
            <td className={sharedRow.priorityTd} onClick={e => e.stopPropagation()}>
              <button
                type="button"
                className={sharedRow.priorityBtn}
                aria-label="Change priority"
                onClick={(e) => onPriorityMenu({ kind: 'goal', item: g, rect: e.currentTarget.getBoundingClientRect() })}
              >
                <PriorityIcon priority={g.priority} size={16} />
              </button>
            </td>
            <td className={sharedRow.titleTd}>
              <GbiNameCell
                icon={g.icon}
                title={g.title}
                meta={g.subtitle || null}
                layout="stacked"
              />
            </td>
            <td className={sharedRow.valueTd} onClick={e => e.stopPropagation()}>
              <span className={`${sharedRow.valueText || ''} ${g.currentValue === 'No Data' ? sharedRow.muted || '' : ''}`}>
                {g.currentValue || '—'}
              </span>
            </td>
            <td className={sharedRow.progressTd} onClick={e => e.stopPropagation()}>
              <GbiProgressCell progress={g.progress} />
            </td>
            <td className={sharedRow.assigneeTd} onClick={e => e.stopPropagation()}>
              <Badge tone="grey" size="S" label={g.programCode} />
            </td>
            <td className={sharedRow.statusTd} onClick={e => e.stopPropagation()}>
              <GbiStatusButton
                value={g.status}
                onOpen={rect => onStatusMenu({ kind: 'goal', item: g, rect })}
              />
            </td>
          </tr>
        )}
      />
    </div>
  );
}

function InterventionsTable({ rows, onOpen, onPriorityMenu, onStatusMenu, onAssigneeChange, patients, platformUsers }) {
  const sortable = useMemo(() => enrichInterventionRows(rows), [rows]);
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(sortable, 'title', 'asc');
  const initialsOf = (name) => (name || '').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  // Merge platform users + patients so members can be assigned inline.
  // Each row picker mirrors the per-plan InterventionsTable shape: staff
  // avatar for users, patient avatar (rounded, purple) for members.
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
  return (
    <div className={sharedRow.tableWrap}>
      <WorklistShell
        embedded
        embeddedNoScroll
        header={null}
        hideBulkBar
        columns={SUMMARY_INTERVENTION_COLUMNS}
        rows={sorted}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={requestSort}
        minTableWidth={0}
        emptyState={<div className={styles.emptyRow}>No interventions match.</div>}
        renderRow={(i) => {
          // Only Internal Task lets the user reassign — every other
          // intervention kind runs on the member and the assignee stays
          // locked to them. Fall back to the plan's patient when a
          // legacy row is still 'Unassigned' so the column reads
          // correctly without a data backfill (matches the per-plan
          // InterventionsTable behavior).
          const isMemberTask = i.kind !== 'internal-task';
          const memberRow = (patients || [])[0] || null;
          const effectiveName = isMemberTask
            ? (memberRow?.name || i.assignee?.name)
            : (i.assignee?.name || '');
          const effectiveInitials = isMemberTask
            ? (memberRow?.initials || i.assignee?.initials)
            : (i.assignee?.initials || '');
          const isPatientAssignee = (patients || []).some(p => p.name === effectiveName);
          return (
            <tr
              key={`${i.programCode}-${i.id}`}
              className={`${sharedRow.row} ${sharedRow.rowClickable} ${sharedRow.gbiRow}`}
              onClick={() => onOpen(i)}
            >
              <td className={sharedRow.priorityTd} onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className={sharedRow.priorityBtn}
                  aria-label="Change priority"
                  onClick={(e) => onPriorityMenu({ kind: 'intv', item: i, rect: e.currentTarget.getBoundingClientRect() })}
                >
                  <PriorityIcon priority={i.priority} size={16} />
                </button>
              </td>
              <td className={sharedRow.titleTd}>
                <GbiNameCell
                  icon={CARE_PLAN_INTERVENTION_ICONS[i.kind] || i.icon || 'solar:clipboard-list-linear'}
                  iconTitle={KIND_LABELS[i.kind] || 'Intervention'}
                  title={i.title}
                  meta={i.duration || null}
                />
              </td>
              <td className={sharedRow.assigneeTd} onClick={e => e.stopPropagation()}>
                <AssigneeChange
                  size="S"
                  fillContainer
                  nameMuted
                  name={effectiveName}
                  initials={effectiveInitials}
                  showRole={false}
                  unassigned={!effectiveName || effectiveName === 'Unassigned'}
                  unassignedLabel="Unassigned"
                  users={assigneeUsers}
                  avatarVariant={isPatientAssignee ? 'patient' : 'staff'}
                  pickerTitle="Change assignee"
                  onSelect={(u) => onAssigneeChange(i, u)}
                  disabled={isMemberTask}
                />
              </td>
              <td className={sharedRow.adherenceTd} onClick={e => e.stopPropagation()}>
                <GbiProgressCell progress={i.adherence} />
              </td>
              <td className={sharedRow.assigneeTd} style={{ width: CARE_PLAN_COLUMN.width, minWidth: CARE_PLAN_COLUMN.width, maxWidth: CARE_PLAN_COLUMN.width }} onClick={e => e.stopPropagation()}>
                <Badge tone="grey" size="S" label={i.programCode} />
              </td>
              <td className={sharedRow.statusTd} onClick={e => e.stopPropagation()}>
                <GbiStatusButton
                  value={i.status}
                  onOpen={rect => onStatusMenu({ kind: 'intv', item: i, rect })}
                />
              </td>
            </tr>
          );
        }}
      />
    </div>
  );
}

// Row body — mirrors the per-plan CarePlanBarriersTable's BarrierRow
// (empty priority cell, custom:barrier icon, barrierStatusTd width),
// with the Care Plan column injected before Status.
function BarrierRow({ b, onOpen, onStatusMenu }) {
  return (
    <tr
      className={`${sharedRow.row} ${sharedRow.gbiRow} ${sharedRow.rowClickable}`}
      onClick={() => onOpen(b)}
    >
      <td className={sharedRow.priorityTd} aria-hidden="true" />
      <td className={sharedRow.titleTd}>
        <GbiNameCell
          icon="custom:barrier"
          title={b.title}
          meta={b.description || null}
        />
      </td>
      <td className={sharedRow.assigneeTd} style={{ width: CARE_PLAN_COLUMN.width, minWidth: CARE_PLAN_COLUMN.width, maxWidth: CARE_PLAN_COLUMN.width }} onClick={e => e.stopPropagation()}>
        <Badge tone="grey" size="S" label={b.programCode} />
      </td>
      <td className={sharedRow.barrierStatusTd} onClick={e => e.stopPropagation()}>
        <GbiStatusButton
          value={b.status}
          onOpen={rect => onStatusMenu({ kind: 'barrier', item: b, rect })}
        />
      </td>
    </tr>
  );
}

function BarriersTable({ rows, onOpen, onStatusMenu }) {
  const [closedOpen, setClosedOpen] = useState(false);
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(rows, 'title', 'asc');
  const { openRows, closedRows } = useMemo(() => {
    const open = [];
    const closed = [];
    for (const row of sorted) {
      if (isClosedBarrier(row.status)) closed.push(row);
      else open.push(row);
    }
    return { openRows: open, closedRows: closed };
  }, [sorted]);
  return (
    <div className={sharedRow.tableWrap}>
      <WorklistShell
        embedded
        embeddedNoScroll
        header={null}
        hideBulkBar
        columns={SUMMARY_BARRIER_COLUMNS}
        rows={openRows}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={requestSort}
        minTableWidth={0}
        emptyState={openRows.length === 0 && closedRows.length === 0 ? (
          <div className={styles.emptyRow}>No barriers match.</div>
        ) : null}
        renderRow={(b) => (
          <BarrierRow
            key={`${b.programCode}-${b.id}`}
            b={b}
            onOpen={onOpen}
            onStatusMenu={onStatusMenu}
          />
        )}
      />
      {closedRows.length > 0 && (
        <div className={sharedRow.closedBarriers}>
          <button
            type="button"
            className={sharedRow.closedBarriersToggle}
            onClick={() => setClosedOpen(v => !v)}
            aria-expanded={closedOpen}
          >
            <DownChevronIcon
              size={6}
              color="var(--neutral-300)"
              className={`${sharedRow.closedBarriersChevron} ${closedOpen ? '' : sharedRow.closedBarriersChevronClosed}`}
            />
            <span className={sharedRow.closedBarriersLabel}>Closed Barriers</span>
          </button>
          {closedOpen && (
            <table className={sharedRow.closedBarriersTable}>
              <colgroup>
                <col style={{ width: GBI_COL_WIDTH.priority }} />
                <col />
                <col style={{ width: CARE_PLAN_COLUMN.width }} />
                <col style={{ width: GBI_COL_WIDTH.status }} />
              </colgroup>
              <tbody>
                {closedRows.map(b => (
                  <BarrierRow
                    key={`${b.programCode}-${b.id}`}
                    b={b}
                    onOpen={onOpen}
                    onStatusMenu={onStatusMenu}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// Patient-level snapshot of every care plan across all of a patient's
// programs (roadmap #1 / E2). Rows are editable in place for priority +
// status; clicking a row opens the full preview drawer where the user
// can change status, adherence/progress, and add notes. Every write
// goes through the same store actions the per-plan tab uses, so the
// activity log, DB persistence, and cross-view sync work identically.
export function CarePlanSummaryView({ patientId, programs, onClose, onOpenProgramStep, searchText = '', programFilter = [], embedded = false }) {
  const fetchAllPatientCarePlans = useAppStore(s => s.fetchAllPatientCarePlans);
  const loading = useAppStore(s => s.patientCarePlanAllLoading[patientId]);
  const loadedFor = useAppStore(s => s.patientCarePlanAllLoadedFor[patientId]);
  const patientCarePlans = useAppStore(s => s.patientCarePlans);
  // Resolve THIS patient only — `s.patients` holds the current worklist
  // slice (many patients), so indexing [0] there landed on whoever's at
  // the top of the list (e.g. "Ralph Halvorson") instead of the patient
  // we're viewing. Look up by `patientId` across every worklist slice,
  // then hand the row picker a single-element array — mirrors what the
  // per-plan CarePlanView passes into `CarePlanInterventionsTable`.
  const currentPatient = useAppStore(s => {
    const buckets = [s.patients, s.allPatients, s.snpMembers, s.ccmMembers, s.hccMembers, s.awvMembers, s.jsaMembers];
    for (const list of buckets) {
      if (!Array.isArray(list)) continue;
      const hit = list.find(p => p && (p.id === patientId || String(p.memberId) === String(patientId)));
      if (hit) return hit;
    }
    return null;
  });
  const patients = useMemo(() => {
    if (!currentPatient) return [];
    const name = currentPatient.name || '';
    const initials = currentPatient.initials
      || name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return [{ id: currentPatient.id || patientId, name, initials }];
  }, [currentPatient, patientId]);
  const platformUsers = useAppStore(s => s.platformUsers) || [];
  const fetchPlatformUsers = useAppStore(s => s.fetchPlatformUsers);
  const savePatientCarePlanGoal = useAppStore(s => s.savePatientCarePlanGoal);
  const savePatientCarePlanIntervention = useAppStore(s => s.savePatientCarePlanIntervention);
  const savePatientCarePlanBarrier = useAppStore(s => s.savePatientCarePlanBarrier);

  useEffect(() => { fetchPlatformUsers?.(); }, [fetchPlatformUsers]);

  useEffect(() => {
    if (patientId) fetchAllPatientCarePlans(patientId);
  }, [patientId, fetchAllPatientCarePlans]);

  // Flatten every program's plan into goals + interventions + barriers
  // tagged with their program (shared with the Download export).
  const { conditions, goals, interventions, barriers } = useMemo(
    () => buildCarePlanSnapshot(programs, patientCarePlans, patientId),
    [programs, patientCarePlans, patientId],
  );

  // Apply the toolbar's search + program filter to the flattened snapshot.
  const progKey = programFilter.join('|');
  const { goals: filteredGoals, interventions: filteredInterventions, barriers: filteredBarriers } = useMemo(
    () => filterCarePlanSnapshot({ conditions, goals, interventions, barriers }, { searchText, programFilter }),
    [conditions, goals, interventions, barriers, searchText, progKey], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const isEmpty = loadedFor && goals.length === 0 && interventions.length === 0 && barriers.length === 0;

  const [openSections, setOpenSections] = useState({ goals: true, interventions: true, barriers: true });
  const toggleSection = (k) => setOpenSections(s => ({ ...s, [k]: !s[k] }));

  // Preview drawer state — reuses the exact per-plan drawer so every
  // edit (status, adherence, progress, notes) lands in the same store
  // slice and shows up here on the next render.
  const [previewGoal, setPreviewGoal] = useState(null);
  const [previewIntervention, setPreviewIntervention] = useState(null);
  const [previewBarrier, setPreviewBarrier] = useState(null);

  // Inline priority / status menus — dispatch to the plan the row
  // belongs to via its own tagged `program` field.
  const [priorityMenu, setPriorityMenu] = useState(null);
  const [statusMenu, setStatusMenu] = useState(null);

  const changePriority = (priority) => {
    if (!priorityMenu) return;
    const { kind, item } = priorityMenu;
    setPriorityMenu(null);
    const program = item.program;
    if (!program) return;
    if (kind === 'goal') savePatientCarePlanGoal(patientId, program, { ...item, priority }, item.id);
    else if (kind === 'barrier') savePatientCarePlanBarrier(patientId, program, { ...item, priority }, item.id);
    else savePatientCarePlanIntervention(patientId, program, { ...item, priority }, item.id);
  };

  const changeStatus = (status) => {
    if (!statusMenu) return;
    const { kind, item } = statusMenu;
    setStatusMenu(null);
    const program = item.program;
    if (!program) return;
    if (kind === 'goal') savePatientCarePlanGoal(patientId, program, { ...item, status }, item.id);
    else if (kind === 'barrier') savePatientCarePlanBarrier(patientId, program, { ...item, status }, item.id);
    else savePatientCarePlanIntervention(patientId, program, { ...item, status }, item.id);
  };

  const openGoal = (g) => setPreviewGoal({ goal: g, program: g.program });
  const openIntervention = (i) => setPreviewIntervention({ intervention: i, program: i.program });
  const openBarrier = (b) => setPreviewBarrier({ barrier: b, program: b.program });

  // Only Internal Task's assignee is editable — Patient Task and other
  // intervention kinds keep the member as the assignee. Write via the
  // shared intervention save so the per-plan tab, activity log, and
  // this consolidated view all pick up the new owner on the next render.
  const handleInterventionAssignee = (intv, user) => {
    if (!intv?.program || intv.kind !== 'internal-task') return;
    const name = user?.name || 'Unassigned';
    const initials = name === 'Unassigned'
      ? ''
      : name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    savePatientCarePlanIntervention(
      patientId,
      intv.program,
      { ...intv, assignee: { name, initials } },
      intv.id,
    );
  };

  return (
    <div className={`${styles.container} ${embedded ? styles.embedded : ''}`}>
      {!embedded && (
        <div className={styles.header}>
          <div className={styles.headerText}>
            <span className={styles.headerTitle}>Care Plan</span>
            <span className={styles.headerMeta}>All programs · read-only snapshot</span>
          </div>
          <span className={styles.readOnlyBadge}>
            <Icon name="solar:lock-keyhole-minimalistic-linear" size={14} color="var(--neutral-300)" />
            Read only
          </span>
          <span className={styles.headerDivider} />
          <CloseButton onClick={onClose} />
        </div>
      )}

      {loading && !loadedFor ? (
        <TableSkeleton rows={6} />
      ) : isEmpty ? (
        <RingEmptyState icon="solar:hand-heart-linear" label="No Care Plans Yet" />
      ) : (
        <div className={styles.body}>
          {conditions.length > 0 && (
            <div className={styles.chips}>
              {conditions.map(c => <Badge key={c} tone="grey" size="S" label={c} />)}
            </div>
          )}

          <div className={styles.section}>
            <SectionHead
              title="Goals"
              count={filteredGoals.length}
              open={openSections.goals}
              onToggle={() => toggleSection('goals')}
            />
            {openSections.goals && (
              <GoalsTable
                rows={filteredGoals}
                onOpen={openGoal}
                onPriorityMenu={setPriorityMenu}
                onStatusMenu={setStatusMenu}
              />
            )}
          </div>

          <div className={styles.section}>
            <SectionHead
              title="Interventions"
              count={filteredInterventions.length}
              open={openSections.interventions}
              onToggle={() => toggleSection('interventions')}
            />
            {openSections.interventions && (
              <InterventionsTable
                rows={filteredInterventions}
                onOpen={openIntervention}
                onPriorityMenu={setPriorityMenu}
                onStatusMenu={setStatusMenu}
                onAssigneeChange={handleInterventionAssignee}
                patients={patients}
                platformUsers={platformUsers}
              />
            )}
          </div>

          <div className={styles.section}>
            <SectionHead
              title="Barriers"
              count={filteredBarriers.length}
              open={openSections.barriers}
              onToggle={() => toggleSection('barriers')}
            />
            {openSections.barriers && (
              <BarriersTable
                rows={filteredBarriers}
                onOpen={openBarrier}
                onStatusMenu={setStatusMenu}
              />
            )}
          </div>
        </div>
      )}

      {priorityMenu && (
        <MenuPopover
          anchorRect={priorityMenu.rect}
          align="left"
          width={160}
          ariaLabel="Change priority"
          items={PRIORITIES.map(p => ({
            key: p,
            label: p.charAt(0).toUpperCase() + p.slice(1),
            iconElement: <PriorityIcon priority={p} size={16} />,
          }))}
          onSelect={changePriority}
          onClose={() => setPriorityMenu(null)}
        />
      )}

      {statusMenu && (
        <MenuPopover
          anchorRect={statusMenu.rect}
          align="left"
          width={160}
          ariaLabel="Change status"
          items={GBI_STATUSES.map(s => ({ key: s, label: s }))}
          onSelect={changeStatus}
          onClose={() => setStatusMenu(null)}
        />
      )}

      {previewGoal && (
        <GoalPreviewDrawer
          goal={previewGoal.goal}
          patientId={patientId}
          program={previewGoal.program}
          onClose={() => setPreviewGoal(null)}
        />
      )}
      {previewIntervention && (
        <InterventionPreviewDrawer
          intervention={previewIntervention.intervention}
          patientId={patientId}
          program={previewIntervention.program}
          onClose={() => setPreviewIntervention(null)}
          consolidated
        />
      )}
      {previewBarrier && (
        <BarrierDetailDrawer
          barrier={previewBarrier.barrier}
          patientId={patientId}
          program={previewBarrier.program}
          onClose={() => setPreviewBarrier(null)}
          consolidated
        />
      )}
    </div>
  );
}
