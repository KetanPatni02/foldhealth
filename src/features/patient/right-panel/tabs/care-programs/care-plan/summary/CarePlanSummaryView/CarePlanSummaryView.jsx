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
import { useTableSort } from '../../../../../../../../components/HeaderCell/useTableSort';
import { useAppStore } from '../../../../../../../../store/useAppStore';
import { buildCarePlanSnapshot, filterCarePlanSnapshot } from '../carePlanSnapshot';
import {
  GbiNameCell,
  GbiProgressCell,
  GBI_COL_WIDTH,
  GBI_STATUS_TONE,
  GOAL_COLUMNS,
  INTERVENTION_COLUMNS,
  BARRIER_COLUMNS,
} from '../../tables/carePlanTableShared';
import { enrichGoalRows, enrichInterventionRows } from '../../tables/carePlanTableSort';
import sharedRow from '../../tables/carePlanTables.module.css';
import styles from './CarePlanSummaryView.module.css';

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

// Column sets — reuse the shared GBI columns so the header labels,
// widths, and sort types match the per-plan tables exactly. Drop the
// `actions` column (nothing to edit on this read-only surface) and
// inject the Care Plan column right before Status.
const SUMMARY_GOAL_COLUMNS = insertBefore(stripActions(GOAL_COLUMNS), 'status', CARE_PLAN_COLUMN);
const SUMMARY_INTERVENTION_COLUMNS = insertBefore(stripActions(INTERVENTION_COLUMNS), 'status', CARE_PLAN_COLUMN);
const SUMMARY_BARRIER_COLUMNS = insertBefore(stripActions(BARRIER_COLUMNS), 'status', CARE_PLAN_COLUMN);

// Read-only status pill — the per-plan tables use GbiStatusButton so the
// user can flip status inline; here we render a static Badge instead so
// the row keeps the same visual weight without an editable affordance.
function ReadOnlyStatusBadge({ value }) {
  if (!value) return <span className={styles.statusMuted}>—</span>;
  return <Badge tone={GBI_STATUS_TONE[value] || 'grey'} size="S" label={value} />;
}

function GoalsTable({ rows, onOpen }) {
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
              <PriorityIcon priority={g.priority} size={16} />
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
              <ReadOnlyStatusBadge value={g.status} />
            </td>
          </tr>
        )}
      />
    </div>
  );
}

function InterventionsTable({ rows, onOpen, patients }) {
  const sortable = useMemo(() => enrichInterventionRows(rows), [rows]);
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(sortable, 'title', 'asc');
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
          const isMember = (patients || []).some(p => p.name === i.assignee?.name);
          const variant = isMember ? 'patient' : 'staff';
          return (
            <tr
              key={`${i.programCode}-${i.id}`}
              className={`${sharedRow.row} ${sharedRow.rowClickable} ${sharedRow.gbiRow}`}
              onClick={() => onOpen(i)}
            >
              <td className={sharedRow.priorityTd} onClick={e => e.stopPropagation()}>
                <PriorityIcon priority={i.priority} size={16} />
              </td>
              <td className={sharedRow.titleTd}>
                <GbiNameCell
                  icon={i.icon}
                  title={i.title}
                  layout="inline"
                />
              </td>
              <td className={sharedRow.assigneeTd} onClick={e => e.stopPropagation()}>
                <span className={styles.assigneeInline}>
                  <Avatar variant={variant} size="S" initials={i.assignee?.initials || ''} />
                  <span className={styles.assigneeName}>{i.assignee?.name || 'Unassigned'}</span>
                </span>
              </td>
              <td className={sharedRow.adherenceTd} onClick={e => e.stopPropagation()}>
                <GbiProgressCell progress={i.adherence} />
              </td>
              <td className={sharedRow.assigneeTd} style={{ width: CARE_PLAN_COLUMN.width, minWidth: CARE_PLAN_COLUMN.width, maxWidth: CARE_PLAN_COLUMN.width }} onClick={e => e.stopPropagation()}>
                <Badge tone="grey" size="S" label={i.programCode} />
              </td>
              <td className={sharedRow.statusTd} onClick={e => e.stopPropagation()}>
                <ReadOnlyStatusBadge value={i.status} />
              </td>
            </tr>
          );
        }}
      />
    </div>
  );
}

function BarriersTable({ rows, onOpen }) {
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(rows, 'title', 'asc');
  return (
    <div className={sharedRow.tableWrap}>
      <WorklistShell
        embedded
        embeddedNoScroll
        header={null}
        hideBulkBar
        columns={SUMMARY_BARRIER_COLUMNS}
        rows={sorted}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={requestSort}
        minTableWidth={0}
        emptyState={<div className={styles.emptyRow}>No barriers match.</div>}
        renderRow={(b) => (
          <tr
            key={`${b.programCode}-${b.id}`}
            className={`${sharedRow.row} ${sharedRow.rowClickable} ${sharedRow.gbiRow}`}
            onClick={() => onOpen(b)}
          >
            <td className={sharedRow.priorityTd} onClick={e => e.stopPropagation()}>
              <PriorityIcon priority={b.priority} size={16} />
            </td>
            <td className={sharedRow.titleTd}>
              <GbiNameCell
                icon={b.icon || 'solar:shield-warning-linear'}
                title={b.title}
                meta={b.description || null}
                layout="stacked"
              />
            </td>
            <td className={sharedRow.assigneeTd} style={{ width: CARE_PLAN_COLUMN.width, minWidth: CARE_PLAN_COLUMN.width, maxWidth: CARE_PLAN_COLUMN.width }} onClick={e => e.stopPropagation()}>
              <Badge tone="grey" size="S" label={b.programCode} />
            </td>
            <td className={sharedRow.statusTd} onClick={e => e.stopPropagation()}>
              <ReadOnlyStatusBadge value={b.status} />
            </td>
          </tr>
        )}
      />
    </div>
  );
}

// Read-only, patient-level snapshot of every care plan across all of a
// patient's programs (roadmap #1 / E2). Clicking a row hands off to the owning
// program's Care Plan step for edits.
export function CarePlanSummaryView({ patientId, programs, onClose, onOpenProgramStep, searchText = '', programFilter = [], embedded = false }) {
  const fetchAllPatientCarePlans = useAppStore(s => s.fetchAllPatientCarePlans);
  const loading = useAppStore(s => s.patientCarePlanAllLoading[patientId]);
  const loadedFor = useAppStore(s => s.patientCarePlanAllLoadedFor[patientId]);
  const patientCarePlans = useAppStore(s => s.patientCarePlans);
  const patients = useAppStore(s => s.patients) || [];

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

  // Collapsible sections — each defaults to open, matching the per-plan
  // CarePlanView GBI section behavior.
  const [openSections, setOpenSections] = useState({ goals: true, interventions: true, barriers: true });
  const toggleSection = (k) => setOpenSections(s => ({ ...s, [k]: !s[k] }));

  const handleOpen = (row) => onOpenProgramStep(row.program);

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
            {openSections.goals && <GoalsTable rows={filteredGoals} onOpen={handleOpen} />}
          </div>

          <div className={styles.section}>
            <SectionHead
              title="Interventions"
              count={filteredInterventions.length}
              open={openSections.interventions}
              onToggle={() => toggleSection('interventions')}
            />
            {openSections.interventions && <InterventionsTable rows={filteredInterventions} onOpen={handleOpen} patients={patients} />}
          </div>

          <div className={styles.section}>
            <SectionHead
              title="Barriers"
              count={filteredBarriers.length}
              open={openSections.barriers}
              onToggle={() => toggleSection('barriers')}
            />
            {openSections.barriers && <BarriersTable rows={filteredBarriers} onOpen={handleOpen} />}
          </div>
        </div>
      )}
    </div>
  );
}
