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

export function useClinicalNotePanel({ member, gapCode, selectedNoteId = null, onClose, editingTaskId = null, amendNoteId = null }) {
  const showToast = useAppStore(s => s.showToast);
  const bulkUpdateGapStatuses = useAppStore(s => s.bulkUpdateGapStatuses);
  const logCareGapActivity = useAppStore(s => s.logCareGapActivity);
  const createCareGapSignOffTask = useAppStore(s => s.createCareGapSignOffTask);
  const updateSignOffTaskPdf = useAppStore(s => s.updateSignOffTaskPdf);
  const upsertClinicalNote = useAppStore(s => s.upsertClinicalNote);
  const linkClinicalNoteToReviewTask = useAppStore(s => s.linkClinicalNoteToReviewTask);
  const notesForMember = useAppStore(s => s.clinicalNotesByMember?.[member.id]) || [];
  const fetchClinicalNotesForMember = useAppStore(s => s.fetchClinicalNotesForMember);

  const amendNote = useMemo(
    () => (amendNoteId ? (notesForMember.find(n => n.id === amendNoteId) || null) : null),
    [amendNoteId, notesForMember],
  );

  const activeGaps = useMemo(() => {
    const base = member.gaps.filter(g => g.status !== 'Completed' && !String(g.status).startsWith('Closed'));
    if (!amendNote?.gapCodes?.length) return base;
    const baseCodes = new Set(base.map(g => g.code));
    const missing = (amendNote.gapCodes || [])
      .map(code => member.gaps.find(g => g.code === code))
      .filter(Boolean)
      .filter(g => !baseCodes.has(g.code));
    return missing.length ? [...base, ...missing] : base;
  }, [member.gaps, amendNote]);

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

  // Keep the RHS pane in sync when the drawer switches gaps (prev/next) or
  // when Amend seeds a Completed gap that was filtered out of activeGaps.
  // activeGapCode is intentionally excluded — including it creates a
  // feedback loop that resets the user's selection back to gapCode on
  // every click.
  useEffect(() => {
    if (amendNote?.gapCodes?.[0] && activeGaps.some(g => g.code === amendNote.gapCodes[0])) {
      setActiveGapCode(amendNote.gapCodes[0]);
    } else if (gapCode && activeGaps.some(g => g.code === gapCode)) {
      setActiveGapCode(gapCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amendNote, gapCode, activeGaps]);

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
  // of spawning a fresh draft every click. amendNoteId covers the Amend-
  // from-preview path — same row is edited, DB trigger snapshots prior
  // version. Also restores persisted draft state on open.
  const [noteIdByCode, setNoteIdByCode] = useState(() => {
    if (amendNoteId) {
      const amended = notesForMember.find(n => n.id === amendNoteId);
      if (amended) {
        const seed = {};
        (amended.gapCodes || []).forEach(c => { seed[c] = amended.id; });
        return seed;
      }
    }
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
      // Keep the newest note per gap (notes are ordered newest first, so
      // only seed if not already set). Previously this overwrote with the
      // oldest note covering the gap, causing consolidated-note saves to
      // update the wrong row when multiple notes shared a gap (e.g., a
      // 4-gap pending and a 2-gap pending both covering COL).
      notes.forEach(n => (n.gapCodes || []).forEach(c => { if (!(c in idSeed)) idSeed[c] = n.id; }));
      setNoteIdByCode(prev => ({ ...idSeed, ...prev }));
      // Amend path takes precedence — hydrate from the note being amended
      // so the form shows the prior signed/submitted state, not just the
      // latest draft. The DB trigger will snapshot the old row on next save.
      if (amendNoteId) {
        const amended = notes.find(n => n.id === amendNoteId);
        if (amended?.payload) {
          if (amended.payload.dateOfService) setDateOfService(amended.payload.dateOfService);
          if (amended.payload.gaps) {
            setGapState(prev => {
              const next = { ...prev };
              for (const [code, data] of Object.entries(amended.payload.gaps)) {
                if (next[code] !== undefined) next[code] = { ...next[code], ...data };
                else next[code] = { manuallyOff: false, ...defaultGapData(code), ...data };
              }
              return next;
            });
          }
          if (amended.payload.audioOnly !== undefined) setAudioOnly(!!amended.payload.audioOnly);
          if (amended.payload.audioVideo !== undefined) setAudioVideo(!!amended.payload.audioVideo);
          setRestored(true);
          return;
        }
      }
      // If a specific note was selected (eye → preview), hydrate from that
      // note so the reviewer sees the exact answers the author filled,
      // regardless of status (draft / submitted / signed). Otherwise fall
      // back to the freshest DRAFT (author's in-progress edits) then the
      // freshest SUBMITTED (pending review) so the Edit-from-preview flow
      // lands with the last-sent-for-review values pre-populated.
      let target = null;
      if (selectedNoteId) {
        target = notes.find(n => n.id === selectedNoteId) || null;
      }
      if (!target) {
        target = notes.find(n => n.status === 'draft')
              || notes.find(n => n.status === 'submitted')
              || null;
      }
      if (target?.payload) {
        if (target.payload.dateOfService) setDateOfService(target.payload.dateOfService);
        if (target.payload.audioOnly !== undefined) setAudioOnly(!!target.payload.audioOnly);
        if (target.payload.audioVideo !== undefined) setAudioVideo(!!target.payload.audioVideo);
        if (target.payload.gaps) {
          setGapState(prev => {
            const next = { ...prev };
            for (const [code, data] of Object.entries(target.payload.gaps)) {
              if (next[code]) next[code] = { ...next[code], ...data };
              else next[code] = { ...defaultGapData(code), ...data };
            }
            return next;
          });
        }
      }
      setRestored(true);
    })();
    return () => { cancelled = true; };
    // Re-run when the selected note changes (eye → Edit) so the form
    // re-hydrates to that note's answers. The panel remounts per member,
    // but selectedNoteId can change without remounting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member.id, selectedNoteId, amendNoteId]);

  // When Amend is clicked after the initial fetch, notes are already cached
  // but gapState was initialized from the draft. Rehydrate from the amended
  // note's payload so the form immediately reflects the Signed/Pending state
  // being amended (DB trigger preserves the prior version on save).
  useEffect(() => {
    if (!amendNoteId) return;
    const note = notesForMember.find(n => n.id === amendNoteId) || null;
    if (!note?.payload) return;
    if (note.payload.dateOfService) setDateOfService(note.payload.dateOfService);
    if (note.payload.gaps) {
      setGapState(prev => {
        const next = { ...prev };
        for (const [code, data] of Object.entries(note.payload.gaps)) {
          if (next[code] !== undefined) next[code] = { ...next[code], ...data };
          else next[code] = { manuallyOff: false, ...defaultGapData(code), ...data };
        }
        return next;
      });
    }
    if (note.payload.audioOnly !== undefined) setAudioOnly(!!note.payload.audioOnly);
    if (note.payload.audioVideo !== undefined) setAudioVideo(!!note.payload.audioVideo);
    const seed = {};
    (note.gapCodes || []).forEach(c => { seed[c] = note.id; });
    setNoteIdByCode(prev => ({ ...prev, ...seed }));
  }, [amendNoteId, notesForMember]);
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

  const formTypeForCodes = (codes) => {
    if (!codes || codes.length === 0) return 'cbp_visit_note';
    if (codes.length > 1) return 'consolidated_visit_note';
    return `${codes[0].toLowerCase()}_visit_note`;
  };

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
    const effectiveId = selectedNoteId || noteIdByCode[primary];
    const note = await upsertClinicalNote({
      id: effectiveId,
      hedisMemberId: member.id,
      patientId: member.id,
      gapCodes: codes,
      formType: formTypeForCodes(codes),
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
    // If editing an existing note (draft → submit, or resubmitting a
    // pending note after edits), reuse its gap set and id so we update
    // the SAME record. This is the core single-entity guarantee.
    let finalCodes = codes;
    let finalPrimary = primary;
    let effectiveId = selectedNoteId || noteIdByCode[primary];
    if (selectedNoteId) {
      const existing = notesForMember.find(n => n.id === selectedNoteId);
      if (existing?.gapCodes?.length) {
        finalCodes = existing.gapCodes;
        finalPrimary = finalCodes[0] || primary;
        effectiveId = selectedNoteId;
      }
    }
    const note = await upsertClinicalNote({
      id: effectiveId,
      hedisMemberId: member.id,
      patientId: member.id,
      gapCodes: finalCodes,
      formType: formTypeForCodes(finalCodes),
      status: 'submitted',
      payload: buildNotePayload(finalCodes),
      pdf,
      reviewerId: reviewer.id,
      reviewerName: reviewer.name,
    });
    if (note?.id) finalCodes.forEach(c => rememberNoteId(c, note.id));
    bulkUpdateGapStatuses(member.id, Object.fromEntries(finalCodes.map(c => [c, 'Submitted'])), { assignee: reviewer.name });
    // Sign-off task + activity card share one derived name so the Tasks
    // table and the nested review-task card read identically. Single-gap
    // notes drop the "Consolidated" prefix — they're one gap's note, not a
    // consolidated pack.
    const formLabel = finalCodes.length > 1
      ? 'Consolidated Clinical Note'
      : `${finalCodes[0]} Visit Note`;
    const signOffTaskName = `Request for Sign-off - ${formLabel}`;
    // Reuse the existing sign-off task if this note already has one
    // (edit → resubmit). Do NOT create a duplicate task for the same note.
    const existingForTask = selectedNoteId ? notesForMember.find(n => n.id === selectedNoteId) : null;
    const existingTaskId = existingForTask?.reviewTaskId || note?.reviewTaskId || null;
    let task = null;
    if (existingTaskId) {
      // Update the existing task's PDF so the reviewer sees the latest
      // content, but keep the same task id.
      await updateSignOffTaskPdf(existingTaskId, pdf, CURRENT_USER);
      task = (useAppStore.getState().tasks || []).find(t => String(t.id) === String(existingTaskId)) || { id: existingTaskId };
      // Also ensure the note stays linked (idempotent).
      if (note?.id) await linkClinicalNoteToReviewTask(note.id, existingTaskId);
    } else {
      // First submission — create the sign-off task BEFORE logging activity
      // so the entry can carry the real taskId.
      task = await createCareGapSignOffTask({
        hedisMemberId: member.id,
        gapCodes: finalCodes,
        state: member.state,
        pdf,
        reviewerId: reviewer.id,
        reviewerName: reviewer.name,
        taskName: signOffTaskName,
      });
    }
    logCareGapActivity(member.id, {
      title: 'Clinical Note Added',
      detail: `Ready gaps: ${finalCodes.join(', ')}`,
      actor: CURRENT_USER,
      icon: 'solar:notes-linear',
      gapCodes: finalCodes,
      attachment: pdf,
      t: 'clinical_note',
      detailCard: buildDetailCard({
        codes: finalCodes,
        status: 'Pending Review',
        reviewer: reviewer.name,
        noteId: note?.id,
        pdfDataUrl: pdf?.dataUrl,
        reviewTask: {
          taskId: task?.id,
          title: signOffTaskName,
          assignee: reviewer.name,
          priority: task?.priority || 'medium',
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
    const effectiveId = selectedNoteId || noteIdByCode[primary];
    // If we are signing an existing note (edit → sign), reuse its gapCodes
    // so a 1-gap draft that was expanded to a consolidated note does not get
    // split back to a single gap. The DB row must keep its consolidated
    // gap set throughout the lifecycle.
    let finalCodes = codes;
    let finalPrimary = primary;
    if (selectedNoteId) {
      const existing = notesForMember.find(n => n.id === selectedNoteId);
      if (existing?.gapCodes?.length) {
        finalCodes = existing.gapCodes;
        finalPrimary = finalCodes[0] || primary;
      }
    }
    const note = await upsertClinicalNote({
      id: effectiveId,
      hedisMemberId: member.id,
      patientId: member.id,
      gapCodes: finalCodes,
      formType: formTypeForCodes(finalCodes),
      status: 'signed',
      payload: buildNotePayload(finalCodes),
      pdf,
      signedByName: 'Provider',
    });
    if (note?.id) finalCodes.forEach(c => rememberNoteId(c, note.id));
    bulkUpdateGapStatuses(member.id, Object.fromEntries(finalCodes.map(c => [c, 'Completed'])));
    // If this note was previously submitted, its sign-off task must be
    // completed — do not create a new task. The Clinical Notes tab is
    // DB-driven (one row per note), so creating a new task would leave the
    // old Pending task visible as a duplicate nested card.
    const existingForTask = selectedNoteId ? notesForMember.find(n => n.id === selectedNoteId) : null;
    const taskIdToComplete = existingForTask?.reviewTaskId || note?.reviewTaskId || null;
    if (taskIdToComplete) {
      try { await useAppStore.getState().updateTask(taskIdToComplete, { status: 'completed' }); } catch { /* optimistic */ }
    }
    logCareGapActivity(member.id, {
      title: 'Clinical Note Signed',
      detail: `Direct sign path · ${finalCodes.join(', ')}`,
      actor: 'Provider',
      icon: 'solar:pen-new-square-linear',
      gapCodes: finalCodes,
      attachment: pdf,
      t: 'clinical_note',
      detailCard: buildDetailCard({
        codes: finalCodes,
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
    const effectiveId = selectedNoteId || noteIdByCode[primary];
    let finalCodes = codes;
    let finalPrimary = primary;
    if (selectedNoteId) {
      const existing = notesForMember.find(n => n.id === selectedNoteId);
      if (existing?.gapCodes?.length) {
        finalCodes = existing.gapCodes;
        finalPrimary = finalCodes[0] || primary;
      }
    }
    const note = await upsertClinicalNote({
      id: effectiveId,
      hedisMemberId: member.id,
      patientId: member.id,
      gapCodes: finalCodes,
      formType: formTypeForCodes(finalCodes),
      status: 'signed',
      payload: buildNotePayload(finalCodes),
      pdf,
      signedByName: 'Provider',
    });
    if (note?.id) finalCodes.forEach(c => rememberNoteId(c, note.id));
    bulkUpdateGapStatuses(member.id, Object.fromEntries(finalCodes.map(c => [c, 'Completed'])));
    const existingForTask = selectedNoteId ? notesForMember.find(n => n.id === selectedNoteId) : null;
    const taskIdToComplete = existingForTask?.reviewTaskId || note?.reviewTaskId || null;
    if (taskIdToComplete) {
      try { await useAppStore.getState().updateTask(taskIdToComplete, { status: 'completed' }); } catch { /* optimistic */ }
    }
    logCareGapActivity(member.id, {
      title: 'Clinical Note Signed',
      detail: `Direct sign path · ${finalCodes.join(', ')}`,
      actor: 'Provider',
      icon: 'solar:printer-linear',
      gapCodes: finalCodes,
      attachment: pdf,
      t: 'clinical_note',
      detailCard: buildDetailCard({
        codes: finalCodes,
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
