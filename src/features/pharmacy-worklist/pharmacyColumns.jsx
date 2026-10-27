import { Icon } from '../../components/Icon/Icon';
import { DownChevronIcon } from '../../components/Icon/DownChevronIcon';
import { AssigneeChange } from '../../components/AssigneeChange/AssigneeChange';
import { Badge } from '../../components/Badge/Badge';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { PriorityIcon } from '../../components/PriorityIcon/PriorityIcon';
import { GAP_STATUS_TONE, MANUAL_GAP_STATUSES, MEASURE_NAMES, PRIORITY_LEVELS, isActiveGap, daysFromToday } from './pharmacyWorklist.utils';
import { fillsToStayCompliant } from './fillEvents';
import { OutreachStatusCell } from '../../components/OutreachStatusCell/OutreachStatusCell';
import { ClaimReconCell, Dash, DateWithDays, DrugsCount, FailDateValue, NextFillDueValue, OpenCareGaps, PdcValue, PriorYearPdc, ProgressCell, SavabilityBadge, SubStatus } from './PharmacyCells';
import styles from './PharmacyWorklistRow.module.css';


const isOverdue = (mdy) => { const d = daysFromToday(mdy); return d != null && d < 0; };
const PRIOR_YEAR = new Date().getFullYear() - 1;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const numberOrDash = (n, suffix = '') => (n == null ? <Dash /> : <span className={styles.cellText}>{n}{suffix}</span>);

// Gap-level columns stack one item per visible pharmacy gap, HEDIS style
// (the row collapses to 2 with "View More N"); the last one draws the divider
// between per-gap and per-member columns.
const gapTd = (last) => (m, ctx) => [
  styles.tdGap,
  ctx.visibleGaps.length === 1 ? styles.tdGapCenter : '',
  last ? styles.tdGapDivide : '',
].filter(Boolean).join(' ');

// `footer` fills the row under the gaps when some are collapsed; the other
// gap columns leave it empty so every column stays aligned.
const perGap = (render, footer) => (m, ctx) => (
  <div className={styles.gapItems}>
    {ctx.visibleGaps.map(g => <div key={g.code} className={styles.gapItem}>{render(g, m, ctx)}</div>)}
    {ctx.extraCount > 0 && <div className={styles.gapFooter}>{footer?.(ctx)}</div>}
  </div>
);

const viewMoreButton = (ctx) => (
  <button type="button" className={styles.viewMoreBtn} onClick={ctx.toggleExpanded} aria-expanded={ctx.expanded}>
    {ctx.expanded ? 'View Less' : `View More ${ctx.extraCount}`}
    <DownChevronIcon size={12} color="currentColor" className={`${styles.chevron} ${ctx.expanded ? styles.chevronUp : ''}`} />
  </button>
);

/**
 * Middle-column defs: priority, then the per-gap block (one stacked item per
 * gap), then member-level columns. `optional: true` columns start hidden; the
 * Actions header picker shows them.
 */
export const PHARMACY_MIDDLE_COLUMNS = [
  {
    key: 'priority', label: 'P', sortKey: 'priorityRank', sortType: 'number', stopRowClickPropagation: true,
    // Divider before the per-gap block, like the one after it.
    getTdClassName: () => `${styles.td} ${styles.tdGapDivide}`,
    renderCell: (m, ctx) => {
      const level = PRIORITY_LEVELS.find(l => l.value === m.priority);
      const fromPlan = m.sourcePriority && !m.priorityOverride && m.sourcePriority !== m.priority ? ` (plan file: ${m.sourcePriority})` : '';
      return (
        <Tooltip label={`${level?.label || m.priority} priority${fromPlan}`} placement="bottom">
          <button
            type="button"
            className={styles.priorityButton}
            aria-label={`Priority ${level?.label || m.priority}, change`}
            onClick={(e) => ctx.openPriorityMenu(e.currentTarget.getBoundingClientRect())}
          >
            <PriorityIcon priority={level?.icon || 'none'} size={16} />
          </button>
        </Tooltip>
      );
    },
  },
  {
    key: 'gaps', label: 'Pharmacy Gaps', getTdClassName: gapTd(false), stopRowClickPropagation: true,
    renderCell: perGap((g, m, ctx) => (
      <Tooltip label={MEASURE_NAMES[g.code]} placement="bottom">
        <button type="button" className={styles.gapBadgeButton} onClick={() => ctx.openGap(g.code)} aria-label={`Open ${g.code} (${MEASURE_NAMES[g.code]})`}>
          <Badge size="M" variant="compliance-na" label={g.code} />
        </button>
      </Tooltip>
    ), viewMoreButton),
  },
  {
    key: 'drugs', label: 'Drugs', getTdClassName: gapTd(false),
    renderCell: perGap((g) => <DrugsCount meds={g.medications || []} />),
  },
  {
    key: 'gapStatus', label: 'Gap Status', getTdClassName: gapTd(false), stopRowClickPropagation: true,
    // The team can only move a gap between Open and In Progress; every other
    // status is Fold's, so its badge only explains itself.
    renderCell: perGap((g, m, ctx) => (
      <span className={styles.stack}>
        {MANUAL_GAP_STATUSES.includes(g.status.gap) ? (
          <button
            type="button"
            className={styles.badgeBtn}
            onClick={(e) => ctx.openGapStatusMenu(g.code, e.currentTarget.getBoundingClientRect())}
            aria-haspopup="menu"
            aria-label={`Change ${g.code} status`}
          >
            <Badge size="S" tone={GAP_STATUS_TONE[g.status.gap] || 'grey'} label={g.status.gap} trailingIconElement={<DownChevronIcon size={12} color="currentColor" />} />
          </button>
        ) : (
          <Tooltip label={g.status.label ? 'Set by Fold' : `Set by Fold: ${g.status.detail}`} placement="bottom">
            <span><Badge size="S" tone={GAP_STATUS_TONE[g.status.gap] || 'grey'} label={g.status.gap} /></span>
          </Tooltip>
        )}
        <Tooltip label={g.status.detail} placement="bottom">
          {g.status.medId ? (
            <button type="button" className={styles.subStatusBtn} onClick={() => ctx.openClaimRework(g.code, g.status.medId)}>
              <SubStatus label={g.status.label} suffix={g.status.manual ? 'Set manually' : null} />
            </button>
          ) : (
            <span><SubStatus label={g.status.label} suffix={g.status.manual ? 'Set manually' : null} /></span>
          )}
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
    renderCell: perGap((g) => <PdcValue pdc={g.pdc} open={isActiveGap(g.status)} source={g.pdcSource} medications={g.medications} />),
  },
  {
    key: 'failDate', label: 'Fail Date (Absolute)', sortKey: 'failDateSort', sortType: 'date', getTdClassName: gapTd(false),
    renderCell: perGap((g) => <FailDateValue gap={g} />),
  },
  {
    key: 'nextFillDue', label: 'Next Fill Due', sortKey: 'nextFillDueSort', sortType: 'date', getTdClassName: gapTd(false),
    renderCell: perGap((g) => <NextFillDueValue gap={g} />),
  },
  {
    key: 'claimRecon', label: 'Claim Reconciliation', sortKey: 'reconRank', sortType: 'number', getTdClassName: gapTd(false), stopRowClickPropagation: true,
    renderCell: perGap((g, m, ctx) => (g.recon
      ? <ClaimReconCell recon={g.recon} followUpTask={g.claimFollowUpTask} onOpenClaims={() => ctx.openClaimRework(g.code, g.recon.medId)} />
      : <Dash />)),
  },
  // Proposed (Richard), to confirm with Monique: hidden until then.
  {
    key: 'fillsRemaining', label: 'Fills to Stay Compliant', optional: true, getTdClassName: gapTd(false),
    renderCell: perGap((g) => {
      const n = fillsToStayCompliant(g);
      return n == null ? <Dash /> : (
        <Tooltip label="Fills of the usual days supply still needed to reach 80% PDC by Dec 31" placement="bottom">
          <span className={styles.cellText}>{n === 0 ? 'None needed' : `${n} fill${n === 1 ? '' : 's'}`}</span>
        </Tooltip>
      );
    }),
  },
  // Proposed in the status model spec; hidden until confirmed.
  {
    key: 'savability', label: 'Savability', optional: true, getTdClassName: gapTd(false),
    renderCell: perGap((g) => <SavabilityBadge value={g.savability} />),
  },
  {
    key: 'allowableGapDays', label: 'Allowable Gap Days Remaining', optional: true, getTdClassName: gapTd(false),
    renderCell: perGap((g) => (g.allowableGapDays == null ? <Dash /> : (
      <Tooltip label="Days the member can still go without medication and reach 80% PDC" placement="bottom">
        <span className={`${styles.cellText} ${g.allowableGapDays <= 0 ? styles.toneError : ''}`}>{plural(g.allowableGapDays, 'day')}</span>
      </Tooltip>
    ))),
  },
  {
    key: 'daysMissed', label: 'Days Missed', optional: true, getTdClassName: gapTd(false),
    renderCell: perGap((g) => numberOrDash(g.daysMissed)),
  },
  {
    key: 'noRefillPdc', label: 'Projected PDC (No Refill)', optional: true, getTdClassName: gapTd(false),
    renderCell: perGap((g) => numberOrDash(g.noRefillPdc, '%')),
  },
  {
    key: 'mpr', label: 'MPR', optional: true, getTdClassName: gapTd(false),
    renderCell: perGap((g) => numberOrDash(g.mpr, '%')),
  },
  {
    key: 'attempts', label: 'Attempts', optional: true, getTdClassName: gapTd(false),
    renderCell: perGap((g) => numberOrDash(g.attempts)),
  },
  {
    key: 'priorYear', label: 'Prior Year PDC', getTdClassName: gapTd(true),
    renderCell: perGap((g) => <PriorYearPdc years={g.priorYearPdc} nonCompliant={g.priorYearNonCompliant} year={PRIOR_YEAR} />),
  },
  {
    key: 'progress', label: 'Progress', sortKey: 'progressRank', sortType: 'number',
    renderCell: (m) => <ProgressCell progress={m.progress} />,
  },
  {
    key: 'otherCareGaps', label: 'Open Care Gaps', sortKey: 'otherCareGapsCount', sortType: 'number', stopRowClickPropagation: true,
    renderCell: (m, ctx) => <OpenCareGaps gaps={m.otherCareGaps} onOpen={ctx.openCareGap} />,
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
    key: 'leadNote', label: 'Internal Note',
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
    renderCell: (m) => {
      const codes = (status) => m.gaps.filter(g => g.status.gap === status).map(g => g.code).join(', ');
      const excluded = codes('Excluded');
      const safe = codes('Met for Year');
      if (!excluded && !safe) return <Dash />;
      return (
        <span className={styles.stack}>
          {excluded && <Badge size="S" tone="grey" label={`Excluded · ${excluded}`} />}
          {safe && <Badge size="S" tone="info" label={`Safe for year · ${safe}`} />}
        </span>
      );
    },
  },
  { key: 'projectedStatus', label: 'Projected Status', optional: true, renderCell: (m) => (m.urgent?.projectedStatus ? <span className={styles.cellText}>{m.urgent.projectedStatus}</span> : <Dash />) },
  {
    key: 'drugInteraction', label: 'Drug Interaction', optional: true,
    renderCell: (m) => ((m.measures || []).some(x => x.drugInteraction)
      ? <Badge size="S" tone="error" icon="solar:danger-triangle-linear" label="Flagged" />
      : <Dash />),
  },
  {
    key: 'lastOutreach', label: 'Last Outreach', optional: true, sortKey: 'outreachSort', sortType: 'date',
    renderCell: (m) => (m.outreach ? (
      <span className={styles.stack}>
        <span className={styles.dateText}>{m.outreach.date}</span>
        <span className={styles.subText}>{[m.outreach.contact, m.outreach.outcome].filter(Boolean).join(': ')}</span>
      </span>
    ) : <Dash />),
  },
  {
    key: 'eligibility', label: 'Eligibility Status', optional: true,
    renderCell: (m) => (
      <span className={styles.stack}>
        <span className={`${styles.cellText} ${m.eligibilityStatus === 'Termed' ? styles.toneError : ''}`}>{m.eligibilityStatus || 'Active'}</span>
        {m.termDate && <span className={styles.subText}>{m.termDate}</span>}
      </span>
    ),
  },
];

export const PHARMACY_HIDDEN_BY_DEFAULT = PHARMACY_MIDDLE_COLUMNS.filter(c => c.optional).map(c => c.key);
