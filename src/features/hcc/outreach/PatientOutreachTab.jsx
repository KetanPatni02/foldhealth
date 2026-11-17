import { useEffect, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../../components/Button/Button';
import { CardSkeleton } from '../../../components/CardSkeleton/CardSkeleton';
import { OutreachIcon } from '../../../components/Icon/OutreachIcon';
import { ScheduleDrawer } from '../../../components/ScheduleDrawer/ScheduleDrawer';
import { toast } from '../../../components/Toast/sonnerToast';
import { PatientOutreachForm } from './PatientOutreachForm';
import { PatientOutreachHistory } from './PatientOutreachHistory';
import { canLogOutreach, outcomesForProgram } from './outreachModel';
import { hasSummaryText, summarizeOutreach } from './outreachAi';
import { getOpenIcdsForMember } from '../data/icds';
import styles from './PatientOutreach.module.css';

const PRACTICE_LINE = 'Practice Line (800 000-0000)';
const EMPTY = [];

/**
 * HCC Patient Outreach: outreach logged once on the patient (Member ID) and
 * shown on every DOS, HCC, ICD and document for them. Log Outreach opens a
 * new, blank form; Physicians see the history only.
 *
 * @param {object} props.member – the patient row (memberId, name; HCC rows also id, pcp, rp, dos_list)
 * @param {string} [props.program='RA'] – care program the entries are tagged with (RA = HCC)
 * @param {boolean} [props.dosContext=true] – false outside HCC: the AI summary links HCCs and ICDs only
 */
export function PatientOutreachTab({ member, program = 'RA', dosContext = true }) {
  const isHcc = program === 'RA';
  // Member ID is the patient across the patient's HCC records.
  const patientKey = member?.memberId || member?.id;
  const fetchPatientOutreach = useAppStore(s => s.fetchPatientOutreach);
  const addPatientOutreach = useAppStore(s => s.addPatientOutreach);
  const addActivityEntry = useAppStore(s => s.addActivityEntry);
  const setPatientOutreachAi = useAppStore(s => s.setPatientOutreachAi);
  const openIcdPanel = useAppStore(s => s.openIcdPanel);
  const setDiagDosFilter = useAppStore(s => s.setDiagDosFilter);

  // A matched record in an AI summary opens it: the ICD (an HCC opens its
  // first open ICD) or the DOS.
  const openRecord = (ref) => {
    if (ref.type === 'DOS') { setDiagDosFilter(ref.id); return; }
    const icds = member?.name ? getOpenIcdsForMember(member.name).all : [];
    const code = ref.type === 'ICD'
      ? ref.id
      : icds.find(i => /^HCC\s*\d+/i.exec(i.hcc || '')?.[0].replace(/\s+/g, ' ').toUpperCase() === ref.id)?.code;
    if (code) openIcdPanel('history', code);
  };
  const entries = useAppStore(s => s.patientOutreachByKey[patientKey]) || EMPTY;
  const status = useAppStore(s => s.patientOutreachStatus[patientKey]);
  const role = useAppStore(s => s.hccUserRole);
  const profile = useAppStore(s => s.currentUserProfile);
  const logRequested = useAppStore(s => s.patientOutreachLogRequested);
  const clearLogRequest = useAppStore(s => s.clearPatientOutreachLogRequest);
  const allOutcomes = useAppStore(s => s.outreachOutcomes);
  const outcomeList = outcomesForProgram(allOutcomes, program);
  const defaultRecipient = useAppStore(s => s.outreachDefaultRecipient);
  const fetchOutreachOutcomes = useAppStore(s => s.fetchOutreachOutcomes);
  const canLog = canLogOutreach(role);

  // null = closed; {} = new entry; { correcting } = correction Note.
  const [form, setForm] = useState(logRequested && canLog ? {} : null);
  const [formKey, setFormKey] = useState(0);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  useEffect(() => { fetchPatientOutreach({ patientKey, patientName: member?.name }); }, [fetchPatientOutreach, patientKey, member?.name]);
  useEffect(() => { if (logRequested) clearLogRequest(); }, [logRequested, clearLogRequest]);
  useEffect(() => { fetchOutreachOutcomes(); }, [fetchOutreachOutcomes]);

  const pcp = member?.pcp;
  const rp = member?.rp;
  const contacts = {
    pcp: [...new Set([pcp && `${pcp} (PCP)`, rp && `${rp} (Rendering Provider)`, 'PCP Office'].filter(Boolean))],
    member: member?.name ? [`${member.name} (Member)`] : [],
  };
  const ourLines = [...new Set([PRACTICE_LINE, pcp && `${pcp} (PCP)`, rp && `${rp} (Rendering Provider)`].filter(Boolean))];

  const open = (next) => { setForm(next); setFormKey(k => k + 1); };

  const save = (draft) => {
    const entry = {
      ...draft,
      id: `po-${Date.now()}`,
      patientKey,
      patientName: member?.name,
      program,
      loggedBy: profile?.name || 'You',
      loggedByRole: role || null,
      // With a transcript, email or notes, the AI summary follows the save;
      // the entry is saved either way (no text: no summary).
      aiStatus: hasSummaryText(draft) ? 'pending' : 'none',
    };
    addPatientOutreach(entry);
    if (entry.aiStatus === 'pending') {
      summarizeOutreach(entry, member, { dosContext }).then(ai => setPatientOutreachAi(patientKey, entry.id, ai));
    }
    // HCC Timeline entry tagged "Patient level" in place of a DOS (Open Item 1).
    if (isHcc) addActivityEntry({
      _memberId: member?.id,
      t: 'outreach',
      by: profile?.name || 'You',
      role: role || undefined,
      headline: draft.correctsId
        ? 'Added a Correction Note to an outreach'
        : draft.category === 'Note'
          ? 'Added an outreach Note'
          : `Logged Outreach: ${draft.mode}, ${draft.category} (${draft.outcome})`,
      dos: null,
      patient: 'Patient level',
    });
    setForm(null);
    toast.success(draft.correctsId ? 'Correction Note saved' : 'Outreach logged');
  };

  if (status !== 'ready') return <CardSkeleton />;

  return (
    <div className={styles.tab}>
      {canLog && (form ? (
        <PatientOutreachForm
          key={formKey}
          contacts={contacts}
          ourLines={ourLines}
          outcomeList={outcomeList}
          defaultRecipient={defaultRecipient}
          correcting={form.correcting || null}
          onSave={save}
          onCancel={() => setForm(null)}
          onSchedule={() => setScheduleOpen(true)}
        />
      ) : (
        <div className={styles.emptyCard}>
          <Button
            variant="outline"
            tone="primary"
            leadingIconElement={<OutreachIcon size={16} color="var(--primary-300)" />}
            onClick={() => open({})}
          >
            Log Outreach
          </Button>
        </div>
      ))}

      <PatientOutreachHistory
        entries={entries}
        onCorrect={canLog ? (entry) => open({ correcting: entry }) : undefined}
        onOpenRecord={isHcc ? openRecord : undefined}
      />

      {scheduleOpen && (
        <ScheduleDrawer source="outreach" onClose={() => setScheduleOpen(false)} onSave={() => setScheduleOpen(false)} />
      )}
    </div>
  );
}
