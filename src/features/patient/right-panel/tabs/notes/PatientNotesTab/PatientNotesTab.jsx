import { useEffect, useMemo } from 'react';
import { useAppStore } from '../../../../../../store/useAppStore';
import { Icon } from '../../../../../../components/Icon/Icon';
import { Badge } from '../../../../../../components/Badge/Badge';
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
  const openNotePreview = useAppStore(s => s.openNotePreview);
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

  if (!patientId) return null;

  if (sorted.length === 0) {
    return (
      <div className={styles.empty}>
        <Icon name="solar:notes-linear" size={40} color="var(--neutral-200)" />
        <span className={styles.emptyTitle}>No clinical notes yet</span>
        <span className={styles.emptyBody}>
          Notes created from the Care Gap workflow will appear here once the
          patient has one.
        </span>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span>Date</span>
        <span>Note</span>
        <span>Gaps</span>
        <span>Status</span>
        <span>Author</span>
        <span>Reviewer</span>
        <span aria-hidden />
      </div>
      <div className={styles.list}>
        {sorted.map(note => (
          <NoteRow key={note.id} note={note} onOpen={() => openNotePreview?.(note)} />
        ))}
      </div>
    </div>
  );
}

function NoteRow({ note, onOpen }) {
  const codes = note.gapCodes || [];
  const title = codes.length > 1
    ? 'Consolidated Clinical Note'
    : codes[0]
      ? `${codes[0]} Visit Note`
      : 'Clinical Note';
  const status = note.status === 'signed'
    ? { label: 'Signed', tone: 'success' }
    : note.status === 'submitted'
      ? { label: 'Pending Review', tone: 'warning' }
      : { label: 'Draft', tone: 'grey' };
  const when = note.updatedAt || note.createdAt;
  return (
    <button type="button" className={styles.row} onClick={onOpen}>
      <span className={styles.date}>{formatDate(when)}</span>
      <span className={styles.title}>{title}</span>
      <span className={styles.chips}>
        {codes.slice(0, 3).map(c => <Badge key={c} tone="grey" size="S" label={c} />)}
        {codes.length > 3 && <span className={styles.more}>+{codes.length - 3}</span>}
      </span>
      <span className={styles.status}>
        <Badge tone={status.tone} size="S" label={status.label} />
      </span>
      <span className={styles.author}>{note.authorName || '—'}</span>
      <span className={styles.reviewer}>{note.reviewerName || '—'}</span>
      <span className={styles.action} aria-hidden>
        <Icon name="solar:arrow-right-up-linear" size={14} color="var(--primary-300)" />
      </span>
    </button>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}
