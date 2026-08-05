import { useMemo, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import { WorklistShell } from '../../components/WorklistShell/WorklistShell';
import { QueueRow } from './QueueRow';
import { QueueEmptyState } from './QueueEmptyState';
import { TableSkeleton } from '../../components/TableSkeleton/TableSkeleton';

// Agent-owned columns get their own header band (tinted background, primary
// text, 2px rails on both ends) so they read as one grouped unit.
const agentTh = { background: 'var(--agent-col-bg)', color: 'var(--primary-300)' };
const agentLabel = (icon, text) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
    {icon}
    {text}
  </span>
);

const QUEUE_COLUMNS = [
  { key: 'select', showCheckbox: true, sticky: 'left', left: 0, width: 36 },
  { key: 'members', label: 'Members', sticky: 'left', left: 36, width: 240, thStyle: { borderRight: '0.5px solid var(--neutral-150)' } },
  { key: 'priority', label: 'Priority' },
  { key: 'outreachType', label: 'Outreach Type' },
  { key: 'lace', label: 'LACE Acuity' },
  { key: 'outreachWindow', label: 'Outreach Window' },
  {
    key: 'agentStatus',
    label: agentLabel(
      <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1L8.5 5H13L9.5 7.5L11 11L7 8.5L3 11L4.5 7.5L1 5H5.5L7 1Z" fill="currentColor"/></svg>,
      'Status',
    ),
    thStyle: { ...agentTh, borderLeft: '2px solid var(--primary-200)', minWidth: 200 },
  },
  {
    key: 'agentDueOn',
    label: agentLabel(<Icon name="solar:calendar-linear" size={14} />, 'Due On'),
    thStyle: { ...agentTh, minWidth: 140 },
  },
  {
    key: 'agentNextAction',
    label: agentLabel(
      <svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="2" width="10" height="2" rx="1" fill="currentColor"/><rect x="2" y="6" width="7" height="2" rx="1" fill="currentColor"/><rect x="2" y="10" width="5" height="2" rx="1" fill="currentColor"/></svg>,
      'Next Action',
    ),
    thStyle: { ...agentTh, minWidth: 260 },
  },
  {
    key: 'agentAiInsights',
    label: agentLabel(<Icon name="solar:magic-stick-3-linear" size={14} />, 'AI Insights'),
    thStyle: { ...agentTh, minWidth: 400, borderRight: '2px solid var(--primary-200)' },
  },
  { key: 'tocStatus', label: 'TOC Status' },
  { key: 'dueOn', label: 'Due On' },
  { key: 'nextOutreach', label: 'Next Outreach' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'lastAdmission', label: 'Last Admission' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'readmission', label: 'Readmission' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'carePlanStatus', label: 'Care Plan Status' },
  { key: 'actions', label: 'Actions', sticky: 'right', width: 140 },
];

export function QueueTable() {
  const patients = useAppStore(s => s.patients);
  const patientsLoading = useAppStore(s => s.patientsLoading);
  const fetchPatients = useAppStore(s => s.fetchPatients);
  const fetchCallDetails = useAppStore(s => s.fetchCallDetails);
  const searchQuery = useAppStore(s => s.searchQuery);
  const selectedIds = useAppStore(s => s.selectedIds);
  const selectPatient = useAppStore(s => s.selectPatient);
  const selectAll = useAppStore(s => s.selectAll);
  const clearSelected = useAppStore(s => s.clearSelected);

  // Fetch patients + call details when queue mounts (lazy — skip if already loaded)
  useEffect(() => { if (!patients.length && !patientsLoading) fetchPatients(); fetchCallDetails(); }, [patients.length, patientsLoading, fetchPatients, fetchCallDetails]);
  const activeFilters = useAppStore(s => s.activeFilters);
  const currentPage = useAppStore(s => s.currentPage);
  const perPage = useAppStore(s => s.perPage);

  // Filter to only agent-assigned patients, then apply search + filters
  const filteredQueue = useMemo(() => {
    let result = patients.filter(p => p.agentAssigned)
      .sort((a, b) => (a.priority || 99) - (b.priority || 99)); // sort by priority

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.memberId?.toLowerCase().includes(q) ||
        p.initials?.toLowerCase().includes(q)
      );
    }

    for (const [key, value] of Object.entries(activeFilters)) {
      if (value) {
        result = result.filter(p => String(p[key]) === String(value));
      }
    }

    return result;
  }, [patients, searchQuery, activeFilters]);

  if (patientsLoading) return <TableSkeleton rows={6} />;

  if (!filteredQueue.length) {
    // Check if there are any invoked patients at all (before filters)
    const anyInvoked = patients.some(p => p.agentAssigned);
    if (!anyInvoked) return <QueueEmptyState />;
    // There are invoked patients but filters hide them
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', paddingBottom: 64 }}>
          <Icon name="custom:filter" size={40} color="var(--neutral-200)" />
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--neutral-400)' }}>No matching agents</div>
          <div style={{ fontSize: 13, color: 'var(--neutral-300)', lineHeight: 1.5 }}>
            Active filters hide all queued patients. Try adjusting your filters.
          </div>
        </div>
      </div>
    );
  }

  const startIdx = (currentPage - 1) * perPage;
  const paginatedQueue = filteredQueue.slice(startIdx, startIdx + perPage);

  const handleSelectAll = (checked) => {
    if (checked) selectAll([...new Set([...selectedIds, ...paginatedQueue.map(p => p.id)])]);
    else selectAll(selectedIds.filter(id => !paginatedQueue.find(p => p.id === id)));
  };

  return (
    // The TOC chrome (TabBar with the Worklist / Agent Queue toggle, filter
    // bar, summary bar, pagination) is rendered by AppLayout — pass an empty
    // header so the shell contributes only the table conventions.
    <WorklistShell
      header={<></>}
      columns={QUEUE_COLUMNS}
      rows={paginatedQueue}
      renderRow={(p) => (
        <QueueRow
          key={p.id}
          patient={p}
          isSelected={selectedIds.includes(p.id)}
          onSelect={selectPatient}
        />
      )}
      selectedIds={selectedIds}
      onSelectAll={handleSelectAll}
      onClearSelection={clearSelected}
      minTableWidth={2300}
    />
  );
}
