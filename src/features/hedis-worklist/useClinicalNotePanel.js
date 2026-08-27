import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { generateClinicalNotePdf } from './lib/generateClinicalNotePdf';
import {
  CURRENT_USER,
  defaultGapData,
  isMandatoryComplete,
} from './ClinicalNotePanel.utils';

// Human-friendly form-type label for the activity log's detailCard.
const FORM_TYPE_LABEL = {
  cbp_visit_note: 'CBP Visit Note',
};

export function useClinicalNotePanel({ member, gapCode, onClose, editingTaskId = null }) {
  const showToast = useAppStore(s => s.showToast);
  const bulkUpdateGapStatuses = useAppStore(s => s.bulkUpdateGapStatuses);
  const logCareGapActivity = useAppStore(s => s.logCareGapActivity);
  const createCareGapSignOffTask = useAppStore(s => s.createCareGapSignOffTask);
  const updateSignOffTaskPdf = useAppStore(s => s.updateSignOffTaskPdf);
  const upsertClinicalNote = useAppStore(s => s.upsertClinicalNote);
  const linkClinicalNoteToReviewTask = useAppStore(s => s.linkClinicalNoteToReviewTask);

  const activeGaps = useMemo(
    () => member.gaps.filter(g => g.status !== 'Completed' && !String(g.status).startsWith('Closed')),
    [member.gaps],
  );

  const assigneeFor = useCallback(
    (g) => g.assignee ?? member.assignee ?? CURRENT_USER,
    [member.assignee],
  );

  const [dateOfService, setDateOfService] = useState(() => new Date().toISOString().slice(0, 10));
  const [audioOnly, setAudioOnly] = useState(false);
  const [audioVideo, setAudioVideo] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [gapState, setGapState] = useState(() => {
    const init = {};
    activeGaps.forEach(g => {
      init[g.code] = { manuallyOff: false, ...defaultGapData(g.code), ...(g.draft ?? {}) };
    });
    return init;
  });

  // RHS pane focuses on one gap at a time — defaults to the caller's gapCode
  // (i.e. the row the drawer was opened from). Clicking any LHS row moves it.
  const initialActive = activeGaps.some(g => g.code === gapCode)
    ? gapCode
    : activeGaps[0]?.code ?? null;
  const [activeGapCode, setActiveGapCode] = useState(initialActive);
  const activeGap = useMemo(
    () => activeGaps.find(g => g.code === activeGapCode) ?? null,
    [activeGaps, activeGapCode],
  );

  // Codes with unsaved edits since the last successful save. Save-as-Draft
  // stays disabled until the user actually changes something, and after a
  // successful save the affected codes drop back out of the set so the
  // button re-disables on its own.
  const [dirtyCodes, setDirtyCodes] = useState(() => new Set());
  const markDirty = useCallback((code) => {
    setDirtyCodes(prev => {
      if (prev.has(code)) return prev;
      const next = new Set(prev);
      next.add(code);
      return next;
    });
  }, []);
  const clearDirty = useCallback((codes) => {
    setDirtyCodes(prev => {
      if (!prev.size) return prev;
      const next = new Set(prev);
      (codes || []).forEach(c => next.delete(c));
      return next.size === prev.size ? prev : next;
    });
  }, []);

  const updateGap = useCallback((code, patch) => {
    setGapState(prev => ({ ...prev, [code]: { ...prev[code], ...patch } }));
    // `manuallyOff` is a UI-only ready-toggle flag, not a form edit —
    // toggling it should not enable Save-as-Draft on its own.
    const editKeys = Object.keys(patch).filter(k => k !== 'manuallyOff');
    if (editKeys.length) markDirty(code);
  }, [markDirty]);

  const isReadyForReview = (code) => {
    const data = gapState[code] ?? {};
    return isMandatoryComplete(code, data) && !data.manuallyOff;
  };

  const collectReadyCodes = () => {
    const codes = [];
    for (const g of activeGaps) {
      if (isReadyForReview(g.code)) codes.push(g.code);
    }
    return codes;
  };

  const buildPdf = (readyCodes, signedBy) => generateClinicalNotePdf({
    member, gapCodes: readyCodes, dateOfService, audioOnly, audioVideo, gapData: gapState, signedBy,
  });

  // Persistent note-row ids per gap so re-saves upsert the same row instead
  // of spawning a fresh draft every click. For the reviewer path
  // (editingTaskId set) we seed this from the note already linked to the
  // task so the reviewer's Save-as-Draft edits the existing row instead of
  // creating a parallel draft.
  const notesForMember = useAppStore(s => s.clinicalNotesByMember?.[member.id]) || [];
  const fetchClinicalNotesForMember = useAppStore(s => s.fetchClinicalNotesForMember);

  // Restore persisted state on open: seed note-row ids for every saved note
  // (so re-saves upsert instead of spawning duplicates) and rehydrate the
  // form from the newest DRAFT note — without this, drafts "didn't persist":
  // they saved fine but the panel reset to blanks on reopen.
  const [noteIdByCode, setNoteIdByCode] = useState(() => {
    if (!editingTaskId) return {};
    const linked = notesForMember.find(n => n.reviewTaskId === editingTaskId);
    if (!linked) return {};
    const seed = {};
    (linked.gapCodes || []).forEach(c => { seed[c] = linked.id; });
    return seed;
  });
  const [_restored, setRestored] = useState(false);
  void _restored;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const notes = await fetchClinicalNotesForMember(member.id);
      if (cancelled || !notes?.length) { setRestored(true); return; }
      const idSeed = {};
      notes.forEach(n => (n.gapCodes || []).forEach(c => { idSeed[c] = n.id; }));
      setNoteIdByCode(prev => ({ ...idSeed, ...prev }));
      // Prefer the freshest DRAFT — it holds the author's in-progress
      // edits. Fall back to the freshest SUBMITTED (pending review) note
      // so the Edit-from-preview flow lands with the last-sent-for-
      // review values pre-populated instead of a blank form.
      const draft = notes.find(n => n.status === 'draft')
                 || notes.find(n => n.status === 'submitted');
      if (draft?.payload) {
        if (draft.payload.dateOfService) setDateOfService(draft.payload.dateOfService);
        if (draft.payload.gaps) {
          setGapState(prev => {
            const next = { ...prev };
            for (const [code, data] of Object.entries(draft.payload.gaps)) {
              if (next[code]) next[code] = { ...next[code], ...data };
            }
            return next;
          });
        }
      }
      setRestored(true);
    })();
    return () => { cancelled = true; };
    // Run once per member open — the panel remounts per member.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member.id]);
  // Submit-for-Review is a two-step flow: open the reviewer picker, then
  // finalize on selection. The picker UI itself lives with the Clinical
  // Note workspace (see plan §6, pending Figma).
  const [reviewerPickerOpen, setReviewerPickerOpen] = useState(false);

  const noteScope = () => {
    // The inline single-gap workspace scopes a note to the current gap;
    // the consolidated ClinicalNotePanel scopes it to whatever gaps are
    // Ready for Review at save-time.
    const inlineCode = activeGapCode;
    const ready = collectReadyCodes();
    const codes = ready.length > 0 ? ready : (inlineCode ? [inlineCode] : []);
    // Primary gap code drives noteIdByCode keying (stable across re-saves).
    return { codes, primary: codes[0] || inlineCode };
  };

  const buildNotePayload = (codes) => ({
    dateOfService,
    audioOnly,
    audioVideo,
    gaps: Object.fromEntries((codes || []).map(c => [c, gapState[c] ?? {}])),
  });

  const rememberNoteId = (code, id) => {
    if (!code || !id) return;
    setNoteIdByCode(prev => (prev[code] === id ? prev : { ...prev, [code]: id }));
  };

  // Shape a Clinical Note detailCard to match the Figma spec:
  //   • Single-gap card omits the count chip; multi-gap shows "N Gaps"
  //     and titles collapse to "Consolidated Clinical Note".
  //   • Draft / Pending Review / Signed drive status pill + subtitle.
  //   • linkedGroups renders the "Linked Score Groups >" bottom link,
  //     shown on submitted / signed notes only.
  //   • reviewTask nests a Request-for-Sign-off task card inside a
  //     Pending Review card so the reviewer is visible right there.
  const buildDetailCard = ({ codes, status, reviewer, signedDate, reviewTask, noteId, pdfDataUrl } = {}) => {
    const gapList = codes || [];
    const multi = gapList.length > 1;
    const singleCode = gapList[0];
    const title = multi
      ? 'Consolidated Clinical Note'
      : (singleCode ? `${singleCode} Visit Note` : FORM_TYPE_LABEL.cbp_visit_note);
    const chip = multi ? `${gapList.length} Gaps` : undefined;
    let subtitle;
    if (status === 'Draft') {
      subtitle = `Save as Draft by ${CURRENT_USER}`;
    } else if (status === 'Pending Review') {
      subtitle = reviewer ? `Submitted for Review to ${reviewer}` : `Submitted for Review`;
    } else if (status === 'Signed') {
      subtitle = signedDate
        ? `Signed by ${reviewer || 'Provider'} · ${signedDate}`
        : `Signed by ${reviewer || 'Provider'}`;
    }
    return {
      noteId,
      pdfDataUrl,
      memberId: member?.id,
      gapCode: singleCode,
      title,
      chip,
      status,
      // subMeta ("CBP Visit Note" pre-title) and linkedGroups ("Linked
      // Score Groups >") were removed from the note-card design — the
      // note title alone carries the form-type identity now.
      subtitle,
      reviewTask,
    };
  };

  const handleSaveDraft = async () => {
    setSubmitted(true);
    // Draft saves only the gaps that changed since the last save. Falls
    // back to the active gap when nothing is dirty (button should already
    // be disabled in that case; the guard here is belt + braces).
    const dirty = [...dirtyCodes];
    const codes = dirty.length ? dirty : (activeGapCode ? [activeGapCode] : []);
    const primary = codes[0];
    if (!primary) { showToast('Nothing to save'); return; }
    const note = await upsertClinicalNote({
      id: noteIdByCode[primary],
      hedisMemberId: member.id,
      patientId: member.id,
      gapCodes: codes,
      formType: 'cbp_visit_note',
      status: 'draft',
      payload: buildNotePayload(codes),
    });
    if (note?.id) codes.forEach(c => rememberNoteId(c, note.id));
    clearDirty(codes);
    logCareGapActivity(member.id, {
      title: 'Clinical Note Added',
      detail: codes.join(', '),
      actor: CURRENT_USER,
      icon: 'solar:notes-linear',
      gapCodes: codes,
      t: 'clinical_note',
      detailCard: buildDetailCard({ codes, status: 'Draft', noteId: note?.id }),
    });
    showToast('Draft saved');
  };

  // Two-step Submit-for-Review: open the reviewer picker first; commit only
  // once the caller resolves a reviewer via handleConfirmSubmitForReview.
  // For the reviewer-edit path (editingTaskId set), keep the existing
  // Submit-updates-attached-PDF flow — no picker involved.
  const handleSubmitForReview = async () => {
    setSubmitted(true);
    if (!dateOfService) { showToast('Date of Service is required'); return; }
    const { codes } = noteScope();
    if (codes.length === 0) { showToast('No gaps marked Ready for Review'); return; }
    if (editingTaskId) {
      const pdf = buildPdf(codes, CURRENT_USER);
      await updateSignOffTaskPdf(editingTaskId, pdf, CURRENT_USER);
      showToast('Sign-off note updated');
      onClose();
      return;
    }
    setReviewerPickerOpen(true);
  };

  const handleConfirmSubmitForReview = async (reviewer) => {
    if (!reviewer?.id) { setReviewerPickerOpen(false); return; }
    const { codes, primary } = noteScope();
    if (codes.length === 0) { setReviewerPickerOpen(false); return; }
    const pdf = buildPdf(codes, CURRENT_USER);
    const note = await upsertClinicalNote({
      id: noteIdByCode[primary],
      hedisMemberId: member.id,
      patientId: member.id,
      gapCodes: codes,
      formType: 'cbp_visit_note',
      status: 'submitted',
      payload: buildNotePayload(codes),
      pdf,
      reviewerId: reviewer.id,
      reviewerName: reviewer.name,
    });
    if (note?.id) rememberNoteId(primary, note.id);
    bulkUpdateGapStatuses(member.id, Object.fromEntries(codes.map(c => [c, 'Submitted'])));
    // Sign-off task + activity card share one derived name so the Tasks
    // table and the nested review-task card read identically. Single-gap
    // notes drop the "Consolidated" prefix — they're one gap's note, not a
    // consolidated pack.
    const formLabel = codes.length > 1
      ? 'Consolidated Clinical Note'
      : `${codes[0]} Visit Note`;
    const signOffTaskName = `Request for Sign-off - ${formLabel}`;
    // Create the sign-off task BEFORE logging activity so the entry can carry
    // the real taskId — the activity feed's task card opens the TaskDetail
    // drawer through it.
    const task = await createCareGapSignOffTask({
      hedisMemberId: member.id,
      gapCodes: codes,
      state: member.state,
      pdf,
      reviewerId: reviewer.id,
      reviewerName: reviewer.name,
      taskName: signOffTaskName,
    });
    logCareGapActivity(member.id, {
      title: 'Clinical Note Added',
      detail: `Ready gaps: ${codes.join(', ')}`,
      actor: CURRENT_USER,
      icon: 'solar:notes-linear',
      gapCodes: codes,
      attachment: pdf,
      t: 'clinical_note',
      detailCard: buildDetailCard({
        codes,
        status: 'Pending Review',
        reviewer: reviewer.name,
        noteId: note?.id,
        pdfDataUrl: pdf?.dataUrl,
        reviewTask: {
          taskId: task?.id,
          title: signOffTaskName,
          assignee: reviewer.name,
          status: 'Pending',
          locked: false,
        },
      }),
    });
    if (!task) showToast('Note submitted, but the sign-off task could not be created');
    if (note?.id && task?.id) await linkClinicalNoteToReviewTask(note.id, task.id);
    setReviewerPickerOpen(false);
    showToast(`Submitted for review — ${codes.length} gap${codes.length === 1 ? '' : 's'} → ${reviewer.name}`);
    onClose();
  };

  const handleSaveAndSign = async () => {
    setSubmitted(true);
    const { codes, primary } = noteScope();
    if (!dateOfService) { showToast('Date of Service is required'); return; }
    if (codes.length === 0) { showToast('No gaps marked Ready for Review'); return; }
    const pdf = buildPdf(codes, 'Provider');
    const note = await upsertClinicalNote({
      id: noteIdByCode[primary],
      hedisMemberId: member.id,
      patientId: member.id,
      gapCodes: codes,
      formType: 'cbp_visit_note',
      status: 'signed',
      payload: buildNotePayload(codes),
      pdf,
      signedByName: 'Provider',
    });
    if (note?.id) rememberNoteId(primary, note.id);
    bulkUpdateGapStatuses(member.id, Object.fromEntries(codes.map(c => [c, 'Completed'])));
    logCareGapActivity(member.id, {
      title: 'Clinical Note Signed',
      detail: `Direct sign path · ${codes.join(', ')}`,
      actor: 'Provider',
      icon: 'solar:pen-new-square-linear',
      gapCodes: codes,
      attachment: pdf,
      t: 'clinical_note',
      detailCard: buildDetailCard({
        codes,
        status: 'Signed',
        reviewer: 'Provider',
        signedDate: new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        noteId: note?.id,
        pdfDataUrl: pdf?.dataUrl,
      }),
    });
    showToast('Saved and signed — provider sign path');
    onClose();
  };

  const handleSignAndPrint = async () => {
    setSubmitted(true);
    const { codes, primary } = noteScope();
    if (!dateOfService) { showToast('Date of Service is required'); return; }
    if (codes.length === 0) { showToast('No gaps marked Ready for Review'); return; }
    const pdf = buildPdf(codes, 'Provider');
    const note = await upsertClinicalNote({
      id: noteIdByCode[primary],
      hedisMemberId: member.id,
      patientId: member.id,
      gapCodes: codes,
      formType: 'cbp_visit_note',
      status: 'signed',
      payload: buildNotePayload(codes),
      pdf,
      signedByName: 'Provider',
    });
    if (note?.id) rememberNoteId(primary, note.id);
    bulkUpdateGapStatuses(member.id, Object.fromEntries(codes.map(c => [c, 'Completed'])));
    logCareGapActivity(member.id, {
      title: 'Clinical Note Signed',
      detail: `Direct sign path · ${codes.join(', ')}`,
      actor: 'Provider',
      icon: 'solar:printer-linear',
      gapCodes: codes,
      attachment: pdf,
      t: 'clinical_note',
      detailCard: buildDetailCard({
        codes,
        status: 'Signed',
        reviewer: 'Provider',
        signedDate: new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        noteId: note?.id,
        pdfDataUrl: pdf?.dataUrl,
      }),
    });
    if (pdf?.dataUrl) {
      const w = window.open(pdf.dataUrl, '_blank');
      try { w?.focus(); } catch { /* popup blocker */ }
    }
    showToast('Signed and printing…');
    onClose();
  };

  const drawerTitle = editingTaskId ? 'Edit Clinical Note' : 'Clinical Note';
  const ageShort = member.age ? member.age.split('y')[0] + 'Y' : '';

  const activeMandatoryComplete = activeGap
    ? isMandatoryComplete(activeGap.code, gapState[activeGap.code] ?? {})
    : false;
  const anyReadyForReview = activeGaps.some(g =>
    isMandatoryComplete(g.code, gapState[g.code] ?? {})
  );
  const hasChanges = dirtyCodes.size > 0;

  return {
    showToast, activeGaps, assigneeFor,
    activeGapCode, setActiveGapCode, activeGap,
    dateOfService, setDateOfService, audioOnly, setAudioOnly, audioVideo, setAudioVideo,
    submitted, gapState, updateGap, isReadyForReview,
    handleSaveDraft, handleSubmitForReview, handleConfirmSubmitForReview, handleSaveAndSign, handleSignAndPrint,
    reviewerPickerOpen, setReviewerPickerOpen,
    drawerTitle, ageShort,
    hasChanges, activeMandatoryComplete, anyReadyForReview,
  };
}
