import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../../../../../store/useAppStore';
import { Icon } from '../../../../../../components/Icon/Icon';
import { Button } from '../../../../../../components/Button/Button';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { Badge } from '../../../../../../components/Badge/Badge';
import { Tooltip } from '../../../../../../components/Tooltip/Tooltip';
import { KanbanCardContent } from '../../../../../tasks/TasksViewKanban';
import { MenuPopover } from '../../../../../../components/MenuPopover/MenuPopover';
import { ConfirmDialog } from '../../../../../../components/ConfirmDialog/ConfirmDialog';
import { NonVisitNoteDrawer } from './NonVisitNoteDrawer';
import { useClinicalNotePanel } from '../../../../../hedis-worklist/useClinicalNotePanel';
import { ConsolidatedNoteBody, HeaderActions as ClinicalNoteHeaderActions } from '../../../../../hedis-worklist/ClinicalNotePanelParts';
import { ClinicalNotePreviewBody } from '../../../../../hedis-worklist/ClinicalNotePreviewBody';
import { HeaderCell } from '../../../../../../components/HeaderCell/HeaderCell';
import { useTableSort } from '../../../../../../components/HeaderCell/useTableSort';
import styles from './PatientNotesTab.module.css';

/**
 * PatientNotesTab — the P360 → Notes surface.
 *
 * Reads `clinicalNotesByPatient[patientId]` (Supabase `clinical_notes`
 * table, indexed by `patient_id`). Fetches once per patient open. Every
 * note created anywhere in Fold that lands in `clinical_notes` shows up
 * here — currently that's the HEDIS Care Gap workflow; P1-3 wires the
 * other origins.
 *
 * Row shape: date · title · gap chips · status pill · author · reviewer
 * · view action. Click a row → `openNotePreview(note)` opens the same
 * standalone preview drawer the Tasks-page paperclip hover uses, so the
 * viewer experience is consistent.
 */
export function PatientNotesTab({ patient }) {
  // A patient can be identified by more than one string across origins:
  // the patients-slice `id` (e.g. 'p8'), the fold `memberId` (10985), and
  // the worklist id the note was actually written under (e.g. HEDIS
  // 'ap-011'). Read `selectedPatientId` too since it's the deep-link
  // id — the writer for HEDIS-origin notes uses that string.
  const selectedPatientId = useAppStore(s => s.selectedPatientId);
  // Also resolve the HEDIS-worklist id for this patient (matched by
  // memberId or by the deep-link id itself) — HEDIS-origin notes use
  // that id as their `patient_id` today.
  const hedisMembers = useAppStore(s => s.hedisMembers);
  const hedisMemberId = useMemo(() => {
    if (!hedisMembers?.length) return null;
    const memberIdStr = patient?.memberId != null ? String(patient.memberId) : null;
    const hit = hedisMembers.find(m => (
      m.id === selectedPatientId
      || m.id === patient?.id
      || (memberIdStr && String(m.memberId) === memberIdStr)
    ));
    return hit?.id || null;
  }, [hedisMembers, selectedPatientId, patient?.id, patient?.memberId]);
  const candidateIds = [
    selectedPatientId,
    patient?.id,
    patient?.memberId != null ? String(patient.memberId) : null,
    hedisMemberId,
  ].filter(Boolean);
  const uniqueIds = Array.from(new Set(candidateIds));
  // Read the raw maps (stable references) and derive the merged list with
  // useMemo so the selector doesn't allocate a fresh array on every
  // store update — that would spin the getSnapshot infinite-loop guard.
  //
  // The HEDIS Care Gap flow writes with `patient_id = member.id` (e.g.
  // 'ap-011') and keys `clinicalNotesByMember` by the same string. The
  // patients slice uses a different canonical id ('p8'), and there's no
  // FK from `clinical_notes.patient_id` to `patients.id` today. Until
  // the origin-unification work lands (P1-3) we scan every alias the
  // patient might be known by, across both maps.
  const clinicalNotesByPatient = useAppStore(s => s.clinicalNotesByPatient);
  const clinicalNotesByMember = useAppStore(s => s.clinicalNotesByMember);
  const notes = useMemo(() => {
    const out = [];
    const seen = new Set();
    const collect = (map) => {
      if (!map) return;
      for (const key of uniqueIds) {
        for (const n of (map[key] || [])) {
          if (!seen.has(n.id)) { seen.add(n.id); out.push(n); }
        }
      }
    };
    collect(clinicalNotesByPatient);
    collect(clinicalNotesByMember);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicalNotesByPatient, clinicalNotesByMember, uniqueIds.join('|')]);
  const fetchClinicalNotesForMember = useAppStore(s => s.fetchClinicalNotesForMember);
  const fetchClinicalNotesForPatient = useAppStore(s => s.fetchClinicalNotesForPatient);
  const patientId = uniqueIds[0] || null;

  useEffect(() => {
    // Fetch under every alias so a note written by any origin surfaces.
    // Both calls are cheap `.eq(...)` queries and idempotent — they
    // upsert into the store map without duplicating rows.
    for (const id of uniqueIds) {
      fetchClinicalNotesForPatient?.(id);
      fetchClinicalNotesForMember?.(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueIds.join('|'), fetchClinicalNotesForPatient, fetchClinicalNotesForMember]);

  // Enrich each row with the derived fields the HeaderCell sort keys
  // read against. Keeps useTableSort's generic comparator simple —
  // "sortTitle" is the same string the row renders, so the sort
  // matches what the reviewer sees.
  const templatesById = useAppStore(s => s.noteTemplatesById);
  const allTasks = useAppStore(s => s.tasks);
  // Index sign-off tasks by note id once, so each row can look up its
  // linked tasks in O(1) instead of scanning the whole tasks list.
  const tasksByNote = useMemo(() => {
    const map = new Map();
    for (const t of (allTasks || [])) {
      const nid = t.linkedNoteId || t.noteId;
      if (!nid) continue;
      const list = map.get(nid) || [];
      list.push(t);
      map.set(nid, list);
    }
    return map;
  }, [allTasks]);
  const rows = useMemo(() => (notes || []).map(n => {
    const codes = n.gapCodes || [];
    const template = n.formId ? templatesById?.[n.formId] : null;
    const isNormal = n.formType === 'normal_note';
    const isNonVisit = n.formType === 'non_visit_note' || isNormal;
    const isTemplateDriven = !!template && n.payload?.answers && typeof n.payload.answers === 'object';
    const title = isTemplateDriven
      ? template.name
      : isNonVisit
        ? (n.payload?.title || (isNormal ? 'Clinical Note' : 'Non-Visit Note'))
        : codes.length > 1
          ? 'Consolidated Clinical Note'
          : codes[0]
            ? `${codes[0]} Visit Note`
            : 'Clinical Note';
    const templateName = template?.name
      || (isNormal ? 'Clinical Note' : isNonVisit
        ? 'Non-Visit Note'
        : (n.formType || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          || (codes[0] ? `${codes[0]} Visit Note` : 'Clinical Note'));
    // Sign-off task lookup: notes carry `reviewTaskId` for the paired
    // Request-for-Sign-off task; also collect any tasks that name this
    // note in `linkedNoteId` / `noteId` (patient-noted tasks, follow-
    // ups) via the tasksByNote index.
    const linkedFromIndex = tasksByNote.get(n.id) || [];
    const reviewTask = n.reviewTaskId
      ? (allTasks || []).find(t => String(t.id) === String(n.reviewTaskId))
      : null;
    const linkedTasks = reviewTask
      ? [reviewTask, ...linkedFromIndex.filter(t => t.id !== reviewTask.id)]
      : linkedFromIndex;
    // useTableSort's ISO-date detector wants YYYY-MM-DD, so we hand
    // over the raw ISO strings for Last Updated / Created By dates.
    return {
      ...n,
      sortTitle: title,
      sortStatus: n.status || '',
      sortAuthor: n.authorName || '',
      sortUpdated: n.updatedAt || n.createdAt || '',
      sortTemplate: templateName,
      sortLinkedTaskCount: linkedTasks.length,
      linkedTasks,
    };
  }), [notes, templatesById, tasksByNote, allTasks]);
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(rows, 'sortUpdated', 'desc');

  const [showNonVisitDrawer, setShowNonVisitDrawer] = useState(false);
  // Inline note view — set to a note when the user clicks a row so the
  // note opens inside this panel (like the timeline/notes card in the
  // reviewer mock) rather than the shared preview overlay. Cleared by
  // the inline pane's back button.
  const [inlineNoteId, setInlineNoteId] = useState(null);
  const inlineNote = useMemo(
    () => (inlineNoteId ? sorted.find(n => n.id === inlineNoteId) || null : null),
    [inlineNoteId, sorted],
  );
  // Resolve the HEDIS member the inline note belongs to. The inline
  // reviewer-editor uses useClinicalNotePanel which requires a member
  // with a `gaps[]` array.
  const inlineMember = useMemo(() => {
    if (!inlineNote) return null;
    return hedisMembers?.find(m => (
      m.id === inlineNote.hedisMemberId
      || m.id === inlineNote.patientId
    )) || null;
  }, [inlineNote, hedisMembers]);

  if (!patientId) return null;

  if (inlineNote) {
    return (
      <div className={`${styles.card} ${styles.cardInline}`}>
        <InlineNoteView
          note={inlineNote}
          member={inlineMember}
          onBack={() => setInlineNoteId(null)}
        />
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Clinical Notes</span>
        <div className={styles.sectionActions}>
          <ActionButton
            icon="solar:add-circle-linear"
            size="S"
            tooltip="New Note"
            onClick={() => setShowNonVisitDrawer(true)}
          />
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="solar:notes-linear" size={40} color="var(--neutral-200)" />
          <span className={styles.emptyTitle}>No clinical notes yet</span>
          <span className={styles.emptyBody}>
            Notes created from the Care Gap workflow will appear here once the
            patient has one, or start a new note right from here.
          </span>
          <Button
            variant="primary"
            size="M"
            leadingIcon="solar:add-circle-linear"
            onClick={() => setShowNonVisitDrawer(true)}
          >
            New Note
          </Button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkCol} />
                <HeaderCell
                  label="Note Title"
                  sortField="sortTitle"
                  sortType="alpha"
                  activeKey={sortKey}
                  activeDir={sortDir}
                  onSort={requestSort}
                />
                <HeaderCell
                  label="Status"
                  sortField="sortStatus"
                  sortType="alpha"
                  activeKey={sortKey}
                  activeDir={sortDir}
                  onSort={requestSort}
                />
                <HeaderCell
                  label="Created By"
                  sortField="sortAuthor"
                  sortType="alpha"
                  activeKey={sortKey}
                  activeDir={sortDir}
                  onSort={requestSort}
                />
                <HeaderCell
                  label="Last Updated"
                  sortField="sortUpdated"
                  sortType="date"
                  activeKey={sortKey}
                  activeDir={sortDir}
                  onSort={requestSort}
                />
                <HeaderCell
                  label="Linked Task"
                  sortField="sortLinkedTaskCount"
                  sortType="number"
                  activeKey={sortKey}
                  activeDir={sortDir}
                  onSort={requestSort}
                />
                <HeaderCell
                  label="Template Name"
                  sortField="sortTemplate"
                  sortType="alpha"
                  activeKey={sortKey}
                  activeDir={sortDir}
                  onSort={requestSort}
                />
                {/* Empty header — the trailing actions column is a
                    fixed-width slot for the row kebab; nothing to
                    sort on. Keeps the row height matched via .th. */}
                <th className={styles.actionsCol} aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(note => (
                <NoteRow
                  key={note.id}
                  note={note}
                  onOpen={() => setInlineNoteId(note.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNonVisitDrawer && (
        <NonVisitNoteDrawer patient={patient} onClose={() => setShowNonVisitDrawer(false)} />
      )}
    </div>
  );
}

const ORIGIN_LABEL = {
  care_gap: 'Care Gap',
  care_program: 'Care Program',
  care_plan_goal: 'Goal',
  care_plan_intervention: 'Intervention',
  diagnosis_gap: 'Diagnosis Gap',
  task: 'Task',
  patient: 'Patient',
};

function NoteRow({ note, onOpen }) {
  const openNotePreview = useAppStore(s => s.openNotePreview);
  const deleteClinicalNote = useAppStore(s => s.deleteClinicalNote);
  const templatesById = useAppStore(s => s.noteTemplatesById);
  const showToast = useAppStore(s => s.showToast);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuBtnRef = useRef(null);
  const codes = note.gapCodes || [];
  const template = note.formId ? templatesById?.[note.formId] : null;
  const isNormal = note.formType === 'normal_note';
  const isNonVisit = note.formType === 'non_visit_note' || isNormal;
  const isTemplateDriven = !!template && note.payload?.answers && typeof note.payload.answers === 'object';
  const title = isTemplateDriven
    ? template.name
    : isNonVisit
      ? (note.payload?.title || (isNormal ? 'Clinical Note' : 'Non-Visit Note'))
      : codes.length > 1
        ? 'Consolidated Clinical Note'
        : codes[0]
          ? `${codes[0]} Visit Note`
          : 'Clinical Note';
  const subtitle = isTemplateDriven
    ? (codes.length ? codes.join(' · ') : (template.description || 'Clinical Note'))
    : isNonVisit
      ? (note.payload?.body ? shorten(note.payload.body, 80) : '—')
      : codes.length
        ? codes.join(' · ')
        : (ORIGIN_LABEL[note.originKind] || 'Clinical Note');
  // Match the HEDIS Care Gap drawer's status vocabulary + tone tokens
  // (Draft = grey, Pending Review = warning, Signed = success). Using
  // "In Progress" here was a divergent label that made the P360 Notes
  // tab look like it tracked a different lifecycle than the rest of
  // the app.
  const status = note.status === 'signed'
    ? { label: 'Signed', tone: 'success' }
    : note.status === 'submitted'
      ? { label: 'Pending Review', tone: 'warning' }
      : { label: 'Draft', tone: 'grey' };
  const templateName = template?.name
    || (isNormal ? 'Clinical Note' : isNonVisit
      ? 'Non-Visit Note'
      : (note.formType || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        || (codes[0] ? `${codes[0]} Visit Note` : 'Clinical Note'));

  // Row click routes into the inline note view (owned by
  // PatientNotesTab). The kebab menu's Preview action still opens the
  // shared drawer for a quick popover-style read; the inline surface
  // is the primary flow.
  const handlePreview = () => { onOpen?.(); };
  const handleOverlayPreview = () => openNotePreview?.(note);
  const handlePrint = () => {
    const url = note.pdfDataUrl;
    if (url) {
      const w = window.open(url, '_blank');
      try { w?.focus(); } catch { /* ignore */ }
    } else {
      showToast?.('No PDF available for this note');
    }
  };
  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    const ok = await deleteClinicalNote?.(note.id);
    showToast?.(ok ? 'Note deleted' : 'Failed to delete note');
  };

  return (
    <tr className={styles.tr} onClick={handlePreview}>
      <td className={styles.checkCol} onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" className={styles.checkbox} aria-label={`Select ${title}`} />
      </td>
      <td>
        <div className={styles.noteTitle}>{title}</div>
        <div className={styles.noteSub}>{subtitle}</div>
      </td>
      <td>
        <Badge tone={status.tone} size="M" label={status.label} />
      </td>
      <td>
        <div>{note.authorName || '—'}</div>
        <div className={styles.dateText}>{formatDate(note.createdAt)}</div>
      </td>
      <td>
        <div>{note.signedByName || note.reviewerName || note.authorName || '—'}</div>
        <div className={styles.dateText}>{formatDate(note.updatedAt || note.createdAt)}</div>
      </td>
      <td>
        <LinkedTasksCell tasks={note.linkedTasks || []} />
      </td>
      <td className={styles.templateCell}>
        <span className={styles.templateText}>{templateName}</span>
      </td>
      <td className={styles.actionsCell} onClick={(e) => e.stopPropagation()}>
        <span className={styles.rowKebab}>
          <ActionButton
            ref={menuBtnRef}
            icon="solar:menu-dots-linear"
            size="L"
            tooltip="Note actions"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
          />
        </span>
        {menuOpen && (
          <MenuPopover
            anchorRef={menuBtnRef}
            items={[
              { key: 'preview', label: 'Preview', icon: 'solar:eye-linear' },
              { key: 'print', label: 'Print Note', icon: 'solar:printer-linear' },
              { key: 'delete', label: 'Delete Note', icon: 'solar:trash-bin-trash-linear', danger: true },
            ]}
            onSelect={(key) => {
              if (key === 'preview') handleOverlayPreview();
              else if (key === 'print') handlePrint();
              else if (key === 'delete') setShowDeleteConfirm(true);
            }}
            onClose={() => setMenuOpen(false)}
            width={180}
            align="right"
            ariaLabel="Note actions"
          />
        )}
        {showDeleteConfirm && (
          <ConfirmDialog
            icon="solar:danger-triangle-linear"
            iconColor="var(--status-error)"
            title="Delete this note?"
            description="This will permanently remove the note. This cannot be undone."
            confirmLabel="Delete"
            cancelLabel="Cancel"
            variant="error"
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </td>
    </tr>
  );
}

// Linked-task pill for the Notes table's new "Linked Task" column.
// Renders a status-tinted Badge with the count, or "—" when the note
// has no sign-off task. Hovering the badge surfaces a rich tooltip
// with each task's title, due date, and assignee — the same info the
// Kanban card carries — so a reviewer doesn't have to click through
// to the Tasks page just to see who owes what.
function LinkedTasksCell({ tasks }) {
  if (!tasks?.length) {
    return <span style={{ color: 'var(--neutral-300)' }}>—</span>;
  }
  // Worst status wins the badge color: missed > pending > completed.
  const anyMissed = tasks.some(t => isTaskOverdue(t) && String(t.status || '').toLowerCase() !== 'completed');
  const anyPending = tasks.some(t => {
    const s = String(t.status || '').toLowerCase();
    return s !== 'completed' && !isTaskOverdue(t);
  });
  const tone = anyMissed ? 'error' : anyPending ? 'warning' : 'success';
  const icon = anyMissed
    ? 'solar:danger-triangle-linear'
    : anyPending
      ? 'solar:clock-circle-linear'
      : 'solar:check-circle-linear';
  return (
    <Tooltip
      label={<LinkedTasksTooltip tasks={tasks} />}
      placement="top"
      variant="light"
      maxWidth={460}
    >
      <span style={{ display: 'inline-flex' }}>
        <Badge tone={tone} size="M" label={String(tasks.length)} icon={icon} />
      </span>
    </Tooltip>
  );
}

// Rich hover body: renders the same KanbanCardContent the Tasks page
// uses so the reviewer sees the full card (priority + due, title,
// gap chips, member link, assignee, By: + attachments) exactly as it
// would appear on the Tasks board. `onToggle` is a no-op — hovering
// is a read; nothing mutates. When more than one task is linked, we
// stack the cards with a small gap so each stands on its own.
function LinkedTasksTooltip({ tasks }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', textAlign: 'left' }}>
      {tasks.map(t => (
        <KanbanCardContent key={t.id} task={t} onToggle={() => {}} />
      ))}
    </div>
  );
}

// Fold's tasks slice doesn't ship a shared isOverdue helper we can
// import here without cycles; inline the same "due_date is a past
// date at day granularity" rule the TasksView already uses.
function isTaskOverdue(t) {
  if (!t?.due_date) return false;
  const d = new Date(t.due_date);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function shorten(text, max) {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

/**
 * InlineNoteView — replaces the notes card body when a row is opened
 * inline. Two variants, decided per the current viewer's relationship
 * to the note:
 *
 *   • Assigned reviewer opening a submitted note → editable
 *     ConsolidatedNoteBody with the same reviewer-flow header actions
 *     the standalone drawer uses (Save as Draft / Sign & Save).
 *   • Everyone else (author, other clinicians) → read-only
 *     ClinicalNotePreviewBody. Same content, just no edit affordances.
 *
 * Read-only is the safe fallback when the reviewer can't be resolved
 * or the note isn't in a state that supports editing.
 */
function InlineNoteView({ note, member, onBack }) {
  const currentActorName = useAppStore(s => s.currentActorName);
  const isReviewerForThis = !!note?.reviewerName
    && !!currentActorName?.()
    && String(note.reviewerName) === String(currentActorName())
    && note.status === 'submitted'
    && !!note.reviewTaskId
    && !!member;

  // Reviewer flow needs one useClinicalNotePanel instance shared by
  // both the header's action buttons and the body's ConsolidatedNote-
  // Body, so save/sign edits the same gapState the reviewer sees. Non-
  // reviewer path can skip the hook entirely (no editable state).
  if (isReviewerForThis) {
    return <InlineReviewerPane member={member} note={note} onBack={onBack} />;
  }
  return (
    <div className={styles.inlinePane}>
      <InlineNoteHeader note={note} onBack={onBack} />
      <div className={styles.inlinePreviewBody}>
        <ClinicalNotePreviewBody
          memberId={note.hedisMemberId || note.patientId}
          gapCode={note.gapCodes?.[0]}
          noteId={note.id}
        />
      </div>
    </div>
  );
}

// Shared header block for the inline note view — back arrow + stacked
// title/subtitle. Reviewer flow drops action buttons alongside it via
// the parent InlineReviewerPane.
function InlineNoteHeader({ note, onBack, actions }) {
  return (
    <div className={styles.inlineHeader}>
      <ActionButton
        icon="solar:arrow-left-linear"
        size="S"
        tooltip="Back to notes list"
        onClick={onBack}
      />
      <div className={styles.inlineTitleBlock}>
        <span className={styles.inlineTitle}>
          {(note.gapCodes || []).length > 1
            ? 'Consolidated Clinical Note'
            : (note.gapCodes?.[0] ? `${note.gapCodes[0]} Visit Note` : 'Clinical Note')}
        </span>
        <span className={styles.inlineSubtitle}>
          {note.status === 'signed'
            ? `Signed by ${note.signedByName || note.authorName || '—'} · ${formatDate(note.updatedAt || note.createdAt)}`
            : note.status === 'submitted'
              ? `Submitted for Review to ${note.reviewerName || '—'} · ${formatDate(note.updatedAt || note.createdAt)}`
              : `Draft · ${formatDate(note.updatedAt || note.createdAt)}`}
        </span>
      </div>
      {actions && <div className={styles.inlineHeaderActions}>{actions}</div>}
    </div>
  );
}

// Reviewer-editable inline pane — mounts useClinicalNotePanel once
// and passes the same `v` handle to the header's action buttons and
// to ConsolidatedNoteBody, so a save from the header commits the
// edits shown in the body. The header structure (back arrow + title
// + actions) is threaded through via `header` so the two halves share
// a row.
function InlineReviewerPane({ member, note, onBack }) {
  const v = useClinicalNotePanel({
    member,
    gapCode: note.gapCodes?.[0],
    onClose: onBack,
    editingTaskId: note.reviewTaskId,
  });
  return (
    <div className={styles.inlinePane}>
      <InlineNoteHeader
        note={note}
        onBack={onBack}
        actions={(
          <ClinicalNoteHeaderActions
            onSaveDraft={v.handleSaveDraft}
            onSubmitForReview={v.handleSubmitForReview}
            onSaveAndSign={v.handleSaveAndSign}
            onSignAndPrint={v.handleSignAndPrint}
            primaryLabel="Sign & Save"
            reviewerFlow
            canSaveDraft={v.hasChanges}
            canSign={v.anyReadyForReview}
          />
        )}
      />
      <div className={styles.inlineInfoBanner}>
        <Icon name="solar:info-circle-linear" size={14} color="var(--status-info)" />
        <span>All signed notes sync to the patient&apos;s EHR record.</span>
      </div>
      <div className={styles.inlineEditorBody}>
        <ConsolidatedNoteBody v={v} />
      </div>
    </div>
  );
}
