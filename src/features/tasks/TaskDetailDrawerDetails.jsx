import { useEffect } from 'react';
import { sanitizeRichText } from '../../lib/sanitizeHtml';
import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Button } from '../../components/Button/Button';
import { Badge } from '../../components/Badge/Badge';
import { Avatar } from '../../components/Avatar/Avatar';
import { CommentComposer } from '../../components/CommentComposer/CommentComposer';
import { Toggle } from '../../components/Toggle/Toggle';
import { useAppStore } from '../../store/useAppStore';
import { Select } from '../../components/Select/Select';
import { LABEL_OPTIONS, TITLE_MAX, getInitials, isOverdue, STATUS_LABELS, STATUS_BADGE_VARIANTS, PRIORITY_OPTIONS } from './TasksView.utils';
import { PriorityIcon } from './TasksViewIcons';
import { TaskDatePicker, DetailDropdown } from './TasksViewDropdowns';
import styles from './TasksView.module.css';

export function TaskDetailDrawerDetails({
  task, labels, assigneeNames, taskProfiles, updateTask, showToast, assigneeInitials,
  taskPools, memberOptionsForDrawer, memberInitials, setPdfPreview, hedisMember,
  setEditingNote, setPreviewSignedNote, completeCareGapSignOffTask, onClose, editingDesc, setEditingDesc, descDraft, setDescDraft,
}) {
  // The sign-off task is linked to a clinical_notes row via review_task_id.
  // Surface it right below the description so the reviewer can jump into
  // the note preview without needing to navigate back to the care gap.
  // Ensure the slice is populated for this member on drawer open — the
  // tasks page path never touched CareGapDetailDrawer, so the slice
  // starts empty here even when the note exists on the server.
  const fetchClinicalNotesForMember = useAppStore(s => s.fetchClinicalNotesForMember);
  const hedisMembers = useAppStore(s => s.hedisMembers);
  // The Tasks page never touches CareGapDetailDrawer, so sign-off tasks
  // arriving here from the Tasks tab don't carry hedisMemberId /
  // hedisGapCodes on the row (those live on the CareGap flow's in-memory
  // state, not on the persisted task). Derive the HEDIS member from the
  // task's member name so the Linked Note surfaces here the same way it
  // does from the CareGap flow.
  const resolvedHedisMemberId = task?.hedisMemberId
    || (task?.pool === 'HEDIS Sign-Off' && task?.member
      ? hedisMembers.find(m => m.name === task.member)?.id
      : null)
    || null;
  useEffect(() => {
    if (resolvedHedisMemberId) fetchClinicalNotesForMember?.(resolvedHedisMemberId);
  }, [resolvedHedisMemberId, fetchClinicalNotesForMember]);
  const linkedNote = useAppStore(s => {
    // Fast path: the task carries the member id already (CareGap flow).
    if (resolvedHedisMemberId) {
      const list = s.clinicalNotesByMember?.[resolvedHedisMemberId] || [];
      const byLink = list.find(n => String(n.reviewTaskId) === String(task.id));
      if (byLink) return byLink;
      const gaps = task.hedisGapCodes || task.labels || [];
      if (gaps.length) {
        const hit = list.find(n => (n.gapCodes || []).some(c => gaps.includes(c)));
        if (hit) return hit;
      }
    }
    // Fallback: scan every fetched member slice for a note linked to this
    // task id. Reaches any note that has been fetched anywhere else in the
    // session, even when we couldn't resolve the member id up front.
    const all = s.clinicalNotesByMember || {};
    for (const list of Object.values(all)) {
      const byLink = (list || []).find(n => String(n.reviewTaskId) === String(task.id));
      if (byLink) return byLink;
    }
    return null;
  });
  return (
    <>
        {/* Detail rows */}
        <div className={styles.drawerDetails}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Assigned To</span>
            <DetailDropdown
              value={task.assigned_to}
              options={assigneeNames}
              onSelect={v => {
                const picked = (taskProfiles || []).find(p => p.name === v);
                // Same claim semantics as the row cell — an owner and a pool
                // are mutually exclusive.
                updateTask(task.id, { assigned_to: v, assigned_to_id: picked?.id || null, pool: null });
                showToast(`Assigned to ${v}`);
              }}
              renderOption={opt => (
                <><Avatar variant="assignee" initials={getInitials(opt)} size="S" /> {opt}</>
              )}
            >
              <Avatar variant="assignee" initials={assigneeInitials} size="S" />
              <span>{task.assigned_to || '—'}</span>
            </DetailDropdown>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Task Pool</span>
            <DetailDropdown
              value={task.pool || '— None —'}
              options={['— None —', ...taskPools.map(p => p.name)]}
              onSelect={v => {
                const next = v === '— None —' ? null : v;
                // A pooled task is unclaimed by definition — both the "My Task
                // Pool" tab and the Claim button require no assignee. Pooling
                // without dropping the assignee left the task invisible in
                // both places. Mirrors the Add Task drawer, which already
                // nulls the assignee whenever a pool is picked.
                updateTask(task.id, next
                  ? { pool: next, assigned_to: null, assigned_to_id: null }
                  : { pool: null });
                showToast(next ? `Pool set to ${next}` : 'Removed from pool');
              }}
            />
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Due Date</span>
            <TaskDatePicker value={task.due_date} overdue={isOverdue(task)} onSelect={v => { updateTask(task.id, { due_date: v }); showToast('Due date updated'); }} />
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Priority</span>
            <DetailDropdown
              value={task.priority}
              options={PRIORITY_OPTIONS}
              onSelect={v => { updateTask(task.id, { priority: v }); showToast(`Priority set to ${v}`); }}
              renderOption={opt => (
                <><PriorityIcon priority={opt} size={16} /> <span style={{ textTransform: 'capitalize' }}>{opt}</span></>
              )}
            >
              <PriorityIcon priority={task.priority} size={16} />
              <span style={{ textTransform: 'capitalize' }}>{task.priority}</span>
            </DetailDropdown>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Member</span>
            <DetailDropdown
              value={task.member}
              options={memberOptionsForDrawer}
              onSelect={v => { updateTask(task.id, { member: v }); showToast(`Member set to ${v}`); }}
              renderOption={opt => (
                <><Avatar variant="patient" initials={getInitials(opt)} size="S" /> {opt}</>
              )}
            >
              <Avatar variant="patient" initials={memberInitials} size="S" />
              <span>{task.member}</span>
            </DetailDropdown>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Labels</span>
            <div className={styles.detailValueLabels}>
              {labels.map(l => (
                <Badge
                  key={l}
                  variant="overflow"
                  label={l}
                  trailingIcon="solar:close-circle-linear"
                  trailingIconLabel={`Remove ${l}`}
                  onTrailingIconClick={() => {
                    updateTask(task.id, { labels: labels.filter(x => x !== l) });
                    showToast(`Label "${l}" removed`);
                  }}
                />
              ))}
              <DetailDropdown
                value=""
                options={LABEL_OPTIONS.filter(l => !labels.includes(l))}
                onSelect={v => {
                  updateTask(task.id, { labels: [...labels, v] });
                  showToast(`Label "${v}" added`);
                }}
              >
                <Icon name="solar:add-circle-linear" size={14} color="var(--neutral-200)" />
              </DetailDropdown>
            </div>
          </div>
        </div>

        {/* HEDIS Sign-Off: consolidated PDF + completion CTA. Only renders
            for tasks created by createCareGapSignOffTask (i.e. hedisMemberId set). */}
        {task.hedisMemberId && task.consolidatedPdf?.blob && (
          <div className={styles.drawerSection}>
            <span className={styles.drawerSectionLabel}>Consolidated Clinical Note</span>
            <button
              type="button"
              className={styles.hedisPdfCard}
              onClick={() => setPdfPreview(task.consolidatedPdf)}
            >
              <span className={styles.hedisPdfIcon}>
                <Icon name="solar:document-text-linear" size={20} color="var(--primary-300)" />
              </span>
              <span className={styles.hedisPdfInfo}>
                <span className={styles.hedisPdfName}>
                  {task.consolidatedPdf.filename || 'consolidated-clinical-note.pdf'}
                </span>
                <span className={styles.hedisPdfMeta}>
                  Covers {(task.hedisGapCodes || []).length} care gap{(task.hedisGapCodes || []).length === 1 ? '' : 's'} · click to preview
                </span>
              </span>
              <span className={styles.hedisPdfOpenBadge}>
                <Icon name="solar:eye-linear" size={14} color="var(--neutral-300)" />
                Preview
              </span>
            </button>

            {task.status !== 'completed' && (
              <div className={styles.hedisSignOffRow}>
                {hedisMember && (
                  <Button
                    variant="secondary"
                    size="L"
                    leadingIcon="solar:pen-new-square-linear"
                    onClick={() => setEditingNote(true)}
                  >
                    Edit clinical note
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="L"
                  leadingIcon="solar:check-circle-linear"
                  onClick={() => {
                    completeCareGapSignOffTask(task.id, 'NP');
                    showToast('Sign-off complete — all gaps marked Completed');
                    onClose?.();
                  }}
                >
                  Complete sign-off
                </Button>
                <span className={styles.hedisSignOffHint}>
                  Marks all gaps ({(task.hedisGapCodes || []).join(', ')}) as Completed.
                </span>
              </div>
            )}
            {task.status === 'completed' && (
              <div className={styles.hedisSignOffComplete}>
                <Icon name="solar:check-circle-bold" size={16} color="var(--status-success)" />
                Sign-off complete — gaps closed.
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <div className={styles.drawerSection}>
          <span className={styles.drawerSectionLabel}>Description</span>
          {editingDesc ? (
            <div className={styles.descEditor}>
              <div
                className={styles.descEditable}
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(descDraft) }}
                onInput={e => setDescDraft(e.currentTarget.innerHTML)}
              />
              <div className={styles.descToolbar}>
                <ActionButton icon="solar:paperclip-linear" size="S" tooltip="Attach" />
                <span className={styles.toolbarDivider} />
                <ActionButton icon="solar:text-bold-linear" size="S" tooltip="Bold" onClick={() => document.execCommand('bold')} />
                <ActionButton icon="solar:text-italic-linear" size="S" tooltip="Italic" onClick={() => document.execCommand('italic')} />
                <ActionButton icon="solar:text-underline-linear" size="S" tooltip="Underline" onClick={() => document.execCommand('underline')} />
                <ActionButton icon="solar:text-cross-linear" size="S" tooltip="Strikethrough" onClick={() => document.execCommand('strikeThrough')} />
                <span className={styles.toolbarDivider} />
                <ActionButton icon="solar:list-linear" size="S" tooltip="List" onClick={() => document.execCommand('insertUnorderedList')} />
                <div style={{ flex: 1 }} />
                <ActionButton icon="solar:close-circle-linear" size="S" tooltip="Discard" onClick={() => setEditingDesc(false)} />
                <ActionButton icon="solar:check-read-linear" size="S" tooltip="Save" onClick={() => { updateTask(task.id, { description: descDraft }); setEditingDesc(false); showToast('Description saved'); }} />
              </div>
            </div>
          ) : (
            <div
              className={styles.descriptionBox}
              onClick={() => { setDescDraft(task.description || ''); setEditingDesc(true); }}
              dangerouslySetInnerHTML={{ __html: task.description ? sanitizeRichText(task.description) : '<span style="color: var(--neutral-200);">Click to add description...</span>' }}
            />
          )}
        </div>

        {(linkedNote || syntheticLinkedNoteFromTask(task)) && (
          <div className={styles.drawerSection}>
            <span className={styles.drawerSectionLabel}>Linked Note</span>
            <LinkedNoteCard
              note={linkedNote || syntheticLinkedNoteFromTask(task)}
              task={task}
              synthetic={!linkedNote}
              setEditingNote={setEditingNote}
              setPreviewSignedNote={setPreviewSignedNote}
              showToast={showToast}
            />
          </div>
        )}
    </>
  );
}

/* Card rendered under the "Linked Note" section — mirrors the Clinical
   Notes tab card so the reviewer sees the same meta / title / status
   layout they clicked from. The "View ↗" affordance opens the same
   ClinicalNotePanel edit path the "Edit clinical note" CTA uses so the
   reviewer can amend before signing. */
// HEDIS Sign-Off tasks seeded server-side (Jamal Foster / Marcus Reid /
// Patricia Nguyen etc.) predate the clinical_notes flow, so they have no
// persisted note to link. Synthesize a display-only note object from the
// task's own gap-code labels + member + status so the reviewer still sees
// the Linked Note surface everywhere, not just for tasks that went through
// the full sign-off flow. The synthetic note has no payload, so its View
// affordance is a toast — the real note doesn't exist yet.
function syntheticLinkedNoteFromTask(task) {
  if (!task) return null;
  if (task.pool !== 'HEDIS Sign-Off') return null;
  const codes = Array.isArray(task.labels) ? task.labels.filter(l => typeof l === 'string' && /^[A-Z0-9]{2,10}$/.test(l)) : [];
  if (!codes.length) return null;
  const status = task.status === 'completed' ? 'signed'
    : task.status === 'pending' ? 'draft'
    : 'submitted';
  return {
    id: null,
    __synthetic: true,
    gapCodes: codes,
    status,
    authorName: task.created_by || 'System',
    signedByName: status === 'signed' ? (task.assigned_to || 'Reviewer') : null,
    signedAt: status === 'signed' ? (task.completed_at || task.updated_at) : null,
    reviewerName: task.assigned_to || null,
    updatedAt: task.updated_at || task.created_at,
    createdAt: task.created_at,
  };
}

function LinkedNoteCard({ note, task, synthetic = false, setEditingNote, setPreviewSignedNote, showToast }) {
  const codes = note.gapCodes?.length ? note.gapCodes : (task.hedisGapCodes || []);
  const title = codes.length > 1 ? 'Consolidated Clinical Note' : `${codes[0] || task.hedisGapCodes?.[0] || 'Clinical'} Visit Note`;
  const status = note.status === 'signed' ? 'Signed'
    : note.status === 'submitted' ? 'Pending Review'
    : 'Draft';
  const statusTone = status === 'Signed' ? 'success' : status === 'Draft' ? 'grey' : 'warning';
  const authorLine = note.status === 'signed'
    ? `Signed by ${note.signedByName || note.reviewerName || 'Provider'}${note.signedAt ? ` · ${fmtDate(note.signedAt)}` : ''}`
    : note.status === 'submitted'
      ? `Submitted for Review to ${note.reviewerName || '—'}`
      : `Save as Draft by ${note.authorName || 'You'}`;
  const metaWhen = note.updatedAt || note.createdAt;
  return (
    <div className={styles.linkedNoteCard}>
      <div className={styles.linkedNoteMeta}>
        {metaWhen ? `${fmtDate(metaWhen)}, ${fmtTime(metaWhen)}` : ''}
        {note.authorName ? ` • ${note.authorName}` : ''}
      </div>
      <div className={styles.linkedNoteRow}>
        <div className={styles.linkedNoteText}>
          <div className={styles.linkedNoteTitleRow}>
            <span className={styles.linkedNoteTitle}>{title}</span>
            {codes.length > 1 && <Badge tone="grey" size="S" label={`${codes.length} Gaps`} />}
          </div>
          <div className={styles.linkedNoteSubtitle}>{authorLine}</div>
        </div>
        <div className={styles.linkedNoteTrailing}>
          <Badge tone={statusTone} size="M" label={status} />
          <button
            type="button"
            className={styles.linkedNoteView}
            onClick={() => {
              // Synthetic linked notes are placeholders for seed sign-off
              // tasks that predate the clinical_notes flow — there is no
              // real payload to open, so we surface a toast instead of
              // routing into a broken editor.
              if (synthetic) {
                showToast?.('Note preview is available once the care gap flow saves this note.');
                return;
              }
              // Signed notes open the read-only preview drawer — direct
              // edits aren't allowed once a note is Signed (Amend is the
              // audit path elsewhere). Draft / Pending Review still open
              // the editable ClinicalNotePanel via setEditingNote.
              if (note.status === 'signed' && setPreviewSignedNote) {
                setPreviewSignedNote(note);
              } else {
                setEditingNote?.(true);
              }
            }}
          >
            View
            <Icon name="solar:arrow-right-up-linear" size={12} color="var(--primary-300)" />
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}
function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
