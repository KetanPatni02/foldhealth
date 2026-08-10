import { Icon } from '../../../../../../components/Icon/Icon';
import { DownChevronIcon } from '../../../../../../components/Icon/DownChevronIcon';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { Checkbox } from '../../../../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { RoleAssigneePicker } from '../../../../../hcc/RoleAssigneePicker';
import { ProgramStatusRing } from '../program-detail/ProgramStatusRing/ProgramStatusRing.jsx';
import { stepProgress } from './CareProgramsTab.utils';
import styles from './CareProgramsTab.module.css';

export function CareProgramsTabTable({
  visible,
  selectedIdSet,
  allSelected,
  someSelected,
  toggleAll,
  toggleOne,
  openProgram,
  setStatusMenu,
  assignOwner,
  setRowMenu,
  rowMenuId,
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.checkCell}>
              <Checkbox
                checked={someSelected ? 'indeterminate' : allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all programs"
              />
            </th>
            <th className={styles.programCell}>Program Name</th>
            <th className={styles.statusCell}>Status</th>
            <th className={styles.dateCell}>Start Date</th>
            <th className={styles.dateCell}>End Date</th>
            <th className={styles.dateCell}>Last Updated</th>
            <th className={styles.assigneeCell}>Assignee</th>
            <th className={styles.pcpCell}>PCP</th>
            <th className={styles.actionsCell} aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {visible.map(p => (
            <tr key={p.id} className={styles.clickableRow} onClick={() => openProgram(p)}>
              <td className={styles.checkCell} onClick={e => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIdSet.has(p.id)}
                  onCheckedChange={() => toggleOne(p.id)}
                  aria-label={`Select ${p.name}`}
                />
              </td>
              <td className={styles.programCell}>
                <div className={styles.programName}>
                  <ProgramStatusRing progress={stepProgress(p.code)} size={16} />
                  <div className={styles.nameBlock}>
                    <span className={styles.nameText}>{p.name}</span>
                    {p.acuity && <span className={styles.acuityText}>Acuity : {p.acuity}</span>}
                  </div>
                </div>
              </td>
              <td className={styles.statusCell} onClick={e => e.stopPropagation()}>
                <button
                  className={styles.statusBtn}
                  style={{ color: p.statusColor }}
                  onClick={e => setStatusMenu({ id: p.id, rect: e.currentTarget.getBoundingClientRect() })}
                >
                  {p.status}
                  <DownChevronIcon size={16} color={p.statusColor} />
                </button>
              </td>
              <td className={styles.dateCell}>{p.startDate}</td>
              <td className={styles.dateCell}>{p.endDate}</td>
              <td className={styles.dateCell}>{p.lastUpdated}</td>
              <td className={styles.assigneeCell} onClick={e => e.stopPropagation()}>
                <RoleAssigneePicker
                  role="care_program"
                  memberId={p.id}
                  dosDate="care-program"
                  titleLabel=""
                  currentName={p.assignee && p.assignee !== 'Unassigned' ? p.assignee : null}
                  onAssign={user => assignOwner(p, user)}
                  trigger={({ ref, onClick }) => (
                    p.assignee && p.assignee !== 'Unassigned' ? (
                      <button ref={ref} type="button" data-assign-row={p.id} className={styles.assignName} onClick={onClick}>
                        {p.assignee}
                      </button>
                    ) : (
                      <button ref={ref} type="button" data-assign-row={p.id} className={styles.assignPill} onClick={onClick}>
                        <Icon name="solar:user-plus-rounded-linear" size={14} color="var(--neutral-200)" />
                        <span>Assign</span>
                      </button>
                    )
                  )}
                />
              </td>
              <td className={styles.pcpCell}>{p.pcp}</td>
              <td className={styles.actionsCell} onClick={e => e.stopPropagation()}>
                <ActionButton
                  icon="solar:menu-dots-linear"
                  size="S"
                  tooltip="More actions"
                  className={`${styles.rowMenuBtn} ${rowMenuId === p.id ? styles.rowMenuBtnOpen : ''}`}
                  onClick={e => setRowMenu({ id: p.id, rect: e.currentTarget.getBoundingClientRect() })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
