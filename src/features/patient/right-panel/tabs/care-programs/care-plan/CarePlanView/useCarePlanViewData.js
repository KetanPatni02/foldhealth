import { useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { selectPatientNameFromMemberSlices } from '@/lib/patientNameFromStore';

const EMPTY_ARR = [];

/** Store subscriptions and derived plan/audit state for CarePlanView. */
export function useCarePlanViewData(patientId, program) {
  const fetchPatientCarePlan = useAppStore(s => s.fetchPatientCarePlan);
  const savePatientCarePlanGoal = useAppStore(s => s.savePatientCarePlanGoal);
  const deletePatientCarePlanGoal = useAppStore(s => s.deletePatientCarePlanGoal);
  const savePatientCarePlanIntervention = useAppStore(s => s.savePatientCarePlanIntervention);
  const deletePatientCarePlanIntervention = useAppStore(s => s.deletePatientCarePlanIntervention);
  const savePatientCarePlanBarrier = useAppStore(s => s.savePatientCarePlanBarrier);
  const deletePatientCarePlanBarrier = useAppStore(s => s.deletePatientCarePlanBarrier);
  const refreshCarePlanDuplicates = useAppStore(s => s.refreshCarePlanDuplicates);
  const dismissCarePlanDuplicate = useAppStore(s => s.dismissCarePlanDuplicate);
  const savePatientCarePlanAsTemplate = useAppStore(s => s.savePatientCarePlanAsTemplate);
  const signCarePlan = useAppStore(s => s.signCarePlan);
  const addCarePlanNote = useAppStore(s => s.addCarePlanNote);
  const logCarePlanAudit = useAppStore(s => s.logCarePlanAudit);
  const fetchCarePlanAudit = useAppStore(s => s.fetchCarePlanAudit);
  const showToast = useAppStore(s => s.showToast);
  const patientName = useAppStore(s => selectPatientNameFromMemberSlices(s, patientId));
  const platformUsers = useAppStore(s => s.platformUsers);
  const fetchPlatformUsers = useAppStore(s => s.fetchPlatformUsers);
  const patientProblems = useAppStore(s => s.patientProblems[patientId] || EMPTY_ARR);
  const fetchPatientProblems = useAppStore(s => s.fetchPatientProblems);
  const carePlanShareRequest = useAppStore(s => s.carePlanShareRequest);
  const clearCarePlanShareRequest = useAppStore(s => s.clearCarePlanShareRequest);
  const bulkMode = useAppStore(s => s.carePlanBulkMode);
  const setCarePlanBulkMode = useAppStore(s => s.setCarePlanBulkMode);
  const carePlanPanelRequest = useAppStore(s => s.carePlanPanelRequest);
  const clearCarePlanPanelRequest = useAppStore(s => s.clearCarePlanPanelRequest);
  const carePlanTemplates = useAppStore(s => s.carePlanTemplates);
  const fetchCarePlanLibrary = useAppStore(s => s.fetchCarePlanLibrary);
  const libraryGoals = useAppStore(s => s.carePlanGoals);
  const repairCarePlanGoalLinks = useAppStore(s => s.repairCarePlanGoalLinks);
  const syncAppliedCarePlanTemplates = useAppStore(s => s.syncAppliedCarePlanTemplates);
  const applyPatientCarePlanTemplates = useAppStore(s => s.applyPatientCarePlanTemplates);
  const savePatientCarePlanConditions = useAppStore(s => s.savePatientCarePlanConditions);
  const fetchCarePlanLinks = useAppStore(s => s.fetchCarePlanLinks);

  const key = patientId && program ? `${patientId}::${program.id}` : null;
  const live = useAppStore(s => (key ? s.patientCarePlans[key] : null));
  const auditAll = useAppStore(s => (key ? s.patientCarePlanAudit[key] : null)) || [];
  const duplicateFlags = useAppStore(s => (key ? s.carePlanDuplicateFlags[key] : null)) || EMPTY_ARR;
  const carePlanLoading = useAppStore(s => (key ? !!s.patientCarePlanLoading[key] : false));

  useEffect(() => { fetchPlatformUsers?.(); }, [fetchPlatformUsers]);
  useEffect(() => { if (patientId) fetchPatientProblems(patientId); }, [patientId, fetchPatientProblems]);
  useEffect(() => {
    if (patientId && program?.id) fetchCarePlanAudit?.(patientId, program.id);
  }, [patientId, program?.id, fetchCarePlanAudit]);

  const planNoteHistory = useMemo(() => (
    auditAll
      .filter(a => a.action === 'note' && (a.entityType === 'plan' || !a.entityType))
      .sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt))
  ), [auditAll]);

  const latestClearAt = useMemo(() => {
    const clears = auditAll
      .filter(a => a.action === 'note_cleared' && (a.entityType === 'plan' || !a.entityType))
      .sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt));
    return clears[0]?.createdAt || null;
  }, [auditAll]);

  const rawLatestNote = planNoteHistory[0] || null;
  const latestPlanNote = (rawLatestNote && latestClearAt && new Date(latestClearAt) > new Date(rawLatestNote.createdAt))
    ? null
    : rawLatestNote;

  const noteTimelineEntries = useMemo(() => (
    planNoteHistory.map(a => {
      const created = a.createdAt ? new Date(a.createdAt) : null;
      return {
        id: a.id,
        t: 'comment',
        date: created ? created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
        time: created ? created.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null,
        by: a.actor || 'Unknown',
        title: 'Added a Note',
        commentBody: a.detail || '',
      };
    })
  ), [planNoteHistory]);

  return {
    key,
    live,
    auditAll,
    duplicateFlags,
    carePlanLoading,
    latestPlanNote,
    noteTimelineEntries,
    patientName,
    patientProblems,
    platformUsers,
    bulkMode,
    setCarePlanBulkMode,
    carePlanShareRequest,
    clearCarePlanShareRequest,
    carePlanPanelRequest,
    clearCarePlanPanelRequest,
    carePlanTemplates,
    libraryGoals,
    fetchPatientCarePlan,
    fetchCarePlanLinks,
    fetchCarePlanLibrary,
    refreshCarePlanDuplicates,
    dismissCarePlanDuplicate,
    savePatientCarePlanAsTemplate,
    signCarePlan,
    addCarePlanNote,
    logCarePlanAudit,
    showToast,
    savePatientCarePlanGoal,
    deletePatientCarePlanGoal,
    savePatientCarePlanIntervention,
    deletePatientCarePlanIntervention,
    savePatientCarePlanBarrier,
    deletePatientCarePlanBarrier,
    repairCarePlanGoalLinks,
    syncAppliedCarePlanTemplates,
    applyPatientCarePlanTemplates,
    savePatientCarePlanConditions,
  };
}
