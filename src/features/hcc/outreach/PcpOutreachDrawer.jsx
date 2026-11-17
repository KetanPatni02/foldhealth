import { useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Button } from '../../../components/Button/Button';
import { Banner } from '../../../components/Banner/Banner';
import { Checkbox } from '../../../components/Checkbox/Checkbox';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import { toast } from '../../../components/Toast/sonnerToast';
import { validateOutreach, parseFormDatetime, formatFormDatetime } from './outreachModel';
import { pcpOptions, patientsForPcp, PCP_CALL_OUR_LINES } from './pcpOutreach';
import { initReview, reviewProblem, addPatient, removePatient, setDraftField } from './pcpReview';
import { splitPcpOutreach } from './outreachAi';
import { PcpOutreachSetup } from './PcpOutreachSetup';
import { PcpOutreachReview } from './PcpOutreachReview';
import styles from './PcpOutreach.module.css';

const blankForm = (initial = {}) => ({
  pcp: '', selected: [], mode: 'Call', datetime: formatFormDatetime(), direction: 'outgoing', durMin: '00', durSec: '00',
  callVia: PCP_CALL_OUR_LINES[0], calledTo: '',
  // undefined until a transcript block is added to the note.
  transcript: undefined, emailTo: '', emailSubject: '', emailBody: '', notes: '', category: '', outcome: '',
  ...initial,
});

const CATEGORY_COLOR = {
  Successful: 'var(--status-success)',
  Unsuccessful: 'var(--status-error)',
  Note: 'var(--status-warning)',
};
const pad2 = (n) => String(n).padStart(2, '0');

// One patient's part of a PCP outreach as an HCC outreach log row.
function hccLogFromPcpEntry(e, member) {
  const at = new Date(e.loggedAt);
  const isCall = e.mode === 'Call';
  return {
    id: `${e.id}-hcc`,
    memberId: member?.id ?? null,
    memberName: e.patientName,
    logDate: `${at.getFullYear()}-${pad2(at.getMonth() + 1)}-${pad2(at.getDate())}`,
    logTime: `${pad2(at.getHours())}:${pad2(at.getMinutes())}`,
    type: e.mode,
    title: `${isCall ? (e.direction === 'incoming' ? 'Incoming Call' : 'Outgoing Call') : e.mode} (PCP Outreach)`,
    author: e.loggedByRole ? `${e.loggedBy} (${e.loggedByRole})` : e.loggedBy,
    hccs: [],
    outcome: e.outcome || null,
    outcomes: e.outcome ? [e.outcome] : [],
    outcomeColor: CATEGORY_COLOR[e.category] || 'var(--neutral-300)',
    note: e.notes,
    callDetails: isCall ? {
      direction: e.direction,
      via: e.callVia,
      to: e.calledTo,
      callType: 'PCP / PCP Office',
      durationMin: (e.durationSec || 0) / 60,
      transcript: [],
    } : undefined,
    snoozeUntil: null,
  };
}

const emptyReview = () => ({ drafts: [], unassigned: [], mentioned: [], unresolved: [] });

/**
 * PCP Outreach (HCC worklist): log one call, email or visit with a PCP office
 * once, then save one locked entry per patient discussed, each with only that
 * patient's part. One step: each selected patient gets a block under the
 * outreach details for their own outcome and summary; Draft with AI can fill
 * those from the transcript, email and notes.
 */
// `initialPcp`, `callPrefill` ({ via, to }) and `liveCallEnd` come from the
// worklist's call widget: the drawer opens on that PCP and call, and takes
// the call's length once it ends.
export function PcpOutreachDrawer({ onClose, initialPcp = '', callPrefill = null, liveCallEnd = null }) {
  const members = useAppStore(s => s.hccMembers);
  const outcomeList = useAppStore(s => s.outreachOutcomes);
  const role = useAppStore(s => s.hccUserRole);
  const profile = useAppStore(s => s.currentUserProfile);
  const savePcpOutreach = useAppStore(s => s.savePcpOutreach);
  const addActivityEntry = useAppStore(s => s.addActivityEntry);
  const addHccOutreachLogs = useAppStore(s => s.addHccOutreachLogs);

  const [form, setFormRaw] = useState(() => blankForm({
    pcp: initialPcp,
    ...(callPrefill ? { mode: 'Call', direction: 'outgoing', callVia: callPrefill.via, calledTo: callPrefill.to } : {}),
  }));
  // When the widget's call ends, its length fills Duration once.
  const [seenCallEnd, setSeenCallEnd] = useState(null);
  if (liveCallEnd && liveCallEnd.id !== seenCallEnd) {
    setSeenCallEnd(liveCallEnd.id);
    const secs = Math.min(99 * 60 + 59, Math.max(0, Math.round(liveCallEnd.durationSec || 0)));
    setFormRaw(f => ({ ...f, durMin: String(Math.floor(secs / 60)).padStart(2, '0'), durSec: String(secs % 60).padStart(2, '0') }));
  }
  const [review, setReviewRaw] = useState(emptyReview);
  const [aiOk, setAiOk] = useState(true);
  const [aiDrafted, setAiDrafted] = useState(false);
  // Off: every patient gets the outreach's outcome and note. On: each gets a block.
  const [perPatientPick, setPerPatient] = useState(false);
  // An unsuccessful outreach discussed no one, so there is nothing per patient.
  const perPatient = perPatientPick && form.category !== 'Unsuccessful';
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState(null);

  // The patient blocks follow the selection: a patient added above gets a
  // block (with the outreach's outcome), a removed one loses it, and a new
  // Successful / Unsuccessful / Note or outcome above applies to every block.
  const setForm = (updater) => {
    const next = typeof updater === 'function' ? updater(form) : updater;
    setFormRaw(next);
    setReviewRaw(r => {
      if (next.pcp !== form.pcp) return emptyReview();
      const defaults = { category: next.category, outcome: next.outcome || null };
      let out = r;
      const keep = new Set(next.selected);
      for (const d of r.drafts) if (!keep.has(d.patientKey)) out = removePatient(out, d.patientKey);
      const pool = patientsForPcp(members, next.pcp);
      for (const key of next.selected) {
        const p = pool.find(x => x.key === key);
        if (p) out = addPatient(out, p, defaults);
      }
      if (next.category !== form.category || next.outcome !== form.outcome) {
        for (const d of out.drafts) {
          out = setDraftField(setDraftField(out, d.patientKey, 'category', defaults.category), d.patientKey, 'outcome', defaults.outcome);
        }
      }
      return out;
    });
  };
  // Edits in the patient blocks (Remove, Add) keep the selection above in step.
  const setReview = (updater) => {
    const next = typeof updater === 'function' ? updater(review) : updater;
    setReviewRaw(next);
    setFormRaw(f => ({ ...f, selected: next.drafts.map(d => d.patientKey) }));
  };

  const pcps = useMemo(() => pcpOptions(members), [members]);
  const patients = useMemo(() => patientsForPcp(members, form.pcp), [members, form.pcp]);
  const selectedPatients = patients.filter(p => form.selected.includes(p.key));

  const setupProblem = () => {
    if (!form.pcp) return 'Select a PCP.';
    if (!patients.length) return 'No patients with open DOSs for this PCP.';
    if (!selectedPatients.length) return 'Select at least one patient.';
    return validateOutreach({ ...form, receivedBy: form.pcp });
  };

  // Draft with AI: split the conversation into each selected patient's block.
  const draftWithAi = async () => {
    const problem = setupProblem();
    if (problem) { setError(problem); return; }
    setError(null);
    setDrafting(true);
    const text = {
      transcript: form.mode === 'Call' ? form.transcript || undefined : undefined,
      email: form.mode === 'Email' ? `${form.emailSubject}\n${form.emailBody}` : undefined,
      notes: form.notes || undefined,
    };
    const split = await splitPcpOutreach({ pcpName: form.pcp, text, patients: selectedPatients });
    setDrafting(false);
    setAiOk(split.ok);
    if (!split.ok) return;
    setAiDrafted(true);
    setReview(initReview({
      split,
      patients: selectedPatients,
      category: form.category,
      outcome: form.outcome || null,
    }));
  };

  const save = () => {
    const problem = setupProblem() || (perPatient ? reviewProblem(review) : null);
    if (problem) { setError(problem); return; }
    const now = Date.now();
    const loggedAt = parseFormDatetime(form.datetime).toISOString();
    const loggedBy = profile?.name || 'You';
    const parent = {
      id: `pcp-${now}`,
      pcpName: form.pcp,
      mode: form.mode,
      direction: form.mode === 'Call' ? form.direction : null,
      callVia: form.mode === 'Call' ? form.callVia || null : null,
      calledTo: form.mode === 'Call' ? form.calledTo || null : null,
      durationSec: form.mode === 'Call' ? (Number(form.durMin) || 0) * 60 + (Number(form.durSec) || 0) : null,
      transcript: form.mode === 'Call' ? form.transcript || '' : '',
      emailTo: form.mode === 'Email' ? form.emailTo : '',
      emailSubject: form.mode === 'Email' ? form.emailSubject : '',
      emailBody: form.mode === 'Email' ? form.emailBody : '',
      notes: form.notes,
      category: form.category,
      outcome: form.outcome || null,
      unresolved: review.unresolved,
      loggedBy,
      loggedByRole: role || null,
      loggedAt,
    };
    const byKey = new Map(patients.map(p => [p.key, p]));
    const entries = review.drafts.map((d, i) => ({
      id: `po-${now}-${i}`,
      patientKey: d.patientKey,
      patientName: d.name,
      program: 'RA',
      recipientType: 'pcp',
      receivedBy: form.pcp,
      mode: form.mode,
      direction: parent.direction,
      callVia: parent.callVia,
      calledTo: parent.calledTo,
      durationSec: parent.durationSec,
      // Only this patient's part: never the shared transcript or email body.
      emailTo: parent.emailTo,
      emailSubject: parent.emailSubject,
      notes: perPatient ? d.summary.trim() : (form.notes.trim() || `Discussed in a PCP outreach with ${form.pcp}.`),
      category: perPatient ? d.category : form.category,
      outcome: (perPatient ? d.outcome : form.outcome) || null,
      loggedBy,
      loggedByRole: role || null,
      loggedAt,
      pcpOutreachId: parent.id,
      aiStatus: perPatient && aiDrafted ? 'ready' : 'none',
      aiCallSummary: perPatient && aiDrafted ? d.summary.trim() : null,
      aiPatientActions: perPatient && aiDrafted ? d.actions : null,
    }));
    savePcpOutreach(parent, entries);
    // Each patient's entry also goes to the HCC outreach log, which the
    // patient's Outreach tab (chart and worklist) and History > Outreach read.
    addHccOutreachLogs(entries.map(e => hccLogFromPcpEntry(e, byKey.get(e.patientKey)?.member)));
    for (const e of entries) {
      addActivityEntry({
        _memberId: byKey.get(e.patientKey)?.member?.id,
        t: 'outreach',
        by: loggedBy,
        role: role || undefined,
        headline: `Logged PCP Outreach: ${e.mode}, ${e.category}${e.outcome ? ` (${e.outcome})` : ''}`,
        dos: null,
        patient: 'Patient level',
      });
    }
    toast.success(`PCP outreach saved for ${entries.length} patient${entries.length > 1 ? 's' : ''}`);
    onClose();
  };

  // Log Outreach stays off until every required field is filled; hovering it
  // says what's missing.
  const blocker = setupProblem() || (perPatient ? reviewProblem(review) : null);

  const clearAll = (
    <Button variant="ghost" tone="danger" size="sm" leadingIcon="solar:close-linear" onClick={() => setForm(f => ({ ...f, selected: [] }))}>
      Clear All Selection
    </Button>
  );

  return (
    <Drawer
      title="PCP Outreach"
      onClose={onClose}
      noCloseDivider
      banner={(
        <Banner tone="info">
          This outreach is logged to each selected patient separately, not as one combined entry. To make changes later, open that patient's outreach.
        </Banner>
      )}
      headerRight={(
        <div className={styles.headerActions}>
          <Tooltip label={blocker} placement="bottom">
            <Button onClick={save} disabled={drafting || !!blocker}>Log Outreach</Button>
          </Tooltip>
          <span className={styles.headerDivider} />
        </div>
      )}
    >
      <div className={styles.body}>
        <PcpOutreachSetup
          form={form} setForm={setForm} pcps={pcps} patients={patients} outcomeList={outcomeList} error={error}
          titleExtra={form.category !== 'Unsuccessful' && (
            <label className={styles.check}>
              <Checkbox checked={perPatient} onCheckedChange={(on) => setPerPatient(!!on)} />
              Log details per patient
            </label>
          )}
          // Under the search: the Selected Patients box (Figma 40:136697's
          // list, patient context), unless details are logged per patient.
          selectedSlot={!perPatient && review.drafts.length > 0 && (
            <div className={styles.selectedBox}>
              <div className={styles.selectedHead}>
                <span className={styles.selectedTitle}>Selected Patients ({review.drafts.length})</span>
                {clearAll}
              </div>
              <span className={styles.selectedRule} />
              <PcpOutreachReview inline detailed={false} review={review} setReview={setReview} pcpPatients={patients} outcomeList={outcomeList} aiOk={aiOk} />
            </div>
          )}
        />
        {perPatient && review.drafts.length > 0 && (
          // Log details per patient: one collapsible block per patient.
          <div className={styles.section}>
            <div className={styles.selectedHead}>
              <span className={styles.selectedTitle}>Per-Patient Details ({review.drafts.length})</span>
              <div className={styles.selectedActions}>
                <Button variant="ghost" size="sm" leadingIcon="solar:magic-stick-3-linear" onClick={draftWithAi} loading={drafting} disabled={drafting}>
                  Draft with AI
                </Button>
                <span className={styles.headerDivider} />
                {clearAll}
              </div>
            </div>
            <PcpOutreachReview inline review={review} setReview={setReview} pcpPatients={patients} outcomeList={outcomeList} aiOk={aiOk} />
          </div>
        )}
        {error && <div className={styles.errorBar} role="alert">{error}</div>}
      </div>
    </Drawer>
  );
}
