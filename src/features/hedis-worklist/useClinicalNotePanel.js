import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { generateClinicalNotePdf } from './lib/generateClinicalNotePdf';
import {
  CURRENT_USER,
  MEASURE_NAMES,
  defaultGapData,
  isMandatoryComplete,
} from './ClinicalNotePanel.utils';

// Human-friendly form-type label for the activity log's detailCard.
const FORM_TYPE_LABEL = {
  cbp_visit_note: 'CBP Visit Note',
};

export function useClinicalNotePanel({ member, gapCode, selectedNoteId = null, onClose, editingTaskId = null, amendNoteId = null, onPromoteToConsolidated = null }) {
  const showToast = useAppStore(s => s.showToast);
  const bulkUpdateGapStatuses = useAppStore(s => s.bulkUpdateGapStatuses);
  const openNativeGap = useAppStore(s => s.openNativeGap);
  const logCareGapActivity = useAppStore(s => s.logCareGapActivity);
  const createCareGapSignOffTask = useAppStore(s => s.createCareGapSignOffTask);
  const updateSignOffTaskPdf = useAppStore(s => s.updateSignOffTaskPdf);
  const upsertClinicalNote = useAppStore(s => s.upsertClinicalNote);
  const linkClinicalNoteToReviewTask = useAppStore(s => s.linkClinicalNoteToReviewTask);
  const notesForMember = useAppStore(s => s.clinicalNotesByMember?.[member.id]) || [];
  const fetchClinicalNotesForMember = useAppStore(s => s.fetchClinicalNotesForMember);
  // P2-1: hydrate Note Templates from public.forms on panel open so the
  // GenericEvidenceForm reads its field schema from the DB. Idempotent
  // (guarded by noteTemplatesDidFetch); no-op after the first call.
  const fetchNoteTemplates = useAppStore(s => s.fetchNoteTemplates);
  useEffect(() => { fetchNoteTemplates?.(); }, [fetchNoteTemplates]);
  // Real signed-in user resolved lazily at call time — `currentActorName`
  // reads `currentUserProfile?.name` from the store. Falls back to the
  // mock `CURRENT_USER` constant only when no session is present (dev
  // launches without sign-in). Never returns 'Provider' any more — the
  // note's signer identity now matches whoever actually clicked Sign.
  const actorName = () => useAppStore.getState().currentActorName?.() || CURRENT_USER;

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

  // Back-fill gapState whenever a new gap appears on the member (e.g.
  // DSF-B opened natively after PHQ-2 Positive). Without this the DSF-B
  // dispatch would crash on undefined data.
  useEffect(() => {
    setGapState(prev => {
      let next = prev;
      for (const g of activeGaps) {
        if (!next[g.code]) {
          if (next === prev) next = { ...prev };
          next[g.code] = { manuallyOff: false, ...defaultGapData(g.code), ...(g.draft ?? {}) };
        }
      }
      return next;
    });
  }, [activeGaps]);

  // DSF-A calls this from its "Save score" handler when PHQ-2 lands
  // Positive. Opens a DSF-B gap on the same member natively (30-day
  // due date computed from the save timestamp), then auto-promotes
  // the workspace to the consolidated view with DSF-B focused so the
  // Coordinator flows straight into PHQ-9 without hunting for an
  // Open DSF-B button. Idempotent — subsequent calls no-op via the
  // store's dedup.
  // Not memoized on purpose: it closes over openDsfbView (which itself
  // reads live state like activeGaps + gapState), so it needs to
  // rebuild with the freshest closure on every render. The child form
  // isn't React.memo'd, so the extra prop identity churn is free.
  const openDsfbGap = ({ savedAt } = {}) => {
    if (!member?.id) return;
    const stamp = savedAt ? new Date(savedAt) : new Date();
    const due = new Date(stamp);
    due.setDate(due.getDate() + 30);
    const dueDateISO = due.toISOString();
    const created = openNativeGap(member.id, 'DSF-B', {
      linkedTo: 'DSF-A',
      dueDateISO,
      title: 'Gap opened - PHQ-2 Positive',
      subtitle: 'Linked to DSF-A - 30-day window',
    });
    if (created) {
      showToast?.('DSF-B opened - continue with PHQ-9');
    }
    // Defer the promotion by a microtask so React has flushed the
    // openNativeGap store write into `member.gaps`; openDsfbView's
    // multiGap check reads activeGaps (derived from that prop) and
    // needs the DSF-B row visible before it can fire the promote.
    queueMicrotask(() => {
      try { openDsfbView(); } catch { /* best-effort */ }
    });
  };

  // "Open DSF-B" from the DSF-A success banner. If the drawer is
  // running the single-gap inline workspace and now has more than one
  // gap in flight, promote to the multi-gap consolidated drawer so the
  // Coordinator sees the Visit Notes list + shared DOS card layout.
  // Falls back to a plain gap-focus swap when consolidation isn't
  // wired (or there's no second gap yet).
  //
  // The promoted view mounts a NEW useClinicalNotePanel instance with
  // its own local gapState, so the saved PHQ-2 answers here would be
  // lost. Persist a draft of DSF-A first so the consolidated panel's
  // fetch-clinical-notes hydrate restores the locked, filled state.
  const openDsfbView = async () => {
    const multiGap = activeGaps.length > 1
      || member?.gaps?.some(g => g.code === 'DSF-B');
    if (multiGap && typeof onPromoteToConsolidated === 'function') {
      const dsfaData = gapState['DSF-A'];
      if (dsfaData?.phq2?.savedAt) {
        try {
          const codes = ['DSF-A'];
          const primary = 'DSF-A';
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
        } catch { /* best-effort — promotion still proceeds */ }
      }
      // Hand the target code to the drawer so the consolidated
      // ClinicalNotePanel mounts with DSF-B active (the point of the
      // "Open DSF-B" button); without this it inherits currentCode
      // from the outer drawer, which is still DSF-A and lands the
      // reviewer on the wrong RHS gap.
      onPromoteToConsolidated('DSF-B');
      return;
    }
    setActiveGapCode('DSF-B');
  };

  const isReadyForReview = (code) => {
    const data = gapState[code] ?? {};
    return isMandatoryComplete(code, data, { audioOnly, audioVideo, activeGaps }) && !data.manuallyOff;
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
      // Hydration priority:
      //  1. selectedNoteId (eye → preview / Edit) — hydrate that exact
      //     note so the reviewer sees the author's answers verbatim.
      //  2. editingTaskId (reviewer flow) — hydrate the note linked to
      //     the sign-off task via reviewTaskId; without this the
      //     reviewer would fall through to the freshest draft/submitted
      //     which may belong to a different task or be a stale draft.
      //  3. Otherwise: hydrate PER-GAP from the freshest note that
      //     covers each active gap. This handles the common consolidated
      //     case where a member has multiple notes — e.g. a signed
      //     DSF-A+DSF-B note plus a fresh DSF-B draft — so opening the
      //     DSF-A section still surfaces its signed answers instead of
      //     inheriting a shadow-empty state from the DSF-B draft.
      let target = null;
      if (selectedNoteId) {
        target = notes.find(n => n.id === selectedNoteId) || null;
      }
      if (!target && editingTaskId) {
        target = notes.find(n => String(n.reviewTaskId) === String(editingTaskId)) || null;
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
      } else {
        // Per-gap merge across all notes for this member. `notes` comes
        // back newest-first from the store, so we walk in order and
        // take the FIRST payload that carries each gap. Also stamp the
        // note-level DOS / consent from that same freshest source so
        // the header card doesn't fall out of sync with the answers.
        const gapsSeen = new Set();
        let dosSeeded = false;
        setGapState(prev => {
          const next = { ...prev };
          for (const n of notes) {
            const gapsPayload = n.payload?.gaps;
            if (!gapsPayload) continue;
            for (const [code, data] of Object.entries(gapsPayload)) {
              if (gapsSeen.has(code)) continue;
              gapsSeen.add(code);
              if (next[code]) next[code] = { ...next[code], ...data };
              else next[code] = { ...defaultGapData(code), ...data };
            }
            if (!dosSeeded && n.payload?.dateOfService) {
              setDateOfService(n.payload.dateOfService);
              if (n.payload.audioOnly !== undefined) setAudioOnly(!!n.payload.audioOnly);
              if (n.payload.audioVideo !== undefined) setAudioVideo(!!n.payload.audioVideo);
              dosSeeded = true;
            }
          }
          return next;
        });
      }
      setRestored(true);
    })();
    return () => { cancelled = true; };
    // Re-run when the selected note or reviewer task changes so the form
    // re-hydrates to the right note's answers. The panel remounts per
    // member, but selectedNoteId / editingTaskId can change without
    // remounting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member.id, selectedNoteId, amendNoteId, editingTaskId]);

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

  // P3-2: strip `manuallyOff` from every gap's saved payload. It's a
  // UI-only ready-toggle flag (see updateGap at ~line 120) — persisting
  // it inside payload.gaps was leaking client state into the DB row.
  // Readiness is inferred from `gap_codes` alone at read time: a code
  // present in the array is "ready" (it was written), a code absent is
  // "not ready" (it was skipped). No per-gap flag on the DB row.
  const stripUiFlags = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const { manuallyOff, ...rest } = obj;
    void manuallyOff;
    return rest;
  };

  const buildNotePayload = (codes) => ({
    dateOfService,
    audioOnly,
    audioVideo,
    gaps: Object.fromEntries((codes || []).map(c => [c, stripUiFlags(gapState[c] ?? {})])),
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
      subtitle = `Save as Draft by ${actorName()}`;
    } else if (status === 'Pending Review') {
      subtitle = reviewer ? `Submitted for Review to ${reviewer}` : `Submitted for Review`;
    } else if (status === 'Signed') {
      // `reviewer` here is the signer name the caller resolved from the
      // signed-in user. Fall back to the current actor if the caller
      // didn't pass one — never to a placeholder like "Provider".
      const signer = reviewer || actorName();
      subtitle = signedDate
        ? `Signed by ${signer} · ${signedDate}`
        : `Signed by ${signer}`;
    }
    return {
      noteId,
      pdfDataUrl,
      memberId: member?.id,
      gapCode: singleCode,
      gapCodes: gapList,
      // Human-readable HEDIS measure names for the "N Gaps" chip's
      // tooltip — falls back to the raw code when a measure isn't in
      // MEASURE_NAMES yet.
      gapNames: gapList.map(c => MEASURE_NAMES[c] || c),
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
      actor: actorName(),
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
      const pdf = buildPdf(codes, actorName());
      await updateSignOffTaskPdf(editingTaskId, pdf, actorName());
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
    const pdf = buildPdf(codes, actorName());
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
    // DSF Decline short-circuit: any gap with `data.decline === true`
    // is documented in the note but skips the sign-off queue and stays
    // Open (no CPT/LOINC code, no task). The user story is explicit:
    // "The note documents the decline only" (Section 6).
    const declinedCodes = finalCodes.filter(c => gapState[c]?.decline);
    const routableCodes = finalCodes.filter(c => !gapState[c]?.decline);
    if (routableCodes.length) {
      bulkUpdateGapStatuses(member.id, Object.fromEntries(routableCodes.map(c => [c, 'Submitted'])), { assignee: reviewer.name });
    }
    for (const c of declinedCodes) {
      logCareGapActivity(member.id, {
        title: 'Patient declined follow-up',
        detail: `${c} - decline documented, no sign-off task created`,
        actor: actorName(),
        icon: 'solar:info-circle-linear',
        gapCodes: [c],
        t: 'system',
      });
    }
    // Sign-off task + activity card share one derived name so the Tasks
    // table and the nested review-task card read identically. Single-gap
    // notes drop the "Consolidated" prefix — they're one gap's note, not a
    // consolidated pack.
    // Task name reads off the full note scope (finalCodes) so a
    // decline-only DSF-B note gets "DSF-B Visit Note" instead of the
    // generic "Consolidated Clinical Note" fallback.
    const formLabel = finalCodes.length > 1
      ? 'Consolidated Clinical Note'
      : finalCodes.length === 1
        ? `${finalCodes[0]} Visit Note`
        : 'Consolidated Clinical Note';
    const signOffTaskName = `Request for Sign-off - ${formLabel}`;
    // Reuse the existing sign-off task if this note already has one
    // (edit → resubmit). Do NOT create a duplicate task for the same note.
    const existingForTask = selectedNoteId ? notesForMember.find(n => n.id === selectedNoteId) : null;
    const existingTaskId = existingForTask?.reviewTaskId || note?.reviewTaskId || null;
    // A decline-only note still needs a sign-off task and its own
    // activity entry — the reviewer signs off on the decline
    // documentation itself. `finalCodes` (which includes the declined
    // codes) keeps the task's gap context intact so the review card
    // still shows what was submitted.
    const taskGapCodes = routableCodes.length ? routableCodes : finalCodes;
    let task = null;
    if (existingTaskId) {
      // Update the existing task's PDF so the reviewer sees the latest
      // content, but keep the same task id.
      await updateSignOffTaskPdf(existingTaskId, pdf, actorName());
      task = (useAppStore.getState().tasks || []).find(t => String(t.id) === String(existingTaskId)) || { id: existingTaskId };
      // Also ensure the note stays linked (idempotent).
      if (note?.id) await linkClinicalNoteToReviewTask(note.id, existingTaskId);
    } else {
      // First submission — create the sign-off task BEFORE logging activity
      // so the entry can carry the real taskId.
      task = await createCareGapSignOffTask({
        hedisMemberId: member.id,
        gapCodes: taskGapCodes,
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
      actor: actorName(),
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
    // Review flow (editingTaskId) trusts the persisted note's scope over
    // live readiness — the reviewer's job is to sign the note the author
    // submitted, not to re-derive its gap set.
    const linkedForReview = editingTaskId
      ? notesForMember.find(n => String(n.reviewTaskId) === String(editingTaskId))
      : null;
    if (codes.length === 0 && !linkedForReview) {
      showToast('No gaps marked Ready for Review');
      return;
    }
    const signer = actorName();
    // If we are signing an existing note (edit → sign, or reviewer signing
    // a submitted note), reuse its gapCodes so a 1-gap draft that was
    // expanded to a consolidated note does not get split back to a single
    // gap, and so a reviewer's sign always flips every gap on the note
    // regardless of live readiness.
    let finalCodes = codes;
    let finalPrimary = primary;
    if (selectedNoteId) {
      const existing = notesForMember.find(n => n.id === selectedNoteId);
      if (existing?.gapCodes?.length) {
        finalCodes = existing.gapCodes;
        finalPrimary = finalCodes[0] || primary;
      }
    } else if (linkedForReview?.gapCodes?.length) {
      finalCodes = linkedForReview.gapCodes;
      finalPrimary = finalCodes[0] || primary;
    }
    const pdf = buildPdf(finalCodes, signer);
    const effectiveId = selectedNoteId || linkedForReview?.id || noteIdByCode[finalPrimary];
    const note = await upsertClinicalNote({
      id: effectiveId,
      hedisMemberId: member.id,
      patientId: member.id,
      gapCodes: finalCodes,
      formType: formTypeForCodes(finalCodes),
      status: 'signed',
      payload: buildNotePayload(finalCodes),
      pdf,
      // Omit signedByName — upsertClinicalNote stamps signed_by_id +
      // signed_by_name from currentUserProfile so the row records the
      // actual signer instead of a placeholder.
    });
    if (note?.id) finalCodes.forEach(c => rememberNoteId(c, note.id));
    bulkUpdateGapStatuses(member.id, Object.fromEntries(finalCodes.map(c => [c, 'Completed'])));
    // If this note was previously submitted (author → review → sign OR
    // reviewer signing off), its sign-off task must be completed — do
    // not create a new task. The Clinical Notes tab is DB-driven (one
    // row per note), so creating a new task would leave the old
    // Pending task visible as a duplicate nested card.
    const existingForTask = selectedNoteId
      ? notesForMember.find(n => n.id === selectedNoteId)
      : linkedForReview;
    const taskIdToComplete = existingForTask?.reviewTaskId || note?.reviewTaskId || editingTaskId || null;
    if (taskIdToComplete) {
      try { await useAppStore.getState().updateTask(taskIdToComplete, { status: 'completed' }); } catch { /* optimistic */ }
    }
    logCareGapActivity(member.id, {
      title: 'Clinical Note Signed',
      detail: `Direct sign path · ${finalCodes.join(', ')}`,
      actor: signer,
      icon: 'solar:pen-new-square-linear',
      gapCodes: finalCodes,
      attachment: pdf,
      t: 'clinical_note',
      detailCard: buildDetailCard({
        codes: finalCodes,
        status: 'Signed',
        reviewer: signer,
        signedDate: new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        noteId: note?.id,
        pdfDataUrl: pdf?.dataUrl,
      }),
    });
    showToast('Saved and signed');
    onClose();
  };

  const handleSignAndPrint = async () => {
    setSubmitted(true);
    const { codes, primary } = noteScope();
    if (!dateOfService) { showToast('Date of Service is required'); return; }
    const linkedForReview = editingTaskId
      ? notesForMember.find(n => String(n.reviewTaskId) === String(editingTaskId))
      : null;
    if (codes.length === 0 && !linkedForReview) {
      showToast('No gaps marked Ready for Review');
      return;
    }
    const signer = actorName();
    let finalCodes = codes;
    let finalPrimary = primary;
    if (selectedNoteId) {
      const existing = notesForMember.find(n => n.id === selectedNoteId);
      if (existing?.gapCodes?.length) {
        finalCodes = existing.gapCodes;
        finalPrimary = finalCodes[0] || primary;
      }
    } else if (linkedForReview?.gapCodes?.length) {
      finalCodes = linkedForReview.gapCodes;
      finalPrimary = finalCodes[0] || primary;
    }
    const pdf = buildPdf(finalCodes, signer);
    const effectiveId = selectedNoteId || linkedForReview?.id || noteIdByCode[finalPrimary];
    const note = await upsertClinicalNote({
      id: effectiveId,
      hedisMemberId: member.id,
      patientId: member.id,
      gapCodes: finalCodes,
      formType: formTypeForCodes(finalCodes),
      status: 'signed',
      payload: buildNotePayload(finalCodes),
      pdf,
      // Store stamps the real signer from currentUserProfile.
    });
    if (note?.id) finalCodes.forEach(c => rememberNoteId(c, note.id));
    bulkUpdateGapStatuses(member.id, Object.fromEntries(finalCodes.map(c => [c, 'Completed'])));
    const existingForTask = selectedNoteId
      ? notesForMember.find(n => n.id === selectedNoteId)
      : linkedForReview;
    const taskIdToComplete = existingForTask?.reviewTaskId || note?.reviewTaskId || editingTaskId || null;
    if (taskIdToComplete) {
      try { await useAppStore.getState().updateTask(taskIdToComplete, { status: 'completed' }); } catch { /* optimistic */ }
    }
    logCareGapActivity(member.id, {
      title: 'Clinical Note Signed',
      detail: `Direct sign path · ${finalCodes.join(', ')}`,
      actor: signer,
      icon: 'solar:printer-linear',
      gapCodes: finalCodes,
      attachment: pdf,
      t: 'clinical_note',
      detailCard: buildDetailCard({
        codes: finalCodes,
        status: 'Signed',
        reviewer: signer,
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

  const noteCtx = { audioOnly, audioVideo, activeGaps };
  const activeMandatoryComplete = activeGap
    ? isMandatoryComplete(activeGap.code, gapState[activeGap.code] ?? {}, noteCtx)
    : false;
  const anyReadyForReview = activeGaps.some(g =>
    isMandatoryComplete(g.code, gapState[g.code] ?? {}, noteCtx)
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
    // DSF: exposed so the bespoke DsfaEvidenceForm can fire the
    // native "open DSF-B" trigger on PHQ-2 Positive.
    openDsfbGap,
    openDsfbView,
    // True when this hook is driving the reviewer's sign-off drawer
    // (editingTaskId set). Downstream forms use it to switch into
    // read-only mode and hide author-only actions (Save Score, Open
    // DSF-B, Sub-question interactivity, Decline toggle).
    isReviewFlow: !!editingTaskId,
  };
}
