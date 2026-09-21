import { useEffect, useMemo, useState } from 'react';
import {
  bulkAssign,
  bulkDeleteSelected,
  bulkSetPriority,
  bulkSetStatus,
} from './carePlanBulkActions';
import { createUndoToastAction } from './carePlanGbiActions';

export function useCarePlanBulkSelection({
  bulkMode,
  setCarePlanBulkMode,
  filteredGoals,
  filteredInterventions,
  filteredBarriers,
  patientId,
  program,
  savePatientCarePlanGoal,
  savePatientCarePlanIntervention,
  savePatientCarePlanBarrier,
  deletePatientCarePlanGoal,
  deletePatientCarePlanIntervention,
  deletePatientCarePlanBarrier,
  refreshCarePlanDuplicates,
  showToast,
}) {
  const [selected, setSelected] = useState({ goal: new Set(), intv: new Set(), barrier: new Set() });
  const [bulkMenu, setBulkMenu] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);

  const selectedCount = selected.goal.size + selected.intv.size + selected.barrier.size;

  const toggleSelect = (kind, id) => setSelected(prev => {
    const next = new Set(prev[kind]);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return { ...prev, [kind]: next };
  });

  const clearSelection = () => setSelected({ goal: new Set(), intv: new Set(), barrier: new Set() });

  const selectAllKind = (kind, rows, checked) => setSelected(prev => ({
    ...prev,
    [kind]: checked ? new Set(rows.map(r => r.id)) : new Set(),
  }));

  useEffect(() => {
    if (!bulkMode) setSelected({ goal: new Set(), intv: new Set(), barrier: new Set() });
  }, [bulkMode]);

  useEffect(() => () => setCarePlanBulkMode(false), [setCarePlanBulkMode]);

  const gbiCtx = useMemo(() => ({
    patientId,
    program,
    savePatientCarePlanGoal,
    savePatientCarePlanIntervention,
    savePatientCarePlanBarrier,
    deletePatientCarePlanGoal,
    deletePatientCarePlanIntervention,
    deletePatientCarePlanBarrier,
    refreshCarePlanDuplicates,
    showToast,
  }), [
    patientId,
    program,
    savePatientCarePlanGoal,
    savePatientCarePlanIntervention,
    savePatientCarePlanBarrier,
    deletePatientCarePlanGoal,
    deletePatientCarePlanIntervention,
    deletePatientCarePlanBarrier,
    refreshCarePlanDuplicates,
    showToast,
  ]);

  const bulkArgs = useMemo(() => ({
    selected,
    filteredGoals,
    filteredInterventions,
    filteredBarriers,
    ctx: gbiCtx,
    clearSelection,
    createUndoToastAction,
  }), [selected, filteredGoals, filteredInterventions, filteredBarriers, gbiCtx]);

  return {
    selected,
    bulkMenu,
    setBulkMenu,
    bulkDeleteOpen,
    setBulkDeleteOpen,
    bulkAssignOpen,
    setBulkAssignOpen,
    selectedCount,
    toggleSelect,
    clearSelection,
    selectAllKind,
    bulkSetStatus: (status) => {
      setBulkMenu(null);
      return bulkSetStatus(status, bulkArgs);
    },
    bulkSetPriority: (priority) => {
      setBulkMenu(null);
      return bulkSetPriority(priority, bulkArgs);
    },
    bulkAssign: (user) => {
      setBulkAssignOpen(false);
      return bulkAssign(user, bulkArgs);
    },
    bulkDelete: () => {
      setBulkDeleteOpen(false);
      return bulkDeleteSelected(bulkArgs);
    },
    gbiCtx,
  };
}
