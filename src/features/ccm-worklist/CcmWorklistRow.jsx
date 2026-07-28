import { useState } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { Checkbox } from '../../components/ui/checkbox';
import { useAppStore } from '../../store/useAppStore';
import { CcmBillingReviewDrawer } from './CcmBillingReviewDrawer';
import styles from './CcmWorklistRow.module.css';

const LANG_MAP = { en: 'English', es: 'Spanish', zh: 'Chinese', yue: 'Cantonese', ko: 'Korean', vi: 'Vietnamese', hi: 'Hindi', pa: 'Punjabi', ch: 'Chinese' };

// Status → shared Badge variant. Same variants TOC uses for its status
// column so the visual language stays consistent across all worklists.
const STATUS_VARIANT = {
  'New':             { variant: 'toc-new',       label: 'New',             icon: 'solar:star-bold' },
  'Engaged':         { variant: 'toc-engaged',   label: 'Engaged',         icon: 'solar:link-round-bold' },
  'Enrolled':        { variant: 'toc-enrolled',  label: 'Enrolled',        icon: 'solar:check-circle-bold' },
  'Unable to Reach': { variant: 'toc-attempted', label: 'Unable to Reach', icon: 'solar:history-bold' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_VARIANT[status] || STATUS_VARIANT['New'];
  return <Badge variant={cfg.variant} label={cfg.label} icon={cfg.icon} />;
}

const formatMins = (seconds) => {
  if (!seconds && seconds !== 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} Mins`;
};

export function CcmWorklistRow({ member, isSelected, onSelect }) {
  const openQuickView = useAppStore(s => s.openQuickView);
  const navigateToPatient = useAppStore(s => s.navigateToPatient);
  const showToast = useAppStore(s => s.showToast);
  const [billingOpen, setBillingOpen] = useState(false);

  const m = member;

  const openBilling = (e) => {
    e.stopPropagation();
    setBillingOpen(true);
  };

  const handleRowClick = () => {
    if (m.patientId) navigateToPatient(m.patientId);
    else showToast(`${m.name} — no linked patient record yet`);
  };

  const handleNameClick = (e) => {
    e.stopPropagation();
    openQuickView?.({
      id: m.patientId || m.id,
      name: m.name,
      initials: m.initials,
      gender: m.gender,
      age: m.age,
      memberId: m.memberId,
      language: m.language,
    });
  };

  return (
    <>
    <tr className={styles.row} onClick={handleRowClick}>
      <td className={`${styles.checkTd} ${styles.stickyLeft}`} style={{ left: 0 }} onClick={e => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={() => onSelect(m.id)} aria-label={`Select ${m.name}`} />
      </td>

      <td className={`${styles.membersTd} ${styles.stickyLeft}`} style={{ left: 36 }}>
        <div className={styles.patientCell}>
          <Avatar variant="patient" initials={m.initials} />
          <div>
            <div className={styles.patientName}>
              <button className={styles.patientNameLink} onClick={handleNameClick}>{m.name}</button>
              <span className={styles.patientDemo}>({m.gender}•{m.age})</span>
            </div>
            <div className={styles.patientMeta}>
              {m.memberId} •{' '}
              <button type="button" className={styles.langBadge} onClick={e => e.stopPropagation()}>
                {(m.language || 'en').toUpperCase()}
                <span className={styles.langTooltip}>Preferred Language: {LANG_MAP[m.language] || 'English'}</span>
              </button>
            </div>
          </div>
        </div>
      </td>

      <td className={styles.td}><StatusBadge status={m.status} /></td>

      <td className={styles.td}>
        <span className={`${styles.dateText} ${m.nextActionOverdue ? styles.overdue : ''}`}>
          {m.nextActionDue || '—'}
        </span>
      </td>

      <td className={styles.td}>
        {m.outreachStatus ? (
          <div className={styles.outreachCell}>
            <Icon name="solar:phone-calling-bold" size={15} color="var(--status-success)" />
            <div>
              <div className={styles.outreachStatus}>{m.outreachStatus}</div>
              {m.outreachDate && <div className={styles.outreachDate}>{m.outreachDate}</div>}
            </div>
          </div>
        ) : (
          <div className={styles.outreachCell}>
            <Icon name="solar:phone-linear" size={15} color="var(--neutral-200)" />
            <span className={styles.outreachNone}>—</span>
          </div>
        )}
      </td>

      <td className={styles.td}>
        {m.assigneeName ? (
          <div className={styles.assigneeCell}>
            <Avatar variant="assignee" initials={m.assigneeInitials || m.assigneeName.slice(0, 2).toUpperCase()} />
            <span className={styles.assigneeName}>{m.assigneeName}</span>
          </div>
        ) : (
          <span className={styles.assignPlaceholder}>
            <Icon name="solar:user-plus-linear" size={14} color="var(--neutral-300)" />
            Assign User
          </span>
        )}
      </td>

      <td className={styles.td}><span className={styles.dateText}>{m.startDate || '—'}</span></td>
      <td className={styles.td}><span className={styles.dateText}>{m.lastAdmission || '—'}</span></td>

      <td className={styles.td} onClick={openBilling}>
        <button type="button" className={styles.billableMins} onClick={openBilling}>
          {formatMins(m.billableSeconds)}
        </button>
      </td>
      <td className={styles.td}><span className={styles.unloggedMins}>{formatMins(m.unloggedSeconds)}</span></td>

      <td className={styles.td}>
        {m.riskLevel
          ? <Badge variant={`lace-${m.riskLevel.toLowerCase()}`} label={m.riskLevel} />
          : <span className={styles.mutedDash}>—</span>}
      </td>

      <td className={styles.td}>
        {m.taskCount ? <span className={styles.taskBadge}>{m.taskCount} Task</span> : <span className={styles.mutedDash}>—</span>}
      </td>

      <td className={styles.td}><span className={styles.carePlanText}>{m.carePlanStatus || '—'}</span></td>

      <td className={`${styles.td} ${styles.stickyRight}`} onClick={e => e.stopPropagation()}>
        <div className={styles.actionsCell}>
          <ActionButton icon="solar:document-text-linear" size="L" tooltip="View billing" onClick={openBilling} />
          <span className={styles.actionDivider} />
          <ActionButton icon="solar:phone-linear" size="L" tooltip="Call patient" />
          <span className={styles.actionDivider} />
          <ActionButton icon="solar:menu-dots-linear" size="L" tooltip="More options" />
        </div>
      </td>
    </tr>
    {billingOpen && (
      <CcmBillingReviewDrawer member={m} onClose={() => setBillingOpen(false)} />
    )}
    </>
  );
}
