import { useRef, useState } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Avatar } from '../../components/Avatar/Avatar';
import { AssigneeChange } from '../../components/AssigneeChange/AssigneeChange';
import { Badge } from '../../components/Badge/Badge';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { MenuPopover } from '../../components/MenuPopover/MenuPopover';
import { buildPatientRowMenuItems } from '../../components/MenuPopover/patientRowMenuItems';
import { useAppStore } from '../../store/useAppStore';
import { formatFoldId, handleFoldIdClick } from '../../lib/foldId';
import styles from './SnpWorklistRow.module.css';

// SNP Program Sub Status → shared Badge variant. Each value maps onto an
// existing colour class so we don't have to introduce SNP-specific CSS —
// New / Closed use the neutral pill (toc-new), Engaged uses the info pill
// (toc-engaged), Declined and Closed-Do-not-call use the error pill
// (lace-high), Unable to Reach uses the priority-high orange, Attempted
// uses toc-attempted (warning), Enrolled and Completed use toc-enrolled
// (success). Follows the SNP spec groups (Not Started / In progress /
// Completed / Closed).
const PROGRAM_SUB_STATUS_VARIANT = {
  'New':                  'toc-new',
  'Engaged':              'toc-engaged',
  'Declined':             'lace-high',
  'Unable to Reach':      'priority-high',
  'Attempted':            'toc-attempted',
  '2nd Cont. – Fail':     'toc-attempted', // legacy label — colour-align with Attempted
  'Enrolled':             'toc-enrolled',
  'Completed':            'toc-enrolled',
  'Closed - Other':       'toc-new',
  'Closed - Excluded':    'toc-new',
  'Closed - Do not call': 'lace-high',
};

// Popover options, ordered by the spec's group layout.
const PROGRAM_SUB_STATUS_ITEMS = [
  { section: 'Not Started' },
  { key: 'New', label: 'New' },
  { divider: true },
  { section: 'In progress' },
  { key: 'Engaged', label: 'Engaged' },
  { key: 'Declined', label: 'Declined' },
  { key: 'Unable to Reach', label: 'Unable to Reach' },
  { key: 'Attempted', label: 'Attempted' },
  { key: 'Enrolled', label: 'Enrolled' },
  { divider: true },
  { section: 'Completed' },
  { key: 'Completed', label: 'Completed' },
  { divider: true },
  { section: 'Closed' },
  { key: 'Closed - Other', label: 'Closed - Other' },
  { key: 'Closed - Excluded', label: 'Closed - Excluded' },
  { key: 'Closed - Do not call', label: 'Closed - Do not call' },
];

const LANG_MAP = { en: 'English', es: 'Spanish', zh: 'Chinese', yue: 'Cantonese', ko: 'Korean', vi: 'Vietnamese', hi: 'Hindi', pa: 'Punjabi' };

const DOT_COLOR = { red: 'var(--status-error)', blue: 'var(--status-info)', grey: 'var(--neutral-200)' };

function OutreachCell({ outreach }) {
  if (!outreach) {
    return (
      <span className={styles.outreachNone}>
        <Icon name="solar:phone-calling-linear" size={16} color="var(--neutral-200)" />
        <span className={styles.mutedDash}>—</span>
      </span>
    );
  }
  const icon = outreach.kind === 'letter' ? 'solar:document-text-linear' : 'solar:phone-calling-linear';
  return (
    <span className={styles.outreachCell}>
      <Icon name={icon} size={16} color="var(--status-error)" />
      <span className={styles.outreachBody}>
        <span className={styles.outreachStatus}>{outreach.status}</span>
        <span className={styles.outreachDate}>{outreach.date}</span>
        {outreach.dots?.length ? (
          <span className={styles.dots}>
            {outreach.dots.map((c, i) => (
              <span key={i} className={styles.dot} style={{ background: DOT_COLOR[c] || DOT_COLOR.grey }} />
            ))}
          </span>
        ) : null}
      </span>
    </span>
  );
}

// Row Tags cell — each pill is a shared Badge. Mock rows tag their pills
// with a generic tone ('grey' / 'blue' / 'green' / 'amber' / 'red') which
// we translate to an existing Badge palette variant. Unknown tones fall
// back to ai-neutral so bad data can't crash the cell.
const TAG_VARIANT_BY_TONE = {
  grey:  'ai-neutral',
  blue:  'outreach-appointment',
  green: 'ai-med',
  amber: 'outreach-care-gap',
  red:   'ai-risk',
};

function TagCell({ tags, tagsMore }) {
  if (!tags?.length) return <span className={styles.mutedDash}>—</span>;
  return (
    <span className={styles.tagCell}>
      {tags.map(t => (
        <Badge
          key={t.label}
          variant={TAG_VARIANT_BY_TONE[t.tone] || 'ai-neutral'}
          label={t.label}
        />
      ))}
      {tagsMore > 0 ? <span className={styles.tagMore}>+{tagsMore} More</span> : null}
    </span>
  );
}

// Roles that belong exclusively to the HCC coding pipeline — SNP members
// should never be assigned to a Coder / Support / QA / Compliance reviewer,
// so anyone tagged with one of these roles is filtered out of the SNP
// assignee picker.
const HCC_ONLY_ROLES = new Set(['Coder', 'Support', 'QA', 'Compliance']);

// Demo/mock assignee names that pre-date the platformUsers table — kept in
// sync with SNP_WORKLIST_MEMBERS so pre-seeded rows still show a plausible
// role even when Supabase (which doesn't ship an `assignee_role` column)
// wins the fetch race over the mock fallback.
const DEMO_ASSIGNEE_ROLE = {
  'Daniel Arsulo':            'Care Manager',
  'Dr. Shravank Montgomery':  'Physician',
  'PoojaNurse CFC Hills':     'SNP Nurse',
  'shravank 7hills':          'SNP Nurse',
  'Chemy Maa':                'Care Coordinator',
  'Michelle Ling':            'Care Manager',
};

export function SnpWorklistRow({ member, isSelected, onSelect }) {
  const openQuickView = useAppStore(s => s.openQuickView);
  const navigateToPatient = useAppStore(s => s.navigateToPatient);
  const openCallPopover = useAppStore(s => s.openCallPopover);
  const requestAddTask = useAppStore(s => s.requestAddTask);
  const setSnpProgramSubStatus = useAppStore(s => s.setSnpProgramSubStatus);
  const setSnpAssignee = useAppStore(s => s.setSnpAssignee);
  const platformUsers = useAppStore(s => s.platformUsers);
  const showToast = useAppStore(s => s.showToast);
  const m = member;

  // SNP-eligible users: platform users who do NOT carry any of the HCC-only
  // clinical roles (Coder / Support / QA / Compliance). Shape matches
  // AssigneeChange's picker contract — { id, name, initials, role? }.
  const eligibleUsers = platformUsers
    .filter(u => !u.clinicalRoles?.some(r => HCC_ONLY_ROLES.has(r)))
    .map(u => ({
      id: u.id,
      name: u.name,
      initials: u.initials,
      role: u.clinicalRoles?.[0] || '',
    }));

  // Derive the role sub-line dynamically. Fallback chain:
  //   1. explicit `m.assigneeRole` (set by the picker or the mock file)
  //   2. first clinical role for a matching platformUsers row (real users
  //      picked via the picker or already seeded on the platform)
  //   3. DEMO_ASSIGNEE_ROLE lookup (Supabase seed rows carry legacy
  //      assignee names without any role column)
  //   4. undefined → AssigneeChange renders the name without a sub-line
  const derivedAssigneeRole =
    m.assigneeRole ||
    platformUsers.find(u => u.name === m.assigneeName)?.clinicalRoles?.[0] ||
    DEMO_ASSIGNEE_ROLE[m.assigneeName] ||
    undefined;

  const [showDropdown, setShowDropdown] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const dropBtnRef = useRef(null);
  const callBtnRef = useRef(null);
  const statusBtnRef = useRef(null);

  const handleRowClick = () => {
    if (m.patientId) navigateToPatient(m.patientId);
    else showToast(`${m.name} — no linked patient record yet`);
  };
  const handleNameClick = (e) => {
    e.stopPropagation();
    openQuickView?.({ id: m.patientId || m.id, name: m.name, initials: m.initials, gender: m.gender, age: m.age, memberId: m.memberId, language: m.language });
  };

  const handleCallClick = (e) => {
    e.stopPropagation();
    if (openCallPopover) openCallPopover(m.id, callBtnRef);
    else showToast(`Call ${m.name} — coming soon`);
  };

  const menuItems = buildPatientRowMenuItems([
    { key: 'View Program', icon: 'solar:clipboard-list-linear', label: 'View Program' },
  ]);

  const handleMenuSelect = (key) => {
    if (key === 'View Program') { handleRowClick(); return; }
    if (key === 'Add Task') { requestAddTask?.({ member: m.name }); return; }
    showToast(`${key} – coming soon`);
  };

  return (
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
              <span
                className={styles.foldId}
                title="Click to copy"
                onClick={handleFoldIdClick(m.memberId, showToast)}
              >
                {formatFoldId(m.memberId)}
              </span>{' '}•{' '}
              <button type="button" className={styles.langBadge} onClick={e => e.stopPropagation()}>
                {(m.language || 'en').toUpperCase()}
                <span className={styles.langTooltip}>Preferred Language: {LANG_MAP[m.language] || 'English'}</span>
              </button>
            </div>
          </div>
        </div>
      </td>

      {/* Program Sub Status — shared Badge whose colour maps to the status
          group (Not Started / In progress / Completed / Closed), with a
          MenuPopover-driven grouped dropdown for changing the value. */}
      <td className={styles.td} onClick={e => e.stopPropagation()}>
        <span style={{ position: 'relative', display: 'inline-block' }}>
          <button
            ref={statusBtnRef}
            type="button"
            className={styles.statusBadgeBtn}
            onClick={(e) => { e.stopPropagation(); setShowStatusMenu(v => !v); }}
            aria-haspopup="menu"
            aria-expanded={showStatusMenu}
          >
            <Badge
              variant={PROGRAM_SUB_STATUS_VARIANT[m.programSubStatus] || 'snp-new'}
              label={m.programSubStatus}
              trailingIcon="solar:alt-arrow-down-linear"
            />
          </button>
          {showStatusMenu && (
            <MenuPopover
              anchorRef={statusBtnRef}
              items={PROGRAM_SUB_STATUS_ITEMS}
              onSelect={(key) => {
                setSnpProgramSubStatus?.(m.id, key);
                setShowStatusMenu(false);
              }}
              onClose={() => setShowStatusMenu(false)}
              width={220}
              ariaLabel="Change program sub status"
            />
          )}
        </span>
      </td>

      {/* Care Plan Status — editable dropdown affordance */}
      <td className={styles.td} onClick={e => e.stopPropagation()}>
        <button type="button" className={styles.statusDropdown}>
          {m.carePlanStatus}
          <Icon name="solar:alt-arrow-down-linear" size={14} color="var(--neutral-300)" />
        </button>
      </td>

      <td className={styles.td}><span className={styles.dateText}>{m.nextActionDue || '—'}</span></td>

      <td className={styles.td}><OutreachCell outreach={m.outreach} /></td>

      <td className={styles.td} onClick={e => e.stopPropagation()}>
        {m.assigneeName ? (
          <AssigneeChange
            name={m.assigneeName}
            initials={m.assigneeInitials}
            role={derivedAssigneeRole}
            users={eligibleUsers}
            onSelect={(u) => setSnpAssignee(m.id, u)}
            pickerTitle="Change assignee"
          />
        ) : (
          <AssigneeChange
            unassigned
            users={eligibleUsers}
            onSelect={(u) => setSnpAssignee(m.id, u)}
            pickerTitle="Assign user"
          />
        )}
      </td>

      <td className={styles.td}><span className={styles.dateText}>{m.triggerDate || '—'}</span></td>
      <td className={styles.td}><span className={styles.mutedDash}>{m.lastAdmission || '—'}</span></td>
      <td className={styles.td}><span className={styles.triggerText}>{m.trigger || '—'}</span></td>
      <td className={styles.td}><span className={styles.riskText}>{m.riskIq || 'Undetermined'}</span></td>
      <td className={styles.td}><TagCell tags={m.tags} tagsMore={m.tagsMore} /></td>

      <td className={styles.td}>
        {m.taskCount ? <button type="button" className={styles.taskLink} onClick={e => e.stopPropagation()}>{m.taskCount}</button> : <span className={styles.mutedDash}>—</span>}
      </td>

      <td className={`${styles.td} ${styles.stickyRight}`} onClick={e => e.stopPropagation()}>
        <div className={styles.actionsCell}>
          <ActionButton
            icon="solar:clipboard-list-linear"
            size="L"
            tooltip="View Program"
            onClick={handleRowClick}
          />
          <span className={styles.actionDivider} />
          <ActionButton
            ref={callBtnRef}
            icon="solar:phone-linear"
            size="L"
            tooltip="Call patient"
            onClick={handleCallClick}
          />
          <span className={styles.actionDivider} />
          <div style={{ position: 'relative' }}>
            <ActionButton
              ref={dropBtnRef}
              icon="solar:menu-dots-linear"
              size="L"
              tooltip="More options"
              onClick={(e) => { e.stopPropagation(); setShowDropdown(v => !v); }}
            />
            {showDropdown && (
              <MenuPopover
                anchorRef={dropBtnRef}
                items={menuItems}
                onSelect={(key) => { handleMenuSelect(key); setShowDropdown(false); }}
                onClose={() => setShowDropdown(false)}
                width={220}
                ariaLabel="Row actions"
              />
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
