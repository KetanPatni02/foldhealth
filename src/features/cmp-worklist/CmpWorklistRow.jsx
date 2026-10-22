import { useRef, useState } from 'react';
import { PatientAvatarHover } from '../../components/PatientHoverCard/PatientAvatarHover';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { FoldIdTag } from '../../components/FoldIdTag/FoldIdTag';
import { formatDobDisplay, deriveDob } from '../../lib/patientDob';
import { memberLanguageLabel } from '../../lib/memberFilters';
import { worklistMemberCallId } from '../../lib/patientCall';
import { useAppStore } from '../../store/useAppStore';
import { CMP_MIDDLE_COLUMNS } from './cmpColumns';
import styles from './CmpWorklistRow.module.css';

export function CmpWorklistRow({ member, columns, hiddenSet, selected, onToggle, onView, showToast }) {
  const updateCmpMemberStatus = useAppStore(s => s.updateCmpMemberStatus);
  const openQuickView = useAppStore(s => s.openQuickView);
  const openCallPopover = useAppStore(s => s.openCallPopover);
  const callBtnRef = useRef(null);
  const [statusAnchor, setStatusAnchor] = useState(null);
  const language = member.language || 'en';

  const middleCols = (columns || CMP_MIDDLE_COLUMNS).filter(c => !c.sticky && !c.showCheckbox && c.renderCell);
  const visibleMiddle = hiddenSet ? middleCols.filter(c => !hiddenSet.has(c.key)) : middleCols;
  const cellCtx = { statusAnchor, setStatusAnchor, updateCmpMemberStatus, showToast };
  const dobLabel = formatDobDisplay(member.dob) || deriveDob(member.age, member.name);

  return (
    <tr className={[styles.row, selected ? styles.rowSelected : ''].filter(Boolean).join(' ')}>
      <td className={`${styles.checkTd} ${styles.stickyLeft}`} style={{ left: 0 }}>
        <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Select ${member.name}`} />
      </td>

      <td className={`${styles.membersTd} ${styles.stickyLeft}`} style={{ left: 36 }}>
        <div className={styles.patientCell}>
          <PatientAvatarHover patient={{ memberId: member.memberId, id: member.id, name: member.name, initials: member.in, gender: member.g, age: member.age, dob: member.dob }} />
          <div>
            <div className={styles.patientName}>
              <button
                type="button"
                className={styles.patientNameLink}
                onClick={(e) => {
                  e.stopPropagation();
                  openQuickView({ id: member.id, name: member.name, initials: member.in, gender: member.g, age: member.age, memberId: member.memberId, language });
                }}
              >
                {member.name}
              </button>{' '}
              <Tooltip label={dobLabel ? `DOB: ${dobLabel}` : ''} placement="bottom">
                <span className={styles.patientDemo}>({member.g}•{member.age})</span>
              </Tooltip>
            </div>
            <div className={styles.patientMeta}>
              <span onClick={e => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                <FoldIdTag id={member.memberId} className={styles.foldId} showToast={showToast} />
              </span>{' '}•{' '}
              <Tooltip label={`Preferred Language: ${memberLanguageLabel(language)}`} variant="light">
                <button type="button" className={styles.langBadge} onClick={e => e.stopPropagation()}>
                  {language.toUpperCase()}
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
          className={styles.td}
          style={col.align === 'center' ? { textAlign: 'center' } : undefined}
        >
          {col.renderCell(member, cellCtx)}
        </td>
      ))}

      <td className={`${styles.td} ${styles.stickyRight}`}>
        <div className={styles.actionsCell}>
          <ActionButton icon="solar:document-text-linear" size="L" tooltip="View Program" onClick={onView} />
          <span className={styles.actionDivider} />
          <ActionButton
            ref={callBtnRef}
            icon="solar:phone-linear"
            size="L"
            tooltip="Call patient"
            onClick={(e) => { e.stopPropagation(); openCallPopover(worklistMemberCallId(member), callBtnRef); }}
          />
          <span className={styles.actionDivider} />
          <ActionButton
            icon="solar:menu-dots-linear"
            size="L"
            tooltip="More"
            onClick={() => showToast(`More actions for ${member.name} are coming soon`)}
          />
        </div>
      </td>
    </tr>
  );
}
