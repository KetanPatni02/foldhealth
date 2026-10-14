import { Icon } from '../../components/Icon/Icon';
import { DownChevronIcon } from '../../components/Icon/DownChevronIcon';
import { AssigneeChange } from '../../components/AssigneeChange/AssigneeChange';
import { Badge } from '../../components/Badge/Badge';
import { MenuPopover } from '../../components/MenuPopover/MenuPopover';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { GAP_STATUSES, GAP_STATUS_TONE, daysFromToday, measureDrugs } from './pharmacyWorklist.utils';
import { OutreachStatusCell } from '../../components/OutreachStatusCell/OutreachStatusCell';
import { ClaimReconCell, Dash, DateWithDays, MeasureChips, PdcValue, SubStatus } from './PharmacyCells';
import styles from './PharmacyWorklistRow.module.css';

const AUTO_STATUS = '__auto';
const statusItems = (m) => [
  ...GAP_STATUSES.map(s => ({ key: s, label: s, selected: s === m.status })),
  ...(m.statusManual ? [{ key: AUTO_STATUS, label: 'Use measure roll-up' }] : []),
];

// Only P1 carries color; P2 / P3 stay neutral so red keeps meaning "act now".
const PRIORITY_TONE = { P1: 'error', P2: 'grey', P3: 'white' };

const isOverdue = (mdy) => { const d = daysFromToday(mdy); return d != null && d < 0; };

/**
 * Middle-column defs, in triage order: what to act on first (priority,
 * status, the focus measure's PDC and dates) sits next to Members.
 * `optional: true` columns start hidden; the Actions header picker shows them.
 */
export const PHARMACY_MIDDLE_COLUMNS = [
  {
    key: 'priority', label: 'Priority', sortKey: 'priority', sortType: 'alpha',
    renderCell: (m) => <Badge size="S" tone={PRIORITY_TONE[m.priority]} label={m.priority} />,
  },
  {
    key: 'status', label: 'Status', sortKey: 'status', sortType: 'alpha', stopRowClickPropagation: true,
    // Gap status (editable) with the focus measure's sub-status below. A
    // hand-set status is marked, and the menu can hand it back to the roll-up.
    renderCell: (m, ctx) => (
      <span className={styles.stack}>
        <span className={styles.relative}>
          <button
            ref={ctx.statusBtnRef}
            type="button"
            className={styles.badgeBtn}
            onClick={() => ctx.setShowStatusMenu(v => !v)}
            aria-haspopup="menu"
            aria-expanded={ctx.showStatusMenu}
          >
            <Badge size="M" tone={GAP_STATUS_TONE[m.status] || 'grey'} label={m.status} trailingIconElement={<DownChevronIcon size={13} color="currentColor" />} />
          </button>
          {ctx.showStatusMenu && (
            <MenuPopover
              anchorRef={ctx.statusBtnRef}
              items={statusItems(m)}
              onSelect={(key) => {
                if (key === AUTO_STATUS) ctx.clearPharmacyStatusOverride(m.id);
                else ctx.setPharmacyStatus(m.id, key);
                ctx.setShowStatusMenu(false);
              }}
              onClose={() => ctx.setShowStatusMenu(false)}
              width={240}
              ariaLabel="Change status"
            />
          )}
        </span>
        <SubStatus
          label={m.subStatus?.label}
          suffix={[m.measureCodes.length > 1 ? m.subStatus?.code : null, m.statusManual ? 'Set manually' : null].filter(Boolean).join(' · ') || null}
        />
      </span>
    ),
  },
  { key: 'measures', label: 'Measures', renderCell: (m) => <MeasureChips codes={m.measureCodes} statuses={m.measureStatuses} /> },
  {
    key: 'pdc', label: 'PDC', sortKey: 'pdc', sortType: 'number',
    renderCell: (m) => <PdcValue pdc={m.pdc} code={m.measureCodes.length > 1 ? m.urgent?.code : null} open={m.urgentOpen} />,
  },
  {
    key: 'failDate', label: 'Fail Date', sortKey: 'failDateSort', sortType: 'date',
    renderCell: (m) => {
      const d = daysFromToday(m.failDate);
      return <DateWithDays date={m.failDate} alert={m.urgentOpen && d != null && d <= 14} />;
    },
  },
  {
    key: 'nextFillDue', label: 'Next Fill Due', sortKey: 'nextFillDueSort', sortType: 'date',
    renderCell: (m) => <DateWithDays date={m.nextFillDue} alert={m.urgentOpen && isOverdue(m.nextFillDue)} />,
  },
  {
    key: 'claimRecon', label: 'Claim Reconciliation', sortKey: 'reconRank', sortType: 'number',
    renderCell: (m) => (m.recon ? <ClaimReconCell recon={m.recon} showCode={m.measureCodes.length > 1} /> : <Dash />),
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
    key: 'drugs', label: 'Drug(s)',
    renderCell: (m) => (
      <span className={styles.stack}>
        {(m.measures || []).map(x => (
          <span key={x.code} className={styles.cellText}><span className={styles.subText}>{x.code}</span> {measureDrugs(x)}</span>
        ))}
      </span>
    ),
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
