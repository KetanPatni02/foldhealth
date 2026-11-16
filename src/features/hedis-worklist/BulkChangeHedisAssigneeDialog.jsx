import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNativeDialog } from '../../hooks/useNativeDialog';
import { Icon } from '../../components/Icon/Icon';
import { AssigneeChange } from '../../components/AssigneeChange/AssigneeChange';
import { Button } from '../../components/Button/Button';
import { CloseButton } from '../../components/CloseButton/CloseButton';
import { HoverCard } from '../../components/HoverCard/HoverCard';
import { Avatar } from '../../components/Avatar/Avatar';
import { useAppStore } from '../../store/useAppStore';
// Reuses the HCC bulk-change dialog's CSS so both worklists' bulk flows
// read as one system: the HEDIS variant just drops role selection since
// HEDIS gaps have a single assignee rather than a per-role pool.
import styles from '../hcc/BulkChangeAssigneesDialog.module.css';
import own from './BulkChangeHedisAssigneeDialog.module.css';
import { MEASURE_NAMES } from './ClinicalNotePanel.utils';

/**
 * BulkChangeHedisAssigneeDialog: centred modal that opens from the HEDIS
 * worklist BulkBar's "Change Assignee" action when one or more rows are
 * selected. Lists each gap open on the selected patients with its own
 * assignee picker (Figma HCC-Workflow 13099:470165, Reviewers → Gaps); the
 * picked user becomes the assignee of that gap on every selected patient.
 *
 * Gaps already `Completed` or in a `Closed - *` state are skipped so the
 * update mirrors the row-picker's rule (only in-flight work reassigns).
 *
 * Props:
 *  - open         (boolean)             dialog visibility
 *  - selectedIds  (string[])            HEDIS member ids being bulk-updated
 *  - onClose      (function)            close + cancel
 *  - onApplied    (function({count}))   fires after a successful apply
 */
const TERMINAL_GAP_STATUSES = new Set(['Completed']);
const UNASSIGN = '__unassign';
const initialsOf = (name) => String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

function isGapReassignable(gap) {
  const status = gap?.status;
  if (!status) return true;
  if (TERMINAL_GAP_STATUSES.has(status)) return false;
  if (String(status).startsWith('Closed')) return false;
  return true;
}

export function BulkChangeHedisAssigneeDialog({ open, selectedIds, onClose, onApplied }) {
  const dialogRef = useNativeDialog(open);
  const hedisMembers = useAppStore(s => s.hedisMembers);
  const updateGapAssignee = useAppStore(s => s.updateGapAssignee);
  const showToast = useAppStore(s => s.showToast);
  const platformUsers = useAppStore(s => s.platformUsers);
  const fetchPlatformUsers = useAppStore(s => s.fetchPlatformUsers);
  useEffect(() => { fetchPlatformUsers(); }, [fetchPlatformUsers]);

  // Per gap code: the user picked for it, or UNASSIGN to clear it.
  const [picks, setPicks] = useState({});
  // The open <dialog>, so each picker's menu renders inside its top layer.
  const [dialogEl, setDialogEl] = useState(null);
  useEffect(() => { if (open) { setPicks({}); setDialogEl(dialogRef.current); } }, [open, dialogRef]);

  const users = useMemo(() => [
    ...(platformUsers || []).map(u => ({ id: u.id, name: u.name, initials: u.initials })),
    { id: UNASSIGN, name: 'Unassigned', initials: '-' },
  ], [platformUsers]);

  // One row per gap open on any selected patient (Completed / Closed gaps
  // keep their assignee), with those patients and who has the gap now.
  const gapRows = useMemo(() => {
    const byCode = new Map();
    for (const id of selectedIds || []) {
      const member = (hedisMembers || []).find(m => m.id === id);
      for (const g of member?.gaps || []) {
        if (g.supersededAt || !isGapReassignable(g)) continue;
        const assignee = g.assignee ?? member.assignee ?? null;
        byCode.set(g.code, [...(byCode.get(g.code) || []), { id: member.id, name: member.name, assignee }]);
      }
    }
    return [...byCode.entries()]
      .map(([code, patients]) => ({ code, name: MEASURE_NAMES[code] || code, patients }))
      .toSorted((a, b) => a.code.localeCompare(b.code));
  }, [hedisMembers, selectedIds]);

  const pickedCodes = Object.keys(picks);

  const handleApply = () => {
    if (!pickedCodes.length || !selectedIds?.length) return;
    let updated = 0;
    for (const memberId of selectedIds) {
      const member = (hedisMembers || []).find(m => m.id === memberId);
      for (const g of member?.gaps || []) {
        const pick = picks[g.code];
        if (!pick || g.supersededAt || !isGapReassignable(g)) continue;
        updateGapAssignee(memberId, g.code, pick.id === UNASSIGN ? null : pick.name);
        updated++;
      }
    }
    onClose?.();
    onApplied?.({ updated });
    if (updated) showToast(`Updated the assignee on ${updated} gap${updated === 1 ? '' : 's'}`);
  };

  if (!open) return null;

  return createPortal(
      <dialog
        ref={dialogRef}
        className={`${styles.dialog} ${own.dialogOverflow}`}
        aria-labelledby="bulk-hedis-assignee-title"
        onCancel={(e) => { e.preventDefault(); onClose?.(); }}
      >
        <div className={own.headerRow}>
          <div className={styles.header}>
            <h2 id="bulk-hedis-assignee-title" className={styles.title}>Bulk Change Assignees</h2>
            <p className={styles.subtitle}>
              Selected <strong>{selectedIds.length} patient{selectedIds.length === 1 ? '' : 's'}</strong>
            </p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className={styles.infoBanner}>
          <Icon name="solar:info-circle-linear" size={14} color="var(--status-info, #145ECC)" />
          <span>
            Existing assignees for the selected gaps will be replaced with the selected users.
            Gaps that are already Completed or Closed will not be changed.
          </span>
        </div>

        {gapRows.length === 0 ? (
          <div className={styles.empty}>No open gaps on the selected patients.</div>
        ) : (
          <div className={own.table} role="table" aria-label="Gaps and new assignees">
            <div className={own.headRow} role="row">
              <span className={own.gapCol} role="columnheader">Gaps</span>
              <span className={own.assigneeCol} role="columnheader">Change Assignee To</span>
            </div>
            {gapRows.map(row => {
              const pick = picks[row.code];
              const cleared = pick?.id === UNASSIGN;
              return (
                <div key={row.code} className={own.row} role="row">
                  <span className={own.gapCol} role="cell">
                    <span className={own.gapCode} title={`${row.code} - ${row.name}`}>{row.code}</span>
                    {/* Hover: each member with this gap and who has it now. */}
                    <HoverCard
                      portalContainer={dialogEl}
                      width={300}
                      flush
                      ariaLabel={`${row.code} members`}
                      trigger={(
                        <span className={own.gapMeta}>
                          {row.patients.length} Member{row.patients.length === 1 ? '' : 's'}
                        </span>
                      )}
                    >
                      <table className={own.memberTable}>
                        <thead>
                          <tr><th>Member</th><th>Assignee</th></tr>
                        </thead>
                        <tbody>
                          {row.patients.map(p => (
                            <tr key={p.id}>
                              <td className={own.patientName}>{p.name}</td>
                              <td>
                                {p.assignee ? (
                                  <span className={own.patientAssignee}>
                                    <Avatar variant="staff" size="XS" initials={initialsOf(p.assignee)} />
                                    {p.assignee}
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
                      name={pick && !cleared ? pick.name : undefined}
                      initials={pick && !cleared ? pick.initials : undefined}
                      users={users}
                      pickerTitle={`Assign ${row.code} to`}
                      portalContainer={dialogEl}
                      onSelect={(u) => setPicks(p => ({ ...p, [row.code]: u }))}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className={styles.footer}>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!pickedCodes.length} onClick={handleApply}>
            Apply Changes
          </Button>
        </div>
      </dialog>,
    document.body,
  );
}
