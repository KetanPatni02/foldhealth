import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { buildAssignCandidates, groupIcdsByHcc } from './DiagPanel.utils';
import { resolveCurrentAssignee } from '../HccWorklistRow.utils';
import { icdMatchesFilters, activeFilterCount as countFilters, EMPTY_FILTERS } from './DiagPanelFilterBar.utils';
import { computeReviewProgress, buildReviewStages } from './ReviewProgressPopover.utils';
import { getIcdsForMember, getNotLinkedForMember } from '../data/icds';
import { dosKey } from '../assignment/dosState';
import { dosSourceLetter } from '../dosSource';
import { slaOutcome } from '../sla';

const VIEW_MODES = ['HCC', 'ICD'];
const isGroupIcdOpen = (icd) => !['Accepted', 'Dismissed'].includes(icd.status);

export function useDiagPanel() {
  const memberId = useAppStore(s => s.diagPanelMemberId);
  const closeDiagPanel = useAppStore(s => s.closeDiagPanel);
  const diagViewMode = useAppStore(s => s.diagViewMode);
  const setDiagViewMode = useAppStore(s => s.setDiagViewMode);
  const member = useAppStore(s => s.hccMembers.find(m => m.id === memberId));
  const showToast = useAppStore(s => s.showToast);
  const fetchHccDiagnosisGaps = useAppStore(s => s.fetchHccDiagnosisGaps);
  const diagnosisGaps = useAppStore(s => s.hccDiagnosisGaps);
  const diagnosisGapsLoading = useAppStore(s => s.hccDiagnosisGapsLoading);
  const diagDosFilter = useAppStore(s => s.diagDosFilter);
  const setDiagDosFilter = useAppStore(s => s.setDiagDosFilter);
  const diagDosStatus = useAppStore(s => s.diagDosStatus);
  const setDiagDosStatus = useAppStore(s => s.setDiagDosStatus);
  // Assignment-engine read/write — drives the Coder status pill below.
  const hccDosAssignments = useAppStore(s => s.hccDosAssignments);
  const initializeHccPatient = useAppStore(s => s.initializeHccPatient);
  const hccCompleteSupport = useAppStore(s => s.hccCompleteSupport);
  const hccCompleteCoder = useAppStore(s => s.hccCompleteCoder);
  const hccCompleteR1 = useAppStore(s => s.hccCompleteR1);
  const hccCompleteR2 = useAppStore(s => s.hccCompleteR2);
  const hccCompleteR3 = useAppStore(s => s.hccCompleteR3);
  const hccRequestRecords = useAppStore(s => s.hccRequestRecords);
  const hccMarkInsufficient = useAppStore(s => s.hccMarkInsufficient);
  const hccRejectDos = useAppStore(s => s.hccRejectDos);
  const hccReturnDos = useAppStore(s => s.hccReturnDos);
  const hccMarkSupportInProgress = useAppStore(s => s.hccMarkSupportInProgress);
  const hccSetRoleStatus = useAppStore(s => s.hccSetRoleStatus);
  const diagSnapFilter = useAppStore(s => s.diagSnapFilter);
  const setDiagSnapFilter = useAppStore(s => s.setDiagSnapFilter);
  const diagSnapOpen = useAppStore(s => s.diagSnapOpen);
  const setDiagSnapOpen = useAppStore(s => s.setDiagSnapOpen);
  const diagLeftPanel = useAppStore(s => s.diagLeftPanel);
  const diagActivityIcd = useAppStore(s => s.diagActivityIcd);
  const setDiagLeftPanel = useAppStore(s => s.setDiagLeftPanel);
  const setDiagTab = useAppStore(s => s.setDiagTab);

  const [overriddenOpen, setOverriddenOpen] = useState(false);
  const [closedOpen, setClosedOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch diagnosis gaps from Supabase when member changes
  useEffect(() => {
    if (member?.name) fetchHccDiagnosisGaps(member.id, member.name);
  }, [member?.id, member?.name, fetchHccDiagnosisGaps]);

  // Phase 2f — fall back to the local ICD mock when Supabase has no rows for
  // this member. Without the fallback, the panel would render empty for any
  // member that hasn't been seeded into `hcc_diagnosis_gaps` yet.
  const icdsRaw = useMemo(() => {
    const fromSupabase = diagnosisGaps.filter(g => g.isLinked !== false);
    if (fromSupabase.length > 0) return fromSupabase;
    return member?.name ? getIcdsForMember(member.name) : [];
  }, [diagnosisGaps, member?.name]);

  const notLinkedRaw = useMemo(() => {
    const fromSupabase = diagnosisGaps.filter(g => g.isLinked === false);
    if (fromSupabase.length > 0) return fromSupabase;
    return member?.name ? getNotLinkedForMember(member.name) : [];
  }, [diagnosisGaps, member?.name]);

  // Snapshot-tile filter: 'Open' = anything not Accepted/Dismissed,
  // 'Suspect' / 'Recapture' / 'Other' narrows by AI suggestion type.
  const passSnapFilter = (icd) => {
    if (!diagSnapFilter || diagSnapFilter === 'Open') return true;
    if (diagSnapFilter === 'Suspect')   return icd.type === 'Suspect';
    if (diagSnapFilter === 'Recapture') return icd.type === 'Recapture';
    // 'Other' = not Suspect/Recapture
    return !['Suspect', 'Recapture'].includes(icd.type || '');
  };

  const icds = useMemo(
    () => icdsRaw.filter(passSnapFilter),
    [icdsRaw, diagSnapFilter],
  );
  const notLinked = useMemo(
    () => notLinkedRaw.filter(passSnapFilter),
    [notLinkedRaw, diagSnapFilter],
  );

  const hccGroups = useMemo(() => groupIcdsByHcc(icds, notLinked), [icds, notLinked]);

  // Buckets used by the ICD (default) view, matching the prototype's
  // four-section layout (lines 3106–3217):
  //  - assocICDs: regular ICDs + AI-suggested ICDs that have been accepted.
  //  - allNotAssoc: AI-suggested ICDs not yet accepted, plus genuinely
  //    unlinked rows.
  //  - overriddenICDs: any ICD with the `overrides` flag (dismissed-with-reason).
  //  - closedICDs: Accepted or Dismissed status.
  const assocICDs = useMemo(
    () => icds.filter(i => !isAISuggested(i) || i.status === 'Accepted'),
    [icds],
  );
  const allNotAssoc = useMemo(() => [
    ...icds.filter(i => isAISuggested(i) && i.status !== 'Accepted'),
    ...notLinked,
  ], [icds, notLinked]);
  const overriddenICDs = useMemo(
    () => [...icdsRaw, ...notLinkedRaw].filter(i => i.dismissReason),
    [icdsRaw, notLinkedRaw],
  );
  const closedICDs = useMemo(
    () => [...icdsRaw, ...notLinkedRaw].filter(i => ['Accepted', 'Dismissed'].includes(i.status)),
    [icdsRaw, notLinkedRaw],
  );

  // ── DOS list — for the DosSelector dropdown. Mostly comes from the member's
  // dos_list field (loaded from Supabase / hcc store). If empty, we fall back
  // to a single-row stub built from member.dos so the selector still works.
  const dosList = useMemo(() => {
    if (member?.dos_list?.length) return member.dos_list;
    if (member?.dos) return [{ date: member.dos, status: diagDosStatus }];
    return [];
  }, [member, diagDosStatus]);

  const isSweep = diagDosFilter === 'All DOSs';
  const currentDos = isSweep ? null : (diagDosFilter || dosList[0]?.date || null);

  // Lazily seed the assignment engine for this patient — the first time the
  // DiagPanel opens, every DOS gets a Support assignee + Awaiting status.
  // Idempotent, so subsequent opens are no-ops.
  useEffect(() => {
    if (member?.id) initializeHccPatient(member.id);
  }, [member?.id, initializeHccPatient]);

  // Live engine state for the currently-selected DOS. Used to drive the
  // status pill below and the assignee badge.
  const dosStateKey = member && currentDos ? `${member.id}::${currentDos}` : null;
  const dosState = dosStateKey ? hccDosAssignments[dosStateKey] : null;

  // Current bucket the DOS sits in — drives both the status pill (right
  // side of DOS row) and the AssigneeAvatar (left side) so they always
  // agree on which role is active.
  const currentBucket = useMemo(
    () => resolveCurrentAssignee(member, dosState),
    [member, dosState],
  );

  // Status text shown in the pill. Reads from whichever role currently
  // owns the DOS so we never display the Coder's old "Completed" state
  // when the workflow has already advanced to a downstream reviewer.
  const currentStatus = useMemo(() => {
    if (!currentBucket) return diagDosStatus || 'New';
    if (currentBucket.kind === 'billing')    return 'Completed';
    if (currentBucket.kind === 'unassigned') return 'Awaiting';
    // kind === 'active' — use the role's live status (or a sensible
    // default when the engine seeded an assignee without a status yet).
    return currentBucket.status || 'In Progress';
  }, [currentBucket, diagDosStatus]);

  // ── Compliance gate (Astrana spec) ─────────────────────────────────
  // Mark Complete may only fire on Support → Coder when every document
  // touching this (member, dos) has all 5 compliance checks passed.
  // We filter the in-flight SFTP batches to just those whose encounters
  // include this patient + DOS, then ask the engine. When no batches
  // are tracked for this DOS the gate is a no-op (legacy path preserved).
  const hccSftpBatches = useAppStore(s => s.hccSftpBatches) || [];
  const complianceGates = useMemo(() => {
    if (!member?.id || !currentDos) return undefined;
    const docsForDos = [];
    for (const b of hccSftpBatches) {
      if (!b.compliance) continue;
      const hasMatch = (b.encounters || []).some(e =>
        e.patient?.matchedMemberId === member.id && e.dos === currentDos
      );
      if (hasMatch) {
        docsForDos.push({ fileName: b.fileName, ocrTier: b.ocrTier, compliance: b.compliance });
      }
    }
    if (docsForDos.length === 0) return undefined;
    const { ok, reason } = canCompleteDos(docsForDos);
    return ok ? undefined : { Completed: { enabled: false, reason } };
  }, [member?.id, currentDos, hccSftpBatches]);

  // ── Review-progress stages + ring (drives the With-Coder pill) ──
  const reviewStages = useMemo(
    () => buildReviewStages(member, dosState),
    [member, dosState],
  );
  const reviewProgress = useMemo(
    () => computeReviewProgress(reviewStages),
    [reviewStages],
  );
  // Pill label adapts to the current active stage so it doesn't read "With
  // Coder" when the DOS is actually with Support / a Reviewer / Billing.
  const pillLabel = useMemo(() => {
    const active = reviewStages.find(s => s.state === 'active');
    if (active) return `With ${active.label}`;
    if (reviewStages.every(s => s.state === 'done')) return 'Billing Ready';
    const firstPending = reviewStages.find(s => s.state === 'pending');
    return firstPending ? `Awaiting ${firstPending.label}` : 'With Coder';
  }, [reviewStages]);

  // Hover state for the Review Progress popover.
  const pillRef = useRef(null);
  const openTimer = useRef(null);
  const closeTimer = useRef(null);
  const [pillRect, setPillRect] = useState(null);
  const onPillEnter = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    if (pillRect) return;
    openTimer.current = setTimeout(() => {
      const r = pillRef.current?.getBoundingClientRect();
      if (r) setPillRect(r);
    }, 200);
  };
  const onPillLeave = () => {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
    closeTimer.current = setTimeout(() => setPillRect(null), 200);
  };
  const cancelClose = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  const requestClose = () => {
    closeTimer.current = setTimeout(() => setPillRect(null), 200);
  };
  useEffect(() => () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  }, []);

  // Bridge from the DosStatusMenu's onChange to the right lifecycle
  // transition for whichever role currently owns the DOS. Some choices
  // (Record Requested → only Coder; Insufficient / Reject → only Support;
  // Returned → only reviewers) are role-specific and silently no-op when
  // the chosen value doesn't apply to the active role.
  const handleStatusChange = (next) => {
    if (!member || !currentDos) { setDiagDosStatus(next); return; }
    const role = currentBucket?.kind === 'active' ? currentBucket.role : null;
    if (!role) { setDiagDosStatus(next); return; }

    // Strategy:
    //  - If the engine has a dedicated AC for this (role, status) combo,
    //    fire it so the lifecycle event lands in the activity log AND any
    //    downstream effects (handoff to next role, sampling, etc.) happen.
    //  - Otherwise fall back to the generic role-status patcher so the
    //    user's pick is always reflected on the pill (no silent no-op).
    switch (next) {
      case 'Completed':
        if (role === 'support')      hccCompleteSupport(member.id, currentDos);
        else if (role === 'coder')   hccCompleteCoder(member.id, currentDos);
        else if (role === 'r1')      hccCompleteR1(member.id, currentDos);
        else if (role === 'r2')      hccCompleteR2(member.id, currentDos);
        else if (role === 'r3')      hccCompleteR3(member.id, currentDos);
        else                         hccSetRoleStatus(member.id, currentDos, role, 'Completed');
        break;
      case 'Record Requested':
        if (role === 'coder')        hccRequestRecords(member.id, currentDos);
        else                         hccSetRoleStatus(member.id, currentDos, role, 'Record Requested');
        break;
      case 'Insufficient':
        if (role === 'support')      hccMarkInsufficient(member.id, currentDos, 'current-user', 'Docs incomplete');
        else                         hccSetRoleStatus(member.id, currentDos, role, 'Insufficient');
        break;
      case 'Reject':
        if (role === 'support')      hccRejectDos(member.id, currentDos, 'current-user', 'Docs failed checklist');
        else                         hccSetRoleStatus(member.id, currentDos, role, 'Reject');
        break;
      case 'Returned':
        // Engine's RETURN_TARGET map only knows r1→coder / r2→r1 / r3→r2;
        // for support/coder we just record the status string.
        if (role === 'r1' || role === 'r2' || role === 'r3') {
          hccReturnDos(member.id, currentDos, role, 'current-user', `Returned from ${role}`);
        } else {
          hccSetRoleStatus(member.id, currentDos, role, 'Returned');
        }
        break;
      case 'In Progress':
        if (role === 'support')      hccMarkSupportInProgress(member.id, currentDos, 'current-user');
        else                         hccSetRoleStatus(member.id, currentDos, role, 'In Progress');
        break;
      // No dedicated AC — generic patch keeps the pill in sync.
      case 'New':
      case 'Awaiting':
      case 'Record Received':
      default:
        hccSetRoleStatus(member.id, currentDos, role, next);
        break;
    }
    setDiagDosStatus(next);
  };

  // Snapshot-tile counts — derived from the *raw* (un-snapFiltered) data
  // so the counts remain stable while the user toggles the snapshot tiles.
  // 'Open' = anything not Accepted or Dismissed.
  // Suspect/Recapture buckets the AI-suggested ICDs; everything else falls
  // into "Other".
  const snapCounts = useMemo(() => {
    const all = [...icdsRaw, ...notLinkedRaw].filter(g => !['Accepted', 'Dismissed'].includes(g.status));
    const suspect = all.filter(g => g.type === 'Suspect').length;
    const recapture = all.filter(g => g.type === 'Recapture').length;
    const other = all.length - suspect - recapture;
    return { open: all.length, suspect, recapture, other };
  }, [icdsRaw, notLinkedRaw]);

  if (!member) return null;

  // Bucket groups by their overall resolution state. A group is "active" if
  // any ICD in either bucket is still open. "Overridden" surfaces groups that
  // have at least one dismissed-with-reason row but are no longer active.
  // "Closed" — everything fully resolved.
  const activeGroups = hccGroups.filter(g => groupAllIcds(g).some(isGroupIcdOpen));
  const overriddenGroups = hccGroups.filter(g =>
    groupAllIcds(g).some(i => i.dismissReason) && !activeGroups.some(ag => ag.hcc === g.hcc),
  );
  const closedGroups = hccGroups.filter(g => groupAllIcds(g).every(i => !isGroupIcdOpen(i)));

  const rafImpact = (Number(member.ri) || 0).toFixed(3);
  const noop = (label) => () => showToast(`${label} — coming soon`);

  return {
    active,
    activeFilterCount,
    activeGroups,
    all,
    allNotAssoc,
    allSelected,
    assigneeResolved,
    assocICDs,
    b,
    bulkMode,
    cancelClose,
    clearFilters,
    closeDiagPanel,
    closeTimer,
    closedGroups,
    closedICDs,
    closedOpen,
    complianceGates,
    currentBucket,
    currentDos,
    currentStatus,
    diagActivityIcd,
    diagDosFilter,
    diagDosStatus,
    diagLeftPanel,
    diagSnapFilter,
    diagSnapOpen,
    diagViewMode,
    diagnosisGaps,
    diagnosisGapsLoading,
    docsForDos,
    dosList,
    dosState,
    dosStateKey,
    fetchHccDiagnosisGaps,
    filteredAssoc,
    filters,
    firstPending,
    fromSupabase,
    groupAllIcds,
    handleDosStatusChange,
    handleMarkComplete,
    handleRejectConfirm,
    handleSelectAll,
    handleStatusChange,
    hasMatch,
    hccCompleteCoder,
    hccCompleteR1,
    hccCompleteR2,
    hccCompleteR3,
    hccCompleteSupport,
    hccDosAssignments,
    hccGroups,
    hccMarkInsufficient,
    hccMarkSupportInProgress,
    hccRejectDos,
    hccRequestRecords,
    hccReturnDos,
    hccSetRoleStatus,
    hccSftpBatches,
    icds,
    icdsRaw,
    initializeHccPatient,
    isGroupIcdOpen,
    isSweep,
    member,
    memberId,
    memberName,
    noop,
    notLinked,
    notLinkedRaw,
    onPillEnter,
    onPillLeave,
    openTimer,
    other,
    overriddenGroups,
    overriddenICDs,
    overriddenOpen,
    passSnapFilter,
    pillLabel,
    pillRect,
    pillRef,
    progress,
    r,
    rafImpact,
    recapture,
    rejectOpen,
    requestClose,
    reviewProgress,
    reviewStages,
    role,
    searchOpen,
    searchQuery,
    selectedKeys,
    setDiagDosFilter,
    setDiagDosStatus,
    setDiagLeftPanel,
    setDiagSnapFilter,
    setDiagSnapOpen,
    setDiagTab,
    setDiagViewMode,
    setFilters,
    setRejectOpen,
    setSearchQuery,
    setViewMode,
    showToast,
    snapCounts,
    someSelected,
    stages,
    suspect,
    toggleBulkMode,
    toggleKey,
    viewMode
  };
}
