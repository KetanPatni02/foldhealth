import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNativeDialog } from '../../hooks/useNativeDialog';
import { AssigneeChange } from '../../components/AssigneeChange/AssigneeChange';
import { Banner } from '../../components/Banner/Banner';
import { Button } from '../../components/Button/Button';
import { CloseButton } from '../../components/CloseButton/CloseButton';
import { HoverCard } from '../../components/HoverCard/HoverCard';
import { Avatar } from '../../components/Avatar/Avatar';
import { Select } from '../../components/Select/Select';
import { useAppStore } from '../../store/useAppStore';
import { CMP_OWNER_ROLES } from './cmpCareTeam';
// Same dialog as the HEDIS bulk change (which shares the HCC one's CSS), so
// the worklists' bulk flows read as one system.
import styles from '../hcc/BulkChangeAssigneesDialog.module.css';
import own from '../hedis-worklist/BulkChangeHedisAssigneeDialog.module.css';
import cmp from './BulkChangeCmpAssigneeDialog.module.css';

const UNASSIGN = '__unassign';
const initialsOf = (name) => String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

/**
 * BulkChangeCmpAssigneeDialog: the CMP worklist BulkBar's Change Assignee.
 * The HEDIS bulk dialog's layout with Select Role on top and the selected
 * members' CMP sub-programs in place of gaps: each sub-program has its own
 * picker, and the picked user becomes that role on the sub-program for every
 * selected member enrolled in it. Picking Unassigned clears the role.
 *
 * Mounted only while open, so each opening starts fresh. If some
 * sub-programs fail to save, it stays open with just those picks so they
 * can be retried.
 *
 * Props:
 *  - memberCount  (number)              members selected
 *  - enrollments  (object[])            the selected members' cmp_members rows
 *  - users        (object[])            who the pickers offer
 *  - onClose      (function)
 *  - onApplied    (function)            fires after a successful apply
 */
export function BulkChangeCmpAssigneeDialog({ memberCount, enrollments, users, onClose, onApplied }) {
  const dialogRef = useNativeDialog(true);
  const setCmpCareTeam = useAppStore(s => s.setCmpCareTeam);
  const showToast = useAppStore(s => s.showToast);

  const [role, setRole] = useState('assignee');
  // Per sub-program: the user picked for it, or UNASSIGN to clear the role.
  const [picks, setPicks] = useState({});
  // Unassigned first: the staff list runs long, and at the end it's out of sight.
  const pickerUsers = useMemo(() => [{ id: UNASSIGN, name: 'Unassigned', initials: '-' }, ...(users || [])], [users]);
  // The open <dialog>, so each picker's menu renders inside its top layer.
  const [dialogEl, setDialogEl] = useState(null);
  const attachDialog = useCallback((el) => { dialogRef.current = el; setDialogEl(el); }, [dialogRef]);

  const roleLabel = CMP_OWNER_ROLES.find(r => r.key === role)?.label || 'Assignee';

  const rows = useMemo(() => {
    const bySub = new Map();
    for (const e of enrollments || []) {
      if (!e.subProgram) continue;
      bySub.set(e.subProgram, [...(bySub.get(e.subProgram) || []), e]);
    }
    return [...bySub.entries()].map(([subProgram, list]) => ({ subProgram, list }))
      .toSorted((a, b) => a.subProgram.localeCompare(b.subProgram));
  }, [enrollments]);

  const pickedSubs = Object.keys(picks);

  const handleApply = async () => {
    const results = await Promise.all(pickedSubs.map((sp) => {
      const ids = rows.find(r => r.subProgram === sp)?.list.map(e => e.id) || [];
      return setCmpCareTeam(ids, role, picks[sp].id === UNASSIGN ? null : picks[sp]);
    }));
    const saved = pickedSubs.filter((_, i) => results[i]);
    const failed = pickedSubs.filter((_, i) => !results[i]);
    if (saved.length) {
      showToast(`${roleLabel} updated on ${saved.length} sub-program${saved.length === 1 ? '' : 's'} (${saved.join(', ')})`);
    }
    if (failed.length) {
      // Keep the selection and only the failed picks, so Apply retries them.
      setPicks(p => Object.fromEntries(failed.map(sp => [sp, p[sp]])));
      showToast(`Could not save the ${roleLabel} for ${failed.join(', ')}. Try again.`);
      return;
    }
    onClose?.();
    onApplied?.();
  };

  return createPortal(
    <dialog
      ref={attachDialog}
      className={`${styles.dialog} ${own.dialogOverflow}`}
      aria-labelledby="bulk-cmp-assignee-title"
      onCancel={(e) => { e.preventDefault(); onClose?.(); }}
    >
      <div className={own.headerRow}>
        <div className={styles.header}>
          <h2 id="bulk-cmp-assignee-title" className={styles.title}>Bulk Change Assignees</h2>
          <p className={styles.subtitle}>
            Selected <strong>{memberCount} member{memberCount === 1 ? '' : 's'}</strong>
          </p>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <Banner size="sm">
        The current {roleLabel.toLowerCase()} in each sub-program you assign will be replaced with the user you pick, or cleared if you pick Unassigned.
      </Banner>

      <Select
        label="Select Role"
        options={CMP_OWNER_ROLES.map(r => ({ value: r.key, label: r.label }))}
        value={role}
        onValueChange={(next) => { setRole(next); setPicks({}); }}
      />

      {rows.length === 0 ? (
        <div className={styles.empty}>The selected members have no CMP sub-programs.</div>
      ) : (
        <div className={own.table} role="table" aria-label="Sub-programs and new assignees">
          <div className={`${own.headRow} ${cmp.cols}`} role="row">
            <span className={own.gapCol} role="columnheader">Sub Programs</span>
            <span className={own.assigneeCol} role="columnheader">Change {roleLabel} To</span>
          </div>
          {rows.map(({ subProgram, list }) => {
            const pick = picks[subProgram];
            const cleared = pick?.id === UNASSIGN;
            return (
              <div key={subProgram} className={`${own.row} ${cmp.cols}`} role="row">
                <span className={own.gapCol} role="cell">
                  <span className={`${own.gapCode} ${cmp.subName}`} title={subProgram}>{subProgram}</span>
                  {/* Hover: each member in this sub-program and who has the role now. */}
                  <HoverCard
                    portalContainer={dialogEl}
                    width={300}
                    flush
                    ariaLabel={`${subProgram} members`}
                    trigger={(
                      <span className={own.gapMeta}>
                        {list.length} Member{list.length === 1 ? '' : 's'}
                      </span>
                    )}
                  >
                    <table className={own.memberTable}>
                      <thead>
                        <tr><th>Member</th><th>{roleLabel}</th></tr>
                      </thead>
                      <tbody>
                        {list.map(e => (
                          <tr key={e.id}>
                            <td className={own.patientName}>{e.name}</td>
                            <td>
                              {e[role] ? (
                                <span className={own.patientAssignee}>
                                  <Avatar variant="staff" size="XS" initials={initialsOf(e[role])} />
                                  {e[role]}
                                </span>
                              ) : (
                                <span className={own.patientUnassigned}>Unassigned</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </HoverCard>
                </span>
                <span className={own.assigneeCol} role="cell">
                  <AssigneeChange
                    fillContainer
                    showRole={false}
                    unassigned={!pick || cleared}
                    unassignedLabel={cleared ? 'Unassigned' : 'Assign'}
                    name={pick?.name}
                    initials={pick?.initials}
                    users={pickerUsers}
                    pickerTitle={`${roleLabel} for ${subProgram}`}
                    portalContainer={dialogEl}
                    onSelect={(u) => setPicks(p => ({ ...p, [subProgram]: u }))}
                  />
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.footer}>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!pickedSubs.length} onClick={handleApply}>Apply Changes</Button>
      </div>
    </dialog>,
    document.body,
  );
}
