import { useRef, useState } from 'react';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { PatientAvatarHover } from '../../components/PatientHoverCard/PatientAvatarHover';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { MenuPopover } from '../../components/MenuPopover/MenuPopover';
import { buildPatientRowMenuItems } from '../../components/MenuPopover/patientRowMenuItems';
import { FoldIdTag } from '../../components/FoldIdTag/FoldIdTag';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { formatDobDisplay, deriveDob } from '../../lib/patientDob';
import { useAppStore } from '../../store/useAppStore';
import { worklistMemberCallId } from '../../lib/patientCall';
import { clinicalRolesPickerLabel } from '../../lib/worklistAssignee';
import { PharmacyActivityDrawer } from './program/PharmacyActivityLog';
import { GAP_STATUSES } from './pharmacyWorklist.utils';
import styles from './PharmacyWorklistRow.module.css';

const AUTO_STATUS = '__auto';
const HCC_ONLY_ROLES = new Set(['Coder', 'Support', 'QA', 'Compliance']);
const LANG_MAP = { en: 'English', es: 'Spanish', zh: 'Chinese', yue: 'Cantonese', ko: 'Korean', vi: 'Vietnamese', hi: 'Hindi', pa: 'Punjabi' };

export function PharmacyWorklistRow({ member, columns, hiddenSet, isSelected, onSelect }) {
  const openQuickView = useAppStore(s => s.openQuickView);
  const openCallPopover = useAppStore(s => s.openCallPopover);
  const requestAddTask = useAppStore(s => s.requestAddTask);
  const runPatientRowAction = useAppStore(s => s.runPatientRowAction);
  const setPharmacyGapStatus = useAppStore(s => s.setPharmacyGapStatus);
  const openPharmacyGapDrawer = useAppStore(s => s.openPharmacyGapDrawer);
  const setPharmacyAssignee = useAppStore(s => s.setPharmacyAssignee);
  const platformUsers = useAppStore(s => s.platformUsers);
  const showToast = useAppStore(s => s.showToast);
  const m = member;
  const dobLabel = formatDobDisplay(m.dob) || deriveDob(m.age, m.name);

  const [showDropdown, setShowDropdown] = useState(false);
  const [gapStatusMenu, setGapStatusMenu] = useState(null); // { code, rect }
  const [showActivity, setShowActivity] = useState(false);
  const dropBtnRef = useRef(null);
  const callBtnRef = useRef(null);

  const middleCols = columns.filter(c => !c.sticky && !c.showCheckbox && c.renderCell);
  const visibleMiddle = middleCols.filter(c => !hiddenSet.has(c.key));

  const eligibleUsers = [];
  for (const u of platformUsers) {
    if (u.clinicalRoles?.some(r => HCC_ONLY_ROLES.has(r))) continue;
    eligibleUsers.push({ id: u.id, name: u.name, initials: u.initials, role: clinicalRolesPickerLabel(u) });
  }

  const cellCtx = {
    setPharmacyAssignee,
    openGap: (code) => openPharmacyGapDrawer(m.id, code),
    eligibleUsers,
    openGapStatusMenu: (code, rect) => setGapStatusMenu(cur => (cur?.code === code ? null : { code, rect })),
  };
  const menuGap = gapStatusMenu && m.gaps.find(g => g.code === gapStatusMenu.code);
  const gapStatusItems = menuGap ? [
    ...GAP_STATUSES.map(s => ({ key: s, label: s, selected: s === menuGap.status.gap })),
    ...(menuGap.status.manual ? [{ key: AUTO_STATUS, label: 'Use status from data' }] : []),
  ] : [];

  const handleNameClick = (e) => {
    e.stopPropagation();
    openQuickView?.({ id: m.patientId || m.id, name: m.name, initials: m.initials, gender: m.gender, age: m.age, memberId: m.memberId, language: m.language });
  };
  const handleCallClick = (e) => {
    e.stopPropagation();
    openCallPopover(worklistMemberCallId(m), callBtnRef);
  };

  const menuItems = buildPatientRowMenuItems([
    { key: 'Activity Log', icon: 'solar:history-linear', label: 'Activity Log' },
  ]);
  const handleMenuSelect = (key) => {
    if (runPatientRowAction(key, m)) return;
    if (key === 'Activity Log') { setShowActivity(true); return; }
    if (key === 'Add Task') { requestAddTask?.({ member: m.name }); return; }
    showToast(`${key} – coming soon`);
  };

  return (
    <tr className={`${styles.row} ${m.gaps.length > 1 ? styles.rowMultiGap : ''}`} onClick={() => { if (m.gaps.length) openPharmacyGapDrawer(m.id, m.urgent?.code || m.gaps[0].code); }}>
      <td className={`${styles.checkTd} ${styles.stickyLeft}`} style={{ left: 0 }} onClick={e => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={() => onSelect(m.id)} aria-label={`Select ${m.name}`} />
      </td>

      <td className={`${styles.membersTd} ${styles.stickyLeft}`} style={{ left: 36 }}>
        <div className={styles.patientCell}>
          <PatientAvatarHover patient={{ memberId: m.memberId, id: m.id, name: m.name, initials: m.initials, gender: m.gender, age: m.age, dob: m.dob }} />
          <div>
            <div className={styles.patientName}>
              <button type="button" className={styles.patientNameLink} onClick={handleNameClick}>{m.name}</button>{' '}
              <Tooltip label={dobLabel ? `DOB: ${dobLabel}` : ''} placement="bottom">
                <span className={styles.patientDemo}>({m.gender}•{m.age})</span>
              </Tooltip>
            </div>
            <div className={styles.patientMeta}>
              <span onClick={e => e.stopPropagation()} className={styles.inlineFlex}>
                <FoldIdTag id={m.memberId} className={styles.foldId} showToast={showToast} />
              </span>{' '}•{' '}
              <Tooltip label={`Preferred Language: ${LANG_MAP[m.language] || 'English'}`} variant="light">
                <button type="button" className={styles.langBadge} onClick={e => e.stopPropagation()}>
                  {(m.language || 'en').toUpperCase()}
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </td>

      {visibleMiddle.map(col => (
        <td
          key={col.key}
          data-col-key={col.key}
          className={col.getTdClassName ? col.getTdClassName(m) : styles.td}
          onClick={col.stopRowClickPropagation ? (e) => e.stopPropagation() : undefined}
        >
          {col.renderCell(m, cellCtx)}
        </td>
      ))}

      <td className={`${styles.td} ${styles.stickyRight}`} onClick={e => e.stopPropagation()}>
        <div className={styles.actionsCell}>
          <ActionButton ref={callBtnRef} icon="solar:phone-linear" size="L" tooltip="Call patient" onClick={handleCallClick} />
          <span className={styles.actionDivider} />
          <div className={styles.relative}>
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
        {showActivity && <PharmacyActivityDrawer member={m} onClose={() => setShowActivity(false)} />}
        {menuGap && (
          <MenuPopover
            anchorRect={gapStatusMenu.rect}
            items={gapStatusItems}
            onSelect={(key) => {
              setPharmacyGapStatus(m.id, menuGap.code, key === AUTO_STATUS ? null : key);
              setGapStatusMenu(null);
            }}
            onClose={() => setGapStatusMenu(null)}
            width={220}
            ariaLabel={`Change ${menuGap.code} status`}
          />
        )}
      </td>
    </tr>
  );
}
