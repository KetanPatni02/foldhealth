import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { Checkbox } from '../../components/ShadcnCheckbox/checkbox';
import { useAppStore } from '../../store/useAppStore';
import { CcmBillingReviewDrawer } from './CcmBillingReviewDrawer';
import styles from './CcmWorklistRow.module.css';

// Portalled dropdown menu for the row's three-dots action. Mirrors the
// TOC row's DropdownMenu — Communication / Care Actions / Automation /
// Admin sections — so the two worklists share one menu vocabulary.
function RowDropdownMenu({ member, onClose }) {
  const showToast = useAppStore(s => s.showToast);
  const requestAddTask = useAppStore(s => s.requestAddTask);
  const navigateToPatient = useAppStore(s => s.navigateToPatient);

  const stub = (label) => () => { showToast(`${label} – coming soon`); onClose(); };

  return (
    <div className={styles.dropdown} onClick={e => e.stopPropagation()}>
      <div className={styles.dropdownSection}>Communication</div>
      {['Send SMS', 'Send Email', 'Start Meeting', 'Chat'].map(l => (
        <button key={l} className={styles.dropdownItem} onClick={stub(l)}>
          <Icon
            name={l === 'Send SMS' ? 'solar:chat-round-line-linear'
              : l === 'Send Email' ? 'solar:letter-linear'
              : l === 'Start Meeting' ? 'solar:videocamera-record-linear'
              : 'solar:chat-dots-linear'}
            size={18}
            color="var(--neutral-300)"
          />
          {l}
        </button>
      ))}
      <div className={styles.dropdownDivider} />
      <div className={styles.dropdownSection}>Care Actions</div>
      {['Send Assessment', 'Initiate Protocol', 'Send Education', 'Warm Referral', 'Add to Program', 'Upload File'].map(l => (
        <button key={l} className={styles.dropdownItem} onClick={stub(l)}>
          <Icon name="solar:clipboard-check-linear" size={18} color="var(--neutral-300)" />
          {l}
        </button>
      ))}
      <button className={styles.dropdownItem} onClick={() => { requestAddTask?.({ member: member?.name }); onClose(); }}>
        <Icon name="solar:checklist-minimalistic-linear" size={18} color="var(--neutral-300)" />
        Add Task
      </button>
      <div className={styles.dropdownDivider} />
      <div className={styles.dropdownSection}>Automation</div>
      <button className={styles.dropdownItem} onClick={stub('Run Automation')}>
        <Icon name="solar:bolt-linear" size={18} color="var(--neutral-300)" />
        Run Automation
      </button>
      <div className={styles.dropdownDivider} />
      <div className={styles.dropdownSection}>Admin Actions</div>
      <button
        className={styles.dropdownItem}
        onClick={() => {
          if (member?.patientId) navigateToPatient(member.patientId, { profileTab: 'Care Programs', programCode: 'CCM' });
          onClose();
        }}
      >
        <Icon name="solar:folder-open-linear" size={18} color="var(--neutral-300)" />
        Open Care Program
      </button>
    </div>
  );
}

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
  const [menuPos, setMenuPos] = useState(null);
  const menuBtnRef = useRef(null);

  // Close on outside click; the initial click that opened the menu is
  // deferred via rAF so it doesn't immediately fall through and close it.
  useEffect(() => {
    if (!menuPos) return;
    const onDoc = (e) => {
      if (!e.target.closest(`.${styles.dropdown}`)) setMenuPos(null);
    };
    const raf = requestAnimationFrame(() => document.addEventListener('click', onDoc));
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('click', onDoc);
    };
  }, [menuPos]);

  const toggleMenu = (e) => {
    e.stopPropagation();
    if (menuPos) { setMenuPos(null); return; }
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dropdownH = 420;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const top = spaceBelow < dropdownH
      ? Math.max(8, rect.top - Math.min(dropdownH, rect.top - 8))
      : rect.bottom + 4;
    setMenuPos({ top, right: window.innerWidth - rect.right });
  };

  const m = member;

  // Billable Mins cell → same-page drawer overlay (quick peek).
  const openBilling = (e) => {
    e.stopPropagation();
    setBillingOpen(true);
  };

  // Action-row document icon → navigate INTO the patient profile and open
  // the CCM care program on landing. Different intent than the peek drawer.
  const openInCarePlan = (e) => {
    e.stopPropagation();
    if (!m.patientId) {
      showToast(`${m.name} — no linked patient record yet`);
      return;
    }
    navigateToPatient(m.patientId, {
      profileTab: 'Care Programs',
      programCode: 'CCM',
    });
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
          <ActionButton icon="solar:document-text-linear" size="L" tooltip="Open CCM care program" onClick={openInCarePlan} />
          <span className={styles.actionDivider} />
          <ActionButton icon="solar:phone-linear" size="L" tooltip="Call patient" />
          <span className={styles.actionDivider} />
          <ActionButton
            ref={menuBtnRef}
            icon="solar:menu-dots-linear"
            size="L"
            tooltip="More options"
            onClick={toggleMenu}
          />
        </div>
      </td>
    </tr>
    {menuPos && createPortal(
      <div style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}>
        <RowDropdownMenu member={m} onClose={() => setMenuPos(null)} />
      </div>,
      document.body,
    )}
    {billingOpen && (
      <CcmBillingReviewDrawer member={m} onClose={() => setBillingOpen(false)} />
    )}
    </>
  );
}
