import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../../../../../store/useAppStore';
import { Icon } from '../../../../../../components/Icon/Icon';
import { Button } from '../../../../../../components/Button/Button';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { MenuPopover } from '../../../../../../components/MenuPopover/MenuPopover';
import { ConfirmDialog } from '../../../../../../components/ConfirmDialog/ConfirmDialog';
import { NonVisitNoteDrawer } from './NonVisitNoteDrawer';
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

  if (!patientId) return null;

  return (
    <div className={styles.card}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Clinical Notes</span>
        <div className={styles.sectionActions}>
          <ActionButton
            icon="solar:add-circle-linear"
            size="S"
            tooltip="New Non-Visit Note"
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
            patient has one — or start a Non-Visit Note right from here.
          </span>
          <Button
            variant="primary"
            size="M"
            leadingIcon="solar:add-circle-linear"
            onClick={() => setShowNonVisitDrawer(true)}
          >
            New Non-Visit Note
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

function NoteRow({ note }) {
  const openNotePreview = useAppStore(s => s.openNotePreview);
  const deleteClinicalNote = useAppStore(s => s.deleteClinicalNote);
  const showToast = useAppStore(s => s.showToast);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuBtnRef = useRef(null);
  const codes = note.gapCodes || [];
  const isNonVisit = note.formType === 'non_visit_note';
  const title = isNonVisit
    ? (note.payload?.title || 'Non-Visit Note')
    : codes.length > 1
      ? 'Consolidated Clinical Note'
      : codes[0]
        ? `${codes[0]} Visit Note`
        : 'Clinical Note';
  // Subtitle mirrors the Overview `noteSub` line — short context under
  // the title. Non-Visit → snippet of the body; Care Gap → the gap
  // measures the note covers; origin fallback for any other kind.
  const subtitle = isNonVisit
    ? (note.payload?.body ? shorten(note.payload.body, 80) : '—')
    : codes.length
      ? codes.join(' · ')
      : (ORIGIN_LABEL[note.originKind] || 'Clinical Note');
  const status = note.status === 'signed'
    ? { label: 'Signed', color: 'var(--status-success)' }
    : note.status === 'submitted'
      ? { label: 'Pending Review', color: 'var(--status-warning)' }
      : { label: 'In Progress', color: 'var(--status-warning)' };
  const templateName = isNonVisit
    ? 'Non-Visit Note'
    : (note.formType || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      || (codes[0] ? `${codes[0]} Visit Note` : 'Clinical Note');

  const handlePreview = () => openNotePreview?.(note);
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
              if (key === 'preview') handlePreview();
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
