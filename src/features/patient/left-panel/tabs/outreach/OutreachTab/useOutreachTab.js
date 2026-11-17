import { useRef, useState, useMemo } from 'react';
import { useAppStore } from '../../../../../../store/useAppStore';
import { toast } from '../../../../../../components/Toast/sonnerToast';
import { getOpenIcdsForMember } from '../../../../../hcc/data/icds';
import { INITIAL_LOG_GROUPS } from '../../../../data/outreachLogMock';
import { canContact } from '../../../../data/consentRules';
import { OUTREACH_CHANNEL, numberFromRecipient } from '../../../../data/patientPreferences';
import { usePatientConsent } from '../../../../hooks/usePatientConsent';
import { parseTranscript } from '../../../../../../components/CallTranscript/transcript';

import {
  PROGRAMS,
  TYPE_LOG_LABEL,
  OUTCOME_COLOR,
  formatNow,
  parseDatetime,
  logActivityCategory,
  matchesOutreachScope,
} from './OutreachTab.utils';

const MEMBER_OUTREACH = 'Member Outreach';

// Outreach type → Program Activity Log kind (icon) and outcome → status tone.
const OUTREACH_ACTIVITY_KIND = {
  Call: 'call', SMS: 'sms', Email: 'email', Letter: 'letter',
  Chat: 'chat', Virtual: 'virtual', 'In Person': 'inperson', General: 'outreach',
};
const OUTREACH_STATUS_TYPE = { Successful: 'success', Unsuccessful: 'error', Note: 'warning' };

export function useOutreachTab({
  programs,
  recipientOptions,
  defaultCalledTo,
  // A call placed from the HCC call widget: the form opens on it (Call With,
  // our line, no Last Call banner) and takes its duration once it ends.
  initialCallType,
  defaultCallVia,
  hideCallBanner = false,
  liveCallEnd = null,
  defaultLogFor = 'hcc-gaps',
  defaultPrograms = [],
  defaultFormOpen = false,
  scopedProgram = null,
  initialLogGroups = INITIAL_LOG_GROUPS,
  // Optional override: TOC / HEDIS drawers pass the row's patient so
  // ScheduleDrawer doesn't depend on the profile-tab selectedPatientId.
  patientId: patientIdProp,
  // Patient name: used to source this patient's open HCC gaps for the
  // "HCC Gaps" mode (same data the Diagnosis Gaps panel shows).
  memberName,
  // Called after a save with the new log entries, so a host can mirror them
  // into its own persisted activity feed (the Care Gap drawer does). On an
  // edit, `editedId` is the id of the log that changed.
  onSaved,
  // Called after a log is deleted from the feed, so a host can delete it
  // from its own record too.
  onDeleted,
  // Program Activity Log code for saved entries when the pills are not
  // themselves programs (e.g. MAD / MAH / MAC pills inside the PHARM program).
  activityProgramCode = null,
  // Optional host-supplied "Select Outcome" menu: (status, progs) →
  // MenuPopover items, or null to keep the default list for those pills.
  outcomeItems = null,
  callTypeOptions,
  // Logger's role for the feed's "Name (Role)" line, e.g. the HCC user role.
  authorRole = null,
  // The HCC Outreach workflow (Astrana): call transcript, Add Contact,
  // Snooze, and the full entry (call details, contact, snooze) on each log.
  hccWorkflow = false,
  // Optional: the Call Via list, and Called To lists per Call Type
  // ({ Provider: [...], Member: [...] }). Changing Call Type then switches
  // the Called To list and picks its first contact.
  callViaOptions,
  calledToByCallType,
} = {}) {
  // The program or gaps the outreach is logged from lead the pills.
  const PROGRAM_OPTIONS = [...new Set([...defaultPrograms, ...(programs && programs.length ? programs : PROGRAMS)])];
  // This patient's distinct open HCC gap codes (e.g. "HCC 37").
  const HCC_GAP_OPTIONS = useMemo(
    () => (memberName
      ? [...new Set(getOpenIcdsForMember(memberName).all.map(i => i.hcc)
        .filter(h => h && !/not\s*linked/i.test(h)))]
      : []),
    [memberName],
  );
  // The first option leads (HCC: PCP / PCP Office).
  const INITIAL_CALL_TYPE = initialCallType || callTypeOptions?.[0] || 'Provider';
  const [callType, setCallType] = useState(INITIAL_CALL_TYPE);
  // Contacts added from the form's Add Contact action join the Called To list
  // (of the Call Type they were added under).
  const [addedContacts, setAddedContacts] = useState([]);
  const calledToFor = (ct) => [
    ...(calledToByCallType
      ? calledToByCallType[ct] || []
      : recipientOptions && recipientOptions.length
        ? recipientOptions
        : ['Dr. Katherine Moss (581 824-1591)', 'Carlos Hernandez (555 000-0000)']),
    ...addedContacts.filter(c => !calledToByCallType || c.callType === ct).map(c => c.label),
  ];
  const CALLED_TO_OPTIONS = calledToFor(callType);
  const CALL_VIA_OPTIONS = callViaOptions?.length
    ? callViaOptions
    : ['Delores Conn (581 824-1591)', 'Practice Line (800 000-0000)'];
  const INITIAL_CALL_VIA = defaultCallVia || CALL_VIA_OPTIONS[0];
  // The other party: the first contact for the Call Type that isn't our own
  // number (a Provider call lists providers on both sides).
  const otherPartyFor = (ct, ours) => calledToFor(ct).find(c => c !== ours) || calledToFor(ct)[0] || '';
  const INITIAL_CALLED_TO = defaultCalledTo || otherPartyFor(INITIAL_CALL_TYPE, INITIAL_CALL_VIA);

  const currentUserProfile = useAppStore(s => s.currentUserProfile);
  const selectedPatientId = useAppStore(s => s.selectedPatientId);
  const patientId = patientIdProp || selectedPatientId;
  const addProgramTask = useAppStore(s => s.addProgramTask);
  const addProgramAppointment = useAppStore(s => s.addProgramAppointment);
  const logProgramActivity = useAppStore(s => s.logProgramActivity);

  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(defaultFormOpen);
  const editingIdRef = useRef(null);
  const [logFor, setLogFor] = useState(defaultLogFor);
  const isHccGaps = logFor === 'hcc-gaps';
  const [activityFilter, setActivityFilter] = useState('All');
  const [activitySearchOpen, setActivitySearchOpen] = useState(false);
  const [activitySearchText, setActivitySearchText] = useState('');
  const [outreachScope, setOutreachScope] = useState('All');
  const [filterMenu, setFilterMenu] = useState(null);
  const [logGroups, setLogGroups] = useState(initialLogGroups);
  const [type, setType] = useState(defaultLogFor === 'hcc-gaps' ? 'Call' : 'General');
  const [datetime, setDatetime] = useState(defaultFormOpen ? formatNow() : '');
  const [selectedProgs, setSelectedProgs] = useState(defaultPrograms);
  const [outcome, setOutcome] = useState(null);
  const [separateNotes, setSeparateNotes] = useState(false);
  const [panels, setPanels] = useState({});
  const [sharedPanel, setSharedPanel] = useState({ expanded: true, outcomes: [], note: '', outcomeOpen: false });
  const [callBannerVisible, setCallBannerVisible] = useState(!hideCallBanner);
  const [callDirection, setCallDirection] = useState('outgoing');
  const [callViaNumber, setCallViaNumber] = useState(INITIAL_CALL_VIA);
  const [calledToNumber, setCalledToNumber] = useState(INITIAL_CALLED_TO);

  // Consent and contact checks for the logged channel (Phase 2A.4). Outreach
  // documents contact that already happened, so this warns, it doesn't block.
  const { consents, preferences } = usePatientConsent(patientId);
  const consentTableMissing = useAppStore(s => s.patientConsentTableMissing);
  const outreachChannel = OUTREACH_CHANNEL[type];
  const contactWarning = outreachChannel && !consentTableMissing
    ? canContact(consents, preferences, outreachChannel, { value: outreachChannel === 'call' ? numberFromRecipient(calledToNumber) : undefined }).reason
    : null;
  const [callDurationMin, setCallDurationMin] = useState('00');
  const [callDurationSec, setCallDurationSec] = useState('00');
  // When the widget's call ends, its length fills Duration once (adjusted
  // during render, as React recommends for state that follows a prop).
  const [seenCallEnd, setSeenCallEnd] = useState(null);
  if (liveCallEnd && liveCallEnd.id !== seenCallEnd) {
    setSeenCallEnd(liveCallEnd.id);
    const secs = Math.min(99 * 60 + 59, Math.max(0, Math.round(liveCallEnd.durationSec || 0)));
    setCallDurationMin(String(Math.floor(secs / 60)).padStart(2, '0'));
    setCallDurationSec(String(secs % 60).padStart(2, '0'));
  }
  const [transcript, setTranscript] = useState('');
  const [snoozeUntil, setSnoozeUntil] = useState(null);

  // With per-Call-Type lists, an incoming call swaps the sides: the member or
  // provider who called is the Call Via number, our provider line the Called To.
  const incomingSwap = !!calledToByCallType && callDirection === 'incoming';
  const setOtherParty = incomingSwap ? setCallViaNumber : setCalledToNumber;

  const addContact = (name, phone) => {
    const label = phone ? `${name} (${phone})` : name;
    setAddedContacts(list => (list.some(c => c.label === label && c.callType === callType) ? list : [...list, { callType, label }]));
    setOtherParty(label);
  };

  const changeCallType = (ct) => {
    setCallType(ct);
    if (calledToByCallType) setOtherParty(otherPartyFor(ct, incomingSwap ? calledToNumber : callViaNumber));
  };

  // Place each picked number by role, not by field: our provider line goes to
  // Call Via on an outgoing call and to Called To on an incoming one.
  const changeCallDirection = (dir) => {
    if (calledToByCallType) {
      const picked = [callViaNumber, calledToNumber];
      const ours = picked.find(v => CALL_VIA_OPTIONS.includes(v)) || CALL_VIA_OPTIONS[0];
      const theirList = calledToFor(callType);
      const theirs = picked.find(v => v !== ours && theirList.includes(v)) || otherPartyFor(callType, ours);
      setCallViaNumber(dir === 'incoming' ? theirs : ours);
      setCalledToNumber(dir === 'incoming' ? ours : theirs);
    }
    setCallDirection(dir);
  };

  const showCallDetails = type === 'Call';
  const getPanel = (prog) => panels[prog] || { expanded: true, outcomes: [], note: '', syncText: false, outcomeOpen: false };
  // Merge onto the latest state, not the render-time `panels`: selecting an
  // outcome issues two patches in one click (add + close menu), and merging
  // the second onto a stale copy wiped the outcome the first had just added.
  const patchPanel = (prog, patch) => setPanels(p => ({
    ...p,
    [prog]: { ...(p[prog] || { expanded: true, outcomes: [], note: '', syncText: false, outcomeOpen: false }), ...patch },
  }));
  const patchShared = (patch) => setSharedPanel(p => ({ ...p, ...patch }));

  // Sync Text is one setting across all selected note panels: flipping it
  // in any panel flips it in every panel, and turning it on copies the
  // toggled panel's note into the others. Done in a single functional
  // update so the per-panel writes can't clobber each other.
  const toggleSyncText = (prog) => setPanels(prev => {
    const get = (k) => prev[k] || { expanded: true, outcomes: [], note: '', syncText: false, outcomeOpen: false };
    const source = get(prog);
    const on = !source.syncText;
    const next = { ...prev };
    selectedProgs.forEach(k => {
      next[k] = on && k !== prog
        ? { ...get(k), syncText: true, note: source.note }
        : { ...get(k), syncText: on };
    });
    return next;
  });

  // Detailed outcomes come from a list keyed by this status, so switching
  // Successful / Unsuccessful / Note drops picks made from the old list.
  const changeOutcome = (next) => {
    if (next === outcome) return;
    setOutcome(next);
    setPanels(p => Object.fromEntries(
      Object.entries(p).map(([k, v]) => [k, { ...v, outcomes: [], outcomeOpen: false }]),
    ));
    setSharedPanel(p => ({ ...p, outcomes: [], outcomeOpen: false }));
  };

  const toggleProgram = (prog) => {
    const alreadySelected = selectedProgs.includes(prog);
    const next = alreadySelected ? selectedProgs.filter(p => p !== prog) : [...selectedProgs, prog];
    if (next.length < 2) setSeparateNotes(false);
    if (!alreadySelected) {
      setPanels(p => ({
        ...p,
        [prog]: p[prog] || { expanded: true, outcomes: [], note: '', syncText: false, outcomeOpen: false },
      }));
    }
    setSelectedProgs(next);
  };

  const useSeparate = separateNotes && selectedProgs.length >= 2;
  // With nothing picked the note is a Member Outreach: logged on the member,
  // not on any program or gap.
  const sharedPanelTitle = !useSeparate && selectedProgs.length >= 2
    ? `Common Note (${selectedProgs.join(', ')})`
    : selectedProgs.length === 1 ? selectedProgs[0] : MEMBER_OUTREACH;

  const addOutcome = (prog, val) => {
    if (useSeparate && prog) {
      const cur = getPanel(prog);
      if (!cur.outcomes.includes(val)) {
        const next = [...cur.outcomes, val];
        patchPanel(prog, { outcomes: next, outcomeOpen: false });
        if (cur.syncText) {
          selectedProgs.forEach(p => { if (p !== prog) patchPanel(p, { outcomes: next }); });
        }
      }
    } else if (!sharedPanel.outcomes.includes(val)) {
      patchShared({ outcomes: [...sharedPanel.outcomes, val], outcomeOpen: false });
    }
  };

  // Replaces the whole list, for the multi-select outcome picker.
  const setOutcomes = (prog, next) => {
    if (useSeparate && prog) {
      patchPanel(prog, { outcomes: next });
      if (getPanel(prog).syncText) {
        selectedProgs.forEach(p => { if (p !== prog) patchPanel(p, { outcomes: next }); });
      }
    } else {
      patchShared({ outcomes: next });
    }
  };

  const removeOutcome = (prog, val) => {
    if (useSeparate && prog) {
      patchPanel(prog, { outcomes: getPanel(prog).outcomes.filter(o => o !== val) });
    } else {
      patchShared({ outcomes: sharedPanel.outcomes.filter(o => o !== val) });
    }
  };

  const handleNoteChange = (prog, text) => {
    if (useSeparate && prog) {
      const cur = getPanel(prog);
      patchPanel(prog, { note: text });
      if (cur.syncText) {
        selectedProgs.forEach(p => { if (p !== prog) patchPanel(p, { note: text }); });
      }
    } else {
      patchShared({ note: text });
    }
  };

  const hasNote = useSeparate
    ? selectedProgs.some(p => getPanel(p).note.trim().length > 0)
    : sharedPanel.note.trim().length > 0;
  const canSave = outcome !== null && hasNote;

  const handleLogForChange = (key) => {
    setLogFor(key);
    setType(key === 'hcc-gaps' ? 'Call' : 'General');
    // The pill options differ between modes (programs vs HCC gaps), so clear any
    // prior selection and its note panels when switching.
    setSelectedProgs([]);
    setSeparateNotes(false);
    setPanels({});
    setSharedPanel({ expanded: true, outcomes: [], note: '', outcomeOpen: false });
  };

  const resetForm = () => {
    setLogFor(defaultLogFor);
    setType(defaultLogFor === 'hcc-gaps' ? 'Call' : 'General');
    setDatetime(scopedProgram ? formatNow() : '');
    setSelectedProgs(scopedProgram ? defaultPrograms : []);
    setOutcome(null);
    setSeparateNotes(false);
    setPanels({});
    setSharedPanel({ expanded: true, outcomes: [], note: '', outcomeOpen: false });
    setCallBannerVisible(true);
    setCallDirection('outgoing');
    setCallViaNumber(INITIAL_CALL_VIA);
    setCalledToNumber(INITIAL_CALLED_TO);
    setCallType(INITIAL_CALL_TYPE);
    setCallDurationMin('00');
    setCallDurationSec('00');
    setTranscript('');
    setSnoozeUntil(null);
  };

  const handleSave = () => {
    if (!canSave) return;
    const { date, time, monthLabel, monthKey } = parseDatetime(datetime);
    const name = currentUserProfile?.name || 'You';
    const author = authorRole ? `${name} (${authorRole})` : name;
    const label = hccWorkflow && type === 'Call' && callDirection === 'incoming'
      ? 'Incoming Call'
      : TYPE_LOG_LABEL[type] || type;
    const now = Date.now();

    // No program or gap picked: one Member Outreach entry with no programs.
    const newEntries = (selectedProgs.length ? selectedProgs : [null]).map((prog, i) => {
      const panelData = useSeparate ? getPanel(prog) : sharedPanel;
      const outcomeText = panelData.outcomes.length > 0 ? panelData.outcomes[0] : outcome;
      return {
        id: now + i,
        type,
        date,
        time,
        author,
        title: label,
        programs: prog ? [prog] : [],
        outcome: outcomeText,
        // Every outcome picked on the panel (the log line shows the first).
        outcomes: panelData.outcomes,
        outcomeColor: OUTCOME_COLOR[outcome] || 'var(--neutral-300)',
        note: panelData.note,
        ...(hccWorkflow ? {
          logDate: `${monthKey.split('-')[1]}-${date.replace('/', '-')}`,
          callDetails: showCallDetails ? {
            direction: callDirection,
            via: callViaNumber,
            to: calledToNumber,
            callType,
            durationMin: Number(callDurationMin) + Number(callDurationSec) / 60,
            transcript: parseTranscript(transcript.trim() ? transcript : panelData.transcript),
          } : undefined,
          snoozeUntil,
        } : {}),
      };
    });

    setLogGroups(prev => {
      const editingId = editingIdRef.current;
      if (editingId != null) {
        return prev.map(g => ({
          ...g,
          logs: g.logs.map(l => l.id === editingId
            ? { ...l, ...newEntries[0], id: editingId }
            : l),
        }));
      }
      const idx = prev.findIndex(g => g.id === monthKey);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], logs: [...newEntries, ...updated[idx].logs] };
        return updated;
      }
      return [{ id: monthKey, label: monthLabel, logs: newEntries }, ...prev];
    });

    // A new outreach attempt against a care program is program activity: it
    // goes in that program's Program Activity Log.
    if (logFor === 'care-program' && editingIdRef.current == null) {
      for (const entry of newEntries.filter(e => e.programs.length)) {
        // Pills that are not programs themselves (e.g. MAD / MAH / MAC) log
        // into the host program; real program pills keep their own log.
        const asHost = activityProgramCode && !PROGRAMS.includes(entry.programs[0]);
        logProgramActivity({
          patientId,
          programCode: asHost ? activityProgramCode : entry.programs[0],
          title: asHost ? `Outreach - ${entry.title} (${entry.programs[0]})` : `Outreach - ${entry.title}`,
          activityKind: OUTREACH_ACTIVITY_KIND[entry.type] || 'outreach',
          statusLabel: entry.outcome || '',
          statusType: OUTREACH_STATUS_TYPE[outcome] || 'neutral',
        });
      }
    }

    onSaved?.(newEntries, {
      isEdit: editingIdRef.current != null,
      editedId: editingIdRef.current,
      callDetails: showCallDetails ? {
        via: callViaNumber,
        to: calledToNumber,
        durationMin: Number(callDurationMin) + Number(callDurationSec) / 60,
      } : null,
    });
    editingIdRef.current = null;
    resetForm();
    if (!scopedProgram) setFormOpen(false);
    toast.success('Outreach logged successfully');
  };

  const handleDiscard = () => { resetForm(); if (!scopedProgram) setFormOpen(false); editingIdRef.current = null; };

  const handleEdit = (log) => {
    editingIdRef.current = log.id;
    setFormOpen(true);
    setType(log.type || 'General');
    setSelectedProgs(Array.isArray(log.programs) ? log.programs : []);
    setOutcome(log.outcome ? 'successful' : null);
    setDatetime(`${log.date} ${log.time}`);
    setSeparateNotes(false);
    setSharedPanel({ expanded: true, outcomes: log.outcome ? [log.outcome] : [], note: log.note || '', outcomeOpen: false });
    if (log.callDetails) {
      if (log.callDetails.callType) setCallType(log.callDetails.callType);
      if (log.callDetails.direction) setCallDirection(log.callDetails.direction);
      setCallViaNumber(log.callDetails.via || '');
      setCalledToNumber(log.callDetails.to || '');
      const totalSec = (log.callDetails.durationMin || 0) * 60;
      setCallDurationMin(String(Math.floor(totalSec / 60)).padStart(2, '0'));
      setCallDurationSec(String(totalSec % 60).padStart(2, '0'));
    }
  };

  const handleDelete = (log) => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const ok = window.confirm(`Delete this ${log.type.toLowerCase()} outreach from ${log.date}?`);
      if (!ok) return;
    }
    setLogGroups(prev => {
      const next = [];
      for (const g of prev) {
        const logs = g.logs.filter(l => l.id !== log.id);
        if (logs.length > 0) next.push({ ...g, logs });
      }
      return next;
    });
    onDeleted?.(log);
  };

  const filteredLogGroups = useMemo(() => {
    const q = activitySearchText.trim().toLowerCase();
    const keep = (l) =>
      matchesOutreachScope(l, outreachScope)
      && (activityFilter === 'All' || logActivityCategory(l) === activityFilter)
      && (!q || `${l.title || ''} ${l.author || ''} ${l.outcome || ''} ${l.note || ''}`.toLowerCase().includes(q));
    const next = [];
    for (const g of logGroups) {
      const logs = g.logs.filter(keep);
      if (logs.length > 0) next.push({ ...g, logs });
    }
    return next;
  }, [logGroups, outreachScope, activityFilter, activitySearchText]);

  return {
    PROGRAM_OPTIONS,
    HCC_GAP_OPTIONS,
    outcomeItems,
    callTypeOptions,
    CALLED_TO_OPTIONS: incomingSwap ? CALL_VIA_OPTIONS : CALLED_TO_OPTIONS,
    CALL_VIA_OPTIONS: incomingSwap ? CALLED_TO_OPTIONS : CALL_VIA_OPTIONS,
    patientId,
    scopedProgram,
    addTaskOpen, setAddTaskOpen,
    scheduleOpen, setScheduleOpen,
    formOpen, setFormOpen,
    logFor, isHccGaps,
    activityFilter, setActivityFilter,
    activitySearchOpen, setActivitySearchOpen,
    activitySearchText, setActivitySearchText,
    outreachScope, setOutreachScope,
    filterMenu, setFilterMenu,
    logGroups,
    type, setType,
    contactWarning,
    datetime, setDatetime,
    selectedProgs,
    setSelectedProgs,
    outcome, setOutcome: changeOutcome,
    separateNotes, setSeparateNotes,
    sharedPanel,
    showCallDetails,
    getPanel,
    patchPanel,
    patchShared,
    toggleSyncText,
    toggleProgram,
    useSeparate,
    sharedPanelTitle,
    addOutcome,
    removeOutcome,
    setOutcomes,
    handleNoteChange,
    canSave,
    handleLogForChange,
    handleSave,
    handleDiscard,
    handleEdit,
    handleDelete,
    filteredLogGroups,
    callBannerVisible, setCallBannerVisible,
    callDirection, setCallDirection: changeCallDirection,
    callViaNumber, setCallViaNumber,
    calledToNumber, setCalledToNumber,
    callType, setCallType: changeCallType,
    callDurationMin, setCallDurationMin,
    callDurationSec, setCallDurationSec,
    transcript, setTranscript,
    snoozeUntil, setSnoozeUntil,
    addContact,
    hccWorkflow,
    addProgramTask,
    addProgramAppointment,
    formatNow,
  };
}
