import { useRef, useState } from 'react';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { PatientAvatarHover } from '../../components/PatientHoverCard/PatientAvatarHover';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { MenuPopover } from '../../components/MenuPopover/MenuPopover';
import { buildPatientRowMenuItems } from '../../components/MenuPopover/patientRowMenuItems';
import { FoldIdTag } from '../../components/FoldIdTag/FoldIdTag';
import { useAppStore } from '../../store/useAppStore';
import { worklistMemberCallId } from '../../lib/patientCall';
import { clinicalRolesPickerLabel } from '../../lib/worklistAssignee';
import { PharmacyActivityDrawer } from './program/PharmacyActivityLog';
import styles from './PharmacyWorklistRow.module.css';

const HCC_ONLY_ROLES = new Set(['Coder', 'Support', 'QA', 'Compliance']);

export function PharmacyWorklistRow({ member, columns, hiddenSet, isSelected, onSelect }) {
  const openQuickView = useAppStore(s => s.openQuickView);
  const navigateToPatient = useAppStore(s => s.navigateToPatient);
  const openCallPopover = useAppStore(s => s.openCallPopover);
  const requestAddTask = useAppStore(s => s.requestAddTask);
  const runPatientRowAction = useAppStore(s => s.runPatientRowAction);
  const setPharmacyStatus = useAppStore(s => s.setPharmacyStatus);
  const setPharmacyAssignee = useAppStore(s => s.setPharmacyAssignee);
  const platformUsers = useAppStore(s => s.platformUsers);
  const showToast = useAppStore(s => s.showToast);
  const m = member;

  const [showDropdown, setShowDropdown] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const dropBtnRef = useRef(null);
  const callBtnRef = useRef(null);
  const statusBtnRef = useRef(null);

  const middleCols = columns.filter(c => !c.sticky && !c.showCheckbox && c.renderCell);
  const visibleMiddle = middleCols.filter(c => !hiddenSet.has(c.key));

  const eligibleUsers = [];
  for (const u of platformUsers) {
    if (u.clinicalRoles?.some(r => HCC_ONLY_ROLES.has(r))) continue;
    eligibleUsers.push({ id: u.id, name: u.name, initials: u.initials, role: clinicalRolesPickerLabel(u) });
  }

  const cellCtx = { showStatusMenu, setShowStatusMenu, statusBtnRef, setPharmacyStatus, setPharmacyAssignee, eligibleUsers };

  const openInCareProgram = (e) => {
    e?.stopPropagation?.();
    navigateToPatient(m.patientId || m.id, { profileTab: 'Care Programs', programCode: 'PHARM' });
  };
  const handleNameClick = (e) => {
    e.stopPropagation();
    openQuickView?.({ id: m.patientId || m.id, name: m.name, initials: m.initials, gender: m.gender, age: m.age, memberId: m.memberId, language: m.language });
  };
  const handleCallClick = (e) => {
    e.stopPropagation();
    openCallPopover(worklistMemberCallId(m), callBtnRef);
  };

  const menuItems = buildPatientRowMenuItems([
    { key: 'View Program', icon: 'solar:eye-linear', label: 'View Program' },
    { key: 'Activity Log', icon: 'solar:history-linear', label: 'Activity Log' },
  ]);
  const handleMenuSelect = (key) => {
    if (runPatientRowAction(key, m)) return;
    if (key === 'View Program') { openInCareProgram(); return; }
    if (key === 'Activity Log') { setShowActivity(true); return; }
    if (key === 'Add Task') { requestAddTask?.({ member: m.name }); return; }
    showToast(`${key} – coming soon`);
  };

  return (
    <tr className={styles.row} onClick={openInCareProgram}>
      <td className={`${styles.checkTd} ${styles.stickyLeft}`} style={{ left: 0 }} onClick={e => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={() => onSelect(m.id)} aria-label={`Select ${m.name}`} />
      </td>

      <td className={`${styles.membersTd} ${styles.stickyLeft}`} style={{ left: 36 }}>
        <div className={styles.patientCell}>
          <PatientAvatarHover patient={{ memberId: m.memberId, id: m.id, name: m.name, initials: m.initials, gender: m.gender, age: m.age, dob: m.dob }} />
          <div>
            <div className={styles.patientName}>
              <button type="button" className={styles.patientNameLink} onClick={handleNameClick}>{m.name}</button>{' '}
              <span className={styles.patientDemo}>({m.gender}•{m.age})</span>
            </div>
            <div className={styles.patientMeta}>
              <span onClick={e => e.stopPropagation()} className={styles.inlineFlex}>
                <FoldIdTag id={m.memberId} className={styles.foldId} showToast={showToast} />
              </span>
              {m.dob ? <> • DOB {m.dob}</> : null}
            </div>
          </div>
        </div>
      </td>

      {visibleMiddle.map(col => (
        <td
          key={col.key}
          data-col-key={col.key}
          className={styles.td}
          onClick={col.stopRowClickPropagation ? (e) => e.stopPropagation() : undefined}
        >
          {col.renderCell(m, cellCtx)}
        </td>
      ))}

      <td className={`${styles.td} ${styles.stickyRight}`} onClick={e => e.stopPropagation()}>
        <div className={styles.actionsCell}>
          <ActionButton icon="solar:eye-linear" size="L" tooltip="View Program" onClick={openInCareProgram} />
          <span className={styles.actionDivider} />
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
      </td>
    </tr>
  );
}
