import { Icon } from '../../components/Icon/Icon';
import { DownChevronIcon } from '../../components/Icon/DownChevronIcon';
import { AssigneeChange } from '../../components/AssigneeChange/AssigneeChange';
import { Badge } from '../../components/Badge/Badge';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { GAP_STATUS_TONE, MEASURE_NAMES, OPEN_GAPS, daysFromToday } from './pharmacyWorklist.utils';
import { OutreachStatusCell } from '../../components/OutreachStatusCell/OutreachStatusCell';
import { ClaimReconCell, Dash, DateOnly, DateWithDays, DrugsCount, OtherGapsCount, PdcValue, ProgressCell, SubStatus } from './PharmacyCells';
import styles from './PharmacyWorklistRow.module.css';

// Only top priority carries color; the rest stay neutral so red keeps meaning "act now".
const PRIORITY_TONE = { P1: 'error' };

const isOverdue = (mdy) => { const d = daysFromToday(mdy); return d != null && d < 0; };

// Gap-level columns stack one item per pharmacy gap, HEDIS style; the last
// one draws the divider between per-gap and per-member columns.
const gapTd = (last) => (m) => [
  styles.tdGap,
  m.gaps.length === 1 ? styles.tdGapCenter : '',
  last ? styles.tdGapDivide : '',
].filter(Boolean).join(' ');

const perGap = (render) => (m, ctx) => (
  <div className={styles.gapItems}>
    {m.gaps.map(g => <div key={g.code} className={styles.gapItem}>{render(g, m, ctx)}</div>)}
  </div>
);

/**
 * Middle-column defs: priority, then the per-gap block (one stacked item per
 * gap), then member-level columns. `optional: true` columns start hidden; the
 * Actions header picker shows them.
 */
export const PHARMACY_MIDDLE_COLUMNS = [
  {
    key: 'priority', label: 'Priority', sortKey: 'priorityRank', sortType: 'number',
    renderCell: (m) => (
      <Tooltip label={m.sourcePriority && m.sourcePriority !== m.priority ? `Plan file: ${m.sourcePriority}` : ''} placement="bottom">
        <span><Badge size="S" tone={PRIORITY_TONE[m.priority] || 'grey'} label={m.priority} /></span>
      </Tooltip>
    ),
  },
  {
    key: 'gaps', label: 'Pharmacy Gaps', getTdClassName: gapTd(false), stopRowClickPropagation: true,
    renderCell: perGap((g, m, ctx) => (
      <Tooltip label={MEASURE_NAMES[g.code]} placement="bottom">
        <button type="button" className={styles.gapBadgeButton} onClick={() => ctx.openGap(g.code)} aria-label={`Open ${g.code} (${MEASURE_NAMES[g.code]})`}>
          <Badge size="M" variant="compliance-na" label={g.code} />
        </button>
      </Tooltip>
    )),
  },
  {
    key: 'drugs', label: 'Drugs', getTdClassName: gapTd(false),
    renderCell: perGap((g) => <DrugsCount meds={g.medications || []} />),
  },
  {
    key: 'gapStatus', label: 'Gap Status', getTdClassName: gapTd(false), stopRowClickPropagation: true,
    renderCell: perGap((g, m, ctx) => (
      <span className={styles.stack}>
        <button
          type="button"
          className={styles.badgeBtn}
          onClick={(e) => ctx.openGapStatusMenu(g.code, e.currentTarget.getBoundingClientRect())}
          aria-haspopup="menu"
          aria-label={`Change ${g.code} status`}
        >
          <Badge size="S" tone={GAP_STATUS_TONE[g.status.gap] || 'grey'} label={g.status.gap} trailingIconElement={<DownChevronIcon size={12} color="currentColor" />} />
        </button>
        <Tooltip label={g.status.detail} placement="bottom">
          <span><SubStatus label={g.status.label} suffix={g.status.manual ? 'Set manually' : null} /></span>
        </Tooltip>
      </span>
    )),
  },
  {
    key: 'startDate', label: 'Start Date', getTdClassName: gapTd(false),
    renderCell: perGap((g) => (g.startDate ? <span className={styles.dateText}>{g.startDate}</span> : <Dash />)),
  },
  {
    key: 'pdc', label: 'PDC', sortKey: 'pdc', sortType: 'number', getTdClassName: gapTd(false),
    renderCell: perGap((g) => <PdcValue pdc={g.pdc} open={OPEN_GAPS.has(g.status.gap)} projectedFrom={g.pdcProjected != null ? g.pdcPlan : undefined} />),
  },
  {
    key: 'failDate', label: 'Fail Date', sortKey: 'failDateSort', sortType: 'date', getTdClassName: gapTd(false),
    renderCell: perGap((g) => {
      const d = daysFromToday(g.failDate);
      return <DateOnly date={g.failDate} alert={OPEN_GAPS.has(g.status.gap) && d != null && d <= 14} />;
    }),
  },
  {
    key: 'nextFillDue', label: 'Next Fill Due', sortKey: 'nextFillDueSort', sortType: 'date', getTdClassName: gapTd(false),
    renderCell: perGap((g) => <DateOnly date={g.nextFillDue} alert={OPEN_GAPS.has(g.status.gap) && isOverdue(g.nextFillDue)} />),
  },
  {
    key: 'claimRecon', label: 'Claim Reconciliation', sortKey: 'reconRank', sortType: 'number', getTdClassName: gapTd(true),
    renderCell: perGap((g) => (g.recon ? <ClaimReconCell recon={g.recon} followUpTask={g.claimFollowUpTask} /> : <Dash />)),
  },
  {
    key: 'progress', label: 'Progress', sortKey: 'progressRank', sortType: 'number',
    renderCell: (m) => <ProgressCell progress={m.progress} />,
  },
  {
    key: 'otherCareGaps', label: 'Other Care Gaps', sortKey: 'otherCareGapsCount', sortType: 'number',
    renderCell: (m) => <OtherGapsCount gaps={m.otherCareGaps} />,
  },
  {
    key: 'outreach', label: 'Outreach', sortKey: 'outreachSort', sortType: 'date',
    renderCell: (m) => (
      <OutreachStatusCell
        outreach={m.outreach}
        title={m.outreach ? `${m.outreach.contact}: ${m.outreach.outcome} · ${m.outreach.attempts} attempt${m.outreach.attempts === 1 ? '' : 's'}` : undefined}
      />
    ),
  },
  {
    key: 'followUpDue', label: 'Follow-up Due', sortKey: 'followUpDueSort', sortType: 'date',
    renderCell: (m) => <DateWithDays date={m.followUpDue} alert={isOverdue(m.followUpDue)} />,
  },
  {
    key: 'assignee', label: 'Assigned To', sortKey: 'assigneeName', sortType: 'alpha', stopRowClickPropagation: true,
    renderCell: (m, ctx) => (
      m.assigneeName ? (
        <AssigneeChange
          name={m.assigneeName}
          initials={m.assigneeInitials}
          showRole={false}
          users={ctx.eligibleUsers}
          onSelect={(u) => ctx.setPharmacyAssignee(m.id, u)}
          pickerTitle="Change assignee"
        />
      ) : (
        <AssigneeChange
          unassigned
          showRole={false}
          users={ctx.eligibleUsers}
          onSelect={(u) => ctx.setPharmacyAssignee(m.id, u)}
          pickerTitle="Assign coordinator"
        />
      )
    ),
  },
  {
    key: 'leadNote', label: 'Lead Note',
    renderCell: (m) => (m.leadNote ? (
      <Tooltip label={m.leadNote} placement="bottom">
        <span className={styles.leadNote}>
          <Icon name="solar:notes-linear" size={14} color="var(--neutral-300)" />
          <span className={styles.truncate}>{m.leadNote}</span>
        </span>
      </Tooltip>
    ) : <Dash />),
  },
  {
    key: 'priorYear', label: 'Prior-Year Non-Compliant',
    renderCell: (m) => <span className={styles.cellText}>{m.priorYearNonCompliant ? 'Yes' : 'No'}</span>,
  },
  // Optional, hidden by default.
  {
    key: 'healthPlan', label: 'Health Plan / IPA', optional: true, sortKey: 'healthPlan', sortType: 'alpha',
    renderCell: (m) => (
      <span className={styles.stack}>
        <span className={styles.cellText}>{m.healthPlan || '—'}</span>
        <span className={styles.subText}>{m.ipa || ''}</span>
      </span>
    ),
  },
  { key: 'language', label: 'Language', optional: true, renderCell: (m) => <span className={styles.cellText}>{(m.language || 'en').toUpperCase()}</span> },
  { key: 'bookOfBusiness', label: 'Book of Business', optional: true, sortKey: 'bookOfBusiness', sortType: 'alpha', renderCell: (m) => <span className={styles.cellText}>{m.bookOfBusiness || '—'}</span> },
  { key: 'barrier', label: 'Barrier', optional: true, renderCell: (m) => (m.barrier ? <span className={styles.cellText}>{m.barrier}</span> : <Dash />) },
  { key: 'daysInQueue', label: 'Days in Queue', optional: true, sortKey: 'daysInQueue', sortType: 'number', renderCell: (m) => <span className={styles.cellText}>{m.daysInQueue ?? '—'}</span> },
  {
    key: 'excluded', label: 'Excluded / Safe for Year', optional: true,
    renderCell: (m) => (m.urgent?.excluded ? <Badge size="S" tone="success" label="Excluded" /> : <Dash />),
  },
  { key: 'projectedStatus', label: 'Projected Status', optional: true, renderCell: (m) => (m.urgent?.projectedStatus ? <span className={styles.cellText}>{m.urgent.projectedStatus}</span> : <Dash />) },
  {
    key: 'drugInteraction', label: 'Drug Interaction', optional: true,
    renderCell: (m) => ((m.measures || []).some(x => x.drugInteraction)
      ? <Badge size="S" tone="error" icon="solar:danger-triangle-linear" label="Flagged" />
      : <Dash />),
  },
];

export const PHARMACY_HIDDEN_BY_DEFAULT = PHARMACY_MIDDLE_COLUMNS.filter(c => c.optional).map(c => c.key);
