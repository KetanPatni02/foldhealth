import { useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { CardSkeleton } from '../../components/CardSkeleton/CardSkeleton';
import { hccOutreachGroups, outreachForMember } from './data/hccOutreachRows';
import { OutreachTab as PatientOutreachTab } from '../patient/left-panel/tabs/outreach/OutreachTab/OutreachTab';

// Log Outreach With: the member's PCP (or the PCP's office) or the member.
const HCC_CALL_TYPES = ['PCP / PCP Office', 'Member'];

// HCC Outreach (Astrana): the shared outreach widget with the HCC workflow,
// logged at member level (no gap or DOS picker), and every outreach logged
// for the member, Member and PCP, by month. Used by the chart's Outreach tab
// and by Log Outreach on a worklist row (`defaultFormOpen`, in a drawer).
// `callPrefill` ({ callType, via, to }) and `liveCallEnd` come from the
// worklist's call widget: the form opens on that call and takes its length.
export function HccOutreachTab({ member, defaultFormOpen = false, callPrefill = null, liveCallEnd = null }) {
  const logs = useAppStore(s => s.hccOutreachLogs);
  const loading = useAppStore(s => s.hccOutreachLoading);
  const didFetch = useAppStore(s => s.hccOutreachDidFetch);
  const hccUserRole = useAppStore(s => s.hccUserRole);
  const addHccOutreachLogs = useAppStore(s => s.addHccOutreachLogs);
  const updateHccOutreachLog = useAppStore(s => s.updateHccOutreachLog);
  const deleteHccOutreachLog = useAppStore(s => s.deleteHccOutreachLog);
  // The chart fetches these too; from a worklist row this is the first read.
  const fetchHccOutreachLogs = useAppStore(s => s.fetchHccOutreachLogs);
  useEffect(() => { fetchHccOutreachLogs(); }, [fetchHccOutreachLogs]);
  // More > Log Outreach in the toolbar: open with the form showing.
  const logRequested = useAppStore(s => s.hccOutreachLogRequested);
  const logNonce = useAppStore(s => s.hccOutreachLogNonce);
  const clearLogRequest = useAppStore(s => s.clearHccOutreachLogRequest);
  const ready = didFetch && !loading;
  useEffect(() => { if (logRequested && ready) clearLogRequest(); }, [logRequested, ready, clearLogRequest]);

  const memberLogs = useMemo(() => outreachForMember(logs, member), [logs, member]);
  // Read once when the tab mounts: the widget keeps its own feed after that,
  // and every save also lands in the store.
  const initialGroups = useMemo(() => hccOutreachGroups(memberLogs), [memberLogs]);

  // A Member call is provider → member; a Provider call is provider → provider.
  // Call Via is always a provider contact; Called To follows the Call Type.
  const pcp = member?.pcp;
  const renderingProvider = member?.rp;
  const name = member?.name;
  const providerContacts = useMemo(() => [...new Set([
    pcp ? `${pcp} (PCP)` : null,
    renderingProvider ? `${renderingProvider} (Rendering Provider)` : null,
    'Practice Line (800 000-0000)',
  ].filter(Boolean))], [pcp, renderingProvider]);
  const calledToByCallType = useMemo(() => ({
    // The member's PCP or the PCP's office, as in Patient Outreach.
    'PCP / PCP Office': [pcp ? `${pcp} (PCP)` : null, 'PCP Office'].filter(Boolean),
    Provider: providerContacts,
    Member: name ? [`${name} (Member)`] : [],
  }), [pcp, providerContacts, name]);

  if (!ready) return <CardSkeleton />;

  const toLog = (entry) => ({
    id: String(entry.id),
    memberId: member?.id ?? null,
    memberName: member?.name,
    logDate: entry.logDate,
    logTime: entry.time,
    type: entry.type,
    title: entry.title,
    author: entry.author,
    hccs: entry.programs || [],
    outcome: entry.outcome,
    outcomes: entry.outcomes,
    outcomeColor: entry.outcomeColor,
    note: entry.note,
    callDetails: entry.callDetails,
    snoozeUntil: entry.snoozeUntil,
  });

  return (
    <PatientOutreachTab
      key={`${member?.id || member?.name}-${logNonce}`}
      defaultFormOpen={defaultFormOpen || logRequested}
      initialCallType={callPrefill?.callType}
      defaultCallVia={callPrefill?.via}
      defaultCalledTo={callPrefill?.to}
      hideCallBanner={!!callPrefill}
      liveCallEnd={liveCallEnd}
      memberName={member?.name}
      callViaOptions={providerContacts}
      calledToByCallType={calledToByCallType}
      defaultLogFor="hcc-gaps"
      hideLogForRow
      hideProgramPicker
      callTypeOptions={HCC_CALL_TYPES}
      initialLogGroups={initialGroups}
      authorRole={hccUserRole || 'Coder'}
      hccWorkflow
      classicForm
      onSaved={(entries, { isEdit, editedId }) => {
        if (isEdit) updateHccOutreachLog(editedId, toLog({ ...entries[0], id: editedId }));
        else addHccOutreachLogs(entries.map(toLog));
      }}
      onDeleted={(log) => deleteHccOutreachLog(log.id)}
    />
  );
}
