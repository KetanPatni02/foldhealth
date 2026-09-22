import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../../../../../store/useAppStore';
import { Icon } from '../../../../../../components/Icon/Icon';
import { Button } from '../../../../../../components/Button/Button';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { MenuPopover } from '../../../../../../components/MenuPopover/MenuPopover';
import { ConfirmDialog } from '../../../../../../components/ConfirmDialog/ConfirmDialog';
import { NonVisitNoteDrawer } from './NonVisitNoteDrawer';
import { useClinicalNotePanel } from '../../../../../hedis-worklist/useClinicalNotePanel';
import { ConsolidatedNoteBody, HeaderActions as ClinicalNoteHeaderActions } from '../../../../../hedis-worklist/ClinicalNotePanelParts';
import { ClinicalNotePreviewBody } from '../../../../../hedis-worklist/ClinicalNotePreviewBody';
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

  const sorted = useMemo(
    () => [...notes].sort((a, b) => {
      const at = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bt = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bt - at;
    }),
    [notes],
  );

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
      <div className={styles.card}>
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
                <th>Note Title</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Last Updated</th>
                <th>Template Name</th>
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
  // Match the HEDIS Care Gap drawer's status vocabulary + color tokens
  // (Draft = neutral, Pending Review = warning, Signed = success). Using
  // "In Progress" here was a divergent label that made the P360 Notes
  // tab look like it tracked a different lifecycle than the rest of
  // the app.
  const status = note.status === 'signed'
    ? { label: 'Signed', color: 'var(--status-success)' }
    : note.status === 'submitted'
      ? { label: 'Pending Review', color: 'var(--status-warning)' }
      : { label: 'Draft', color: 'var(--neutral-300)' };
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
        <span style={{ color: status.color }}>{status.label}</span>
      </td>
      <td>
        <div>{note.authorName || '—'}</div>
        <div className={styles.dateText}>{formatDate(note.createdAt)}</div>
      </td>
      <td>
        <div>{note.signedByName || note.reviewerName || note.authorName || '—'}</div>
        <div className={styles.dateText}>{formatDate(note.updatedAt || note.createdAt)}</div>
      </td>
      <td className={styles.templateCell}>
        <span className={styles.templateText}>{templateName}</span>
        <span className={styles.rowKebab}>
          <ActionButton
            ref={menuBtnRef}
            icon="solar:menu-dots-bold"
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

  return (
    <div className={styles.inlinePane}>
      <div className={styles.inlineHeader}>
        <button
          type="button"
          className={styles.inlineBackBtn}
          onClick={onBack}
          aria-label="Back to notes list"
        >
          <Icon name="solar:alt-arrow-left-linear" size={16} color="var(--neutral-400)" />
        </button>
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
      </div>
      {isReviewerForThis ? (
        <InlineReviewerEditor member={member} note={note} onDone={onBack} />
      ) : (
        <div className={styles.inlinePreviewBody}>
          <ClinicalNotePreviewBody
            memberId={note.hedisMemberId || note.patientId}
            gapCode={note.gapCodes?.[0]}
            noteId={note.id}
          />
        </div>
      )}
    </div>
  );
}

// Reviewer-editable inline body — reuses useClinicalNotePanel with the
// review-flow marker (editingTaskId) so the header actions and
// ConsolidatedNoteBody behave the same as the standalone reviewer
// drawer. Kept as a nested component so the hooks only mount when a
// note is actually opened inline.
function InlineReviewerEditor({ member, note, onDone }) {
  const v = useClinicalNotePanel({
    member,
    gapCode: note.gapCodes?.[0],
    onClose: onDone,
    editingTaskId: note.reviewTaskId,
  });
  return (
    <>
      <div className={styles.inlineActionsRow}>
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
      </div>
      <div className={styles.inlineInfoBanner}>
        <Icon name="solar:info-circle-linear" size={14} color="var(--status-info)" />
        <span>All signed notes sync to the patient&apos;s EHR record.</span>
      </div>
      <div className={styles.inlineEditorBody}>
        <ConsolidatedNoteBody v={v} />
      </div>
    </>
  );
}
