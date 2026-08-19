import { useState, useMemo, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { generateClinicalNotePdf } from './lib/generateClinicalNotePdf';
import {
  CURRENT_USER,
  defaultGapData,
  isMandatoryComplete,
} from './ClinicalNotePanel.utils';

export function useClinicalNotePanel({ member, gapCode, onClose, editingTaskId = null }) {
  const showToast = useAppStore(s => s.showToast);
  const bulkUpdateGapStatuses = useAppStore(s => s.bulkUpdateGapStatuses);
  const logCareGapActivity = useAppStore(s => s.logCareGapActivity);
  const createCareGapSignOffTask = useAppStore(s => s.createCareGapSignOffTask);
  const updateSignOffTaskPdf = useAppStore(s => s.updateSignOffTaskPdf);

  const activeGaps = useMemo(
    () => member.gaps.filter(g => g.status !== 'Completed' && !String(g.status).startsWith('Closed')),
    [member.gaps],
  );

  const assigneeFor = useCallback(
    (g) => g.assignee ?? member.assignee ?? CURRENT_USER,
    [member.assignee],
  );
  const myGaps = useMemo(() => activeGaps.filter(g => assigneeFor(g) === CURRENT_USER), [activeGaps, assigneeFor]);
  const otherGaps = useMemo(() => activeGaps.filter(g => assigneeFor(g) !== CURRENT_USER), [activeGaps, assigneeFor]);
  const orderedGaps = useMemo(() => [...myGaps, ...otherGaps], [myGaps, otherGaps]);

  const [commonExpanded, setCommonExpanded] = useState(true);
  const [dateOfService, setDateOfService] = useState(() => new Date().toISOString().slice(0, 10));
  const [audioOnly, setAudioOnly] = useState(false);
  const [audioVideo, setAudioVideo] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [gapState, setGapState] = useState(() => {
    const init = {};
    activeGaps.forEach(g => {
      init[g.code] = { expanded: g.code === gapCode, manuallyOff: false, ...defaultGapData(g.code), ...(g.draft ?? {}) };
    });
    return init;
  });

  const updateGap = useCallback((code, patch) => {
    setGapState(prev => ({ ...prev, [code]: { ...prev[code], ...patch } }));
  }, []);

  const isReadyForReview = (code) => {
    const data = gapState[code] ?? {};
    return isMandatoryComplete(code, data) && !data.manuallyOff;
  };

  const collectReadyCodes = () => {
    const codes = [];
    for (const g of orderedGaps) {
      if (isReadyForReview(g.code)) codes.push(g.code);
    }
    return codes;
  };

  const buildPdf = (readyCodes, signedBy) => generateClinicalNotePdf({
    member, gapCodes: readyCodes, dateOfService, audioOnly, audioVideo, gapData: gapState, signedBy,
  });

  const handleSaveDraft = () => {
    setSubmitted(true);
    logCareGapActivity(member.id, {
      title: 'Draft saved',
      detail: orderedGaps.map(g => g.code).join(', '),
      actor: CURRENT_USER,
      icon: 'solar:diskette-linear',
      gapCodes: orderedGaps.map(g => g.code),
    });
    showToast('Draft saved');
  };

  const handleSubmitForReview = async () => {
    setSubmitted(true);
    const readyCodes = collectReadyCodes();
    if (!dateOfService) { showToast('Date of Service is required'); return; }
    if (readyCodes.length === 0) { showToast('No gaps marked Ready for Review'); return; }
    const pdf = buildPdf(readyCodes, CURRENT_USER);
    if (editingTaskId) {
      updateSignOffTaskPdf(editingTaskId, pdf, CURRENT_USER);
      showToast('Sign-off note updated');
      onClose();
      return;
    }
    bulkUpdateGapStatuses(member.id, Object.fromEntries(readyCodes.map(c => [c, 'Submitted'])));
    logCareGapActivity(member.id, {
      title: 'Submitted for review', detail: `Ready gaps: ${readyCodes.join(', ')}`,
      actor: CURRENT_USER, icon: 'solar:upload-square-linear', gapCodes: readyCodes, attachment: pdf,
    });
    await createCareGapSignOffTask({ hedisMemberId: member.id, gapCodes: readyCodes, state: member.state, pdf });
    showToast(`Submitted for review — ${readyCodes.length} gap${readyCodes.length === 1 ? '' : 's'} → Submitted`);
    onClose();
  };

  const handleSaveAndSign = () => {
    setSubmitted(true);
    const readyCodes = collectReadyCodes();
    if (!dateOfService) { showToast('Date of Service is required'); return; }
    if (readyCodes.length === 0) { showToast('No gaps marked Ready for Review'); return; }
    const pdf = buildPdf(readyCodes, 'Provider');
    bulkUpdateGapStatuses(member.id, Object.fromEntries(readyCodes.map(c => [c, 'Completed'])));
    logCareGapActivity(member.id, {
      title: 'Signed by provider', detail: `Direct sign path · ${readyCodes.join(', ')}`,
      actor: 'Provider', icon: 'solar:pen-new-square-linear', gapCodes: readyCodes, attachment: pdf,
    });
    showToast('Saved and signed — provider sign path');
    onClose();
  };

  const handleSignAndPrint = () => {
    setSubmitted(true);
    const readyCodes = collectReadyCodes();
    if (!dateOfService) { showToast('Date of Service is required'); return; }
    if (readyCodes.length === 0) { showToast('No gaps marked Ready for Review'); return; }
    const pdf = buildPdf(readyCodes, 'Provider');
    bulkUpdateGapStatuses(member.id, Object.fromEntries(readyCodes.map(c => [c, 'Completed'])));
    logCareGapActivity(member.id, {
      title: 'Signed and printed', detail: `Direct sign path · ${readyCodes.join(', ')}`,
      actor: 'Provider', icon: 'solar:printer-linear', gapCodes: readyCodes, attachment: pdf,
    });
    if (pdf?.dataUrl) {
      const w = window.open(pdf.dataUrl, '_blank');
      try { w?.focus(); } catch (_) { /* popup blocker */ }
    }
    showToast('Signed and printing…');
    onClose();
  };

  const drawerTitle = editingTaskId ? 'Edit Clinical Note' : 'Consolidated Clinical Note';
  const ageShort = member.age ? member.age.split('y')[0] + 'Y' : '';

  return {
    showToast, myGaps, otherGaps, commonExpanded, setCommonExpanded,
    dateOfService, setDateOfService, audioOnly, setAudioOnly, audioVideo, setAudioVideo,
    submitted, gapState, updateGap, isReadyForReview, assigneeFor,
    handleSaveDraft, handleSubmitForReview, handleSaveAndSign, handleSignAndPrint,
    drawerTitle, ageShort,
  };
}
