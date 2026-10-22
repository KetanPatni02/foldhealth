import { Icon } from '../../components/Icon/Icon';
import { AssigneeChange } from '../../components/AssigneeChange/AssigneeChange';
import { Badge } from '../../components/Badge/Badge';
import { DownChevronIcon } from '../../components/Icon/DownChevronIcon';
import { MenuPopover } from '../../components/MenuPopover/MenuPopover';
import { CmpOutreachCell } from './CmpOutreachCell';
import styles from './CmpWorklistRow.module.css';

const STATUS_VARIANT = {
  New: 'awv-new',
  Open: 'awv-open',
  Attempted: 'awv-attempted',
  Engaged: 'awv-engaged',
  'Engaged - Requires Follow Up': 'awv-engaged-followup',
  'Unable to Reach': 'awv-unable',
};
const STATUS_MENU = Object.keys(STATUS_VARIANT).map(key => ({ key, label: key }));

const RISK_VARIANT = { Low: 'lace-low', Medium: 'lace-medium', High: 'lace-high' };

const CARE_PLAN_LOOK = {
  Signed: { className: styles.carePlanSigned, icon: 'solar:check-circle-linear' },
  Draft: { className: styles.carePlanDraft, icon: 'solar:pen-2-linear' },
};

const DAY_MS = 86400000;

// "Overdue: 3D" / "Due Today" / "Due in 5D" for an MM/DD/YYYY date.
function dueInfo(mdy) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(mdy || '');
  if (!m) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(+m[3], +m[1] - 1, +m[2]) - today) / DAY_MS);
  if (days < 0) return { label: `Overdue: ${-days}D`, className: styles.dueOverdue };
  if (days === 0) return { label: 'Due Today', className: styles.dueSoon };
  return { label: `Due in ${days}D`, className: days <= 7 ? styles.dueSoon : styles.dueLater };
}

/**
 * Middle-column defs for CMP, same shape as JSA_MIDDLE_COLUMNS: rows render
 * these in order and skip the ones hidden in Show Columns.
 *
 * ctx shape: { statusAnchor, setStatusAnchor, updateCmpMemberStatus, showToast }
 */
export const CMP_MIDDLE_COLUMNS = [
  {
    key: 'subProgram',
    label: 'Sub Program',
    sortKey: 'subProgram',
    width: 210,
    renderCell: (member) => member.subProgram || '—',
  },
  {
    key: 'progSubStatus',
    label: 'Program Sub Status',
    sortKey: 'progSubStatus',
    width: 200,
    renderCell: (member, ctx) => (
      <>
        <button
          type="button"
          className={styles.statusBtn}
          onClick={(e) => { e.stopPropagation(); ctx.setStatusAnchor(e.currentTarget); }}
        >
          <Badge
            size="M"
            variant={STATUS_VARIANT[member.progSubStatus] || 'awv-new'}
            label={member.progSubStatus}
            trailingIconElement={<DownChevronIcon size={12} color="currentColor" />}
          />
        </button>
        {ctx.statusAnchor && (
          <MenuPopover
            anchorRef={{ current: ctx.statusAnchor }}
            width="auto"
            items={STATUS_MENU}
            onSelect={(key) => ctx.updateCmpMemberStatus(member.id, key)}
            onClose={() => ctx.setStatusAnchor(null)}
          />
        )}
      </>
    ),
  },
  {
    key: 'carePlanStatus',
    label: 'Care Plan Status',
    sortKey: 'carePlanStatus',
    width: 160,
    renderCell: (member) => {
      const look = CARE_PLAN_LOOK[member.carePlanStatus];
      return (
        <span className={`${styles.carePlanStatus} ${look?.className || styles.carePlanNone}`}>
          {look && <Icon name={look.icon} size={14} color="currentColor" />}
          {member.carePlanStatus || '—'}
        </span>
      );
    },
  },
  {
    key: 'nextActionDue',
    label: 'Next Action Due',
    sortKey: 'nextActionDueSort',
    width: 150,
    renderCell: (member) => {
      const due = dueInfo(member.nextActionDue);
      if (!due) return '—';
      return (
        <div className={styles.dueCell}>
          <div className={styles.dueDate}>{member.nextActionDue}</div>
          <div className={`${styles.dueLabel} ${due.className}`}>
            <Icon name="solar:clock-circle-linear" size={11} color="currentColor" />
            {due.label}
          </div>
        </div>
      );
    },
  },
  {
    key: 'outreach',
    label: 'Outreach',
    sortKey: 'outreach',
    width: 150,
    renderCell: (member) => <CmpOutreachCell member={member} />,
  },
  {
    key: 'assignee',
    label: 'Assignee',
    sortKey: 'assignee',
    width: 170,
    renderCell: (member, ctx) => (
      member.assignee ? (
        <AssigneeChange
          name={member.assignee}
          initials={member.assigneeIn}
          showRole={false}
          onClick={() => ctx.showToast(`Changing the assignee for ${member.name} is coming soon`)}
        />
      ) : (
        <AssigneeChange
          unassigned
          showRole={false}
          onClick={() => ctx.showToast(`Assigning an owner for ${member.name} is coming soon`)}
        />
      )
    ),
  },
  {
    key: 'programStartDate',
    label: 'Program Start Date',
    sortKey: 'programStartSort',
    width: 160,
    renderCell: (member) => member.programStartDate || '—',
  },
  {
    key: 'programDueDate',
    label: 'Program Due Date',
    sortKey: 'programDueSort',
    width: 160,
    renderCell: (member) => member.programDueDate || '—',
  },
  {
    key: 'ri',
    label: 'Risk IQ',
    sortKey: 'ri',
    width: 110,
    renderCell: (member) => (
      member.ri ? <Badge size="M" variant={RISK_VARIANT[member.ri] || 'lace-low'} label={member.ri} /> : '—'
    ),
  },
  {
    key: 'task',
    label: 'Tasks',
    sortKey: 'task',
    width: 90,
    align: 'center',
    renderCell: (member) => (
      member.task > 0
        ? <span className={styles.taskBadge}>{member.task}</span>
        : <span className={styles.taskBadgeMuted}>0</span>
    ),
  },
];
