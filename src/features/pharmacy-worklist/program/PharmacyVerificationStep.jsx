import { useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Badge } from '../../../components/Badge/Badge';
import { Button } from '../../../components/Button/Button';
import { DashboardCard } from '../../../components/DashboardCard/DashboardCard';
import { Checkbox } from '../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { Icon } from '../../../components/Icon/Icon';
import { Input } from '../../../components/Input/Input';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import { Textarea } from '../../../components/Textarea/Textarea';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import {
  MEASURE_NAMES, MEASURE_ORDER, OPEN_GAPS, addDaysMdy, fillDueTone, measureStatus, medLabel, parseMdy, pdcTone, todayMdy,
} from '../pharmacyWorklist.utils';
import { Switch } from '../../../components/Switch/Switch';
import { usePharmacyProgramMember } from './usePharmacyProgramMember';
import { MeasureCode } from '../PharmacyCells';
import styles from './PharmacyVerificationStep.module.css';

// A processed claim isn't proof of pickup: the fill sits on the shelf ~10–14
// days and is reversed if nobody collects it, and plan/claims data lags.
// So the coordinator calls the pharmacy and asks, per drug: last fill date,
// refilled?, picked up?, refills remaining? The answers drive the next action.
const REVERSAL_CHECK_DAYS = 14;
const REFILL_RECHECK_DAYS = 30;

const TONE_CLASS = { error: styles.toneError };
const EMPTY_ANSWER = { lastFillConfirmed: true, actualLastFill: '', refilled: null, pickedUp: null, refillsRemaining: '', refillRequestSent: false };

function isAnswered(a) {
  if (!a.refilled || a.refillsRemaining === '') return false;
  if (a.refilled === 'Yes' && !a.pickedUp) return false;
  return true;
}

// Picked up + refills that reach Dec 31 → "good for the year".
function goodForYear(med, a) {
  if (a.pickedUp !== 'Yes') return false;
  const covered = parseMdy(addDaysMdy(todayMdy(), med.daysSupply * (1 + Number(a.refillsRemaining || 0))));
  const yearEnd = Date.UTC(new Date().getFullYear(), 11, 31);
  return covered >= yearEnd;
}

function nextAction(med, a) {
  if (!isAnswered(a)) return null;
  const zeroRefills = Number(a.refillsRemaining) === 0;
  if (a.refilled === 'Yes' && a.pickedUp === 'Yes') {
    return {
      tone: 'success',
      label: goodForYear(med, a) ? 'Gap closed · good for the year' : 'Gap closed',
      detail: zeroRefills ? 'No refills left — request a new Rx before the next due date.' : null,
    };
  }
  if (a.refilled === 'Yes') {
    return { tone: 'warning', label: 'On the shelf — call the member', detail: 'Offer help picking it up or delivery, and ask what the barrier is.' };
  }
  if (zeroRefills) {
    return { tone: 'error', label: 'No refills remaining', detail: 'Ask the pharmacy to send a refill request to the prescriber on this call.' };
  }
  return { tone: 'warning', label: 'Not refilled yet', detail: 'Ask the pharmacy to fill it, then call the member.' };
}

function stepsFor(med, a) {
  const steps = [
    a.lastFillConfirmed ? `Last fill ${med.lastFill} confirmed` : `Last fill corrected to ${a.actualLastFill || '—'}`,
    a.refilled === 'Yes' ? 'Refilled' : 'Not refilled',
  ];
  if (a.refilled === 'Yes') steps.push(a.pickedUp === 'Yes' ? 'Picked up' : 'Not picked up (on shelf)');
  steps.push(`${a.refillsRemaining} refill${Number(a.refillsRemaining) === 1 ? '' : 's'} remaining`);
  if (a.refillRequestSent) steps.push('Refill request sent to prescriber');
  return steps;
}

function YesNo({ value, onChange, labels = ['Yes', 'No'], name }) {
  return (
    <div className={styles.radios} role="radiogroup" aria-label={name}>
      {['Yes', 'No'].map((v, i) => (
        <RadioButton key={v} checked={value === v} onChange={() => onChange(v)} label={labels[i]} />
      ))}
    </div>
  );
}

// Questions down the left, each tagged with its category.
const QUESTIONS = [
  { key: 'lastFillConfirmed', category: 'Fill history', label: (g) => `Last fill on ${g.med.lastFill} confirmed?` },
  { key: 'refilled', category: 'Refill', label: () => 'Has it been refilled?' },
  { key: 'refillsRemaining', category: 'Refill', label: () => 'Refills remaining' },
  { key: 'refillRequestSent', category: 'Refill', label: () => 'Refill request sent to prescriber', when: (a) => a.refillsRemaining !== '' && Number(a.refillsRemaining) === 0 },
  { key: 'pickedUp', category: 'Pickup', label: () => 'Has it been picked up?', when: (a) => a.refilled === 'Yes' },
];

function AnswerCell({ q, gap, answer, onChange }) {
  const set = (patch) => onChange({ ...answer, ...patch });
  if (q.when && !q.when(answer)) return <span className={styles.na}>—</span>;
  switch (q.key) {
    case 'lastFillConfirmed':
      return (
        <div className={styles.cellStack}>
          <YesNo name={`${gap.code} last fill confirmed`} value={answer.lastFillConfirmed ? 'Yes' : 'No'} onChange={v => set({ lastFillConfirmed: v === 'Yes' })} />
          {!answer.lastFillConfirmed && (
            <Input className={styles.dateInput} placeholder="MM/DD/YYYY" value={answer.actualLastFill} onChange={e => set({ actualLastFill: e.target.value })} aria-label={`${gap.code} actual last fill date`} />
          )}
        </div>
      );
    case 'refilled':
      return <YesNo name={`${gap.code} refilled`} value={answer.refilled} onChange={v => set({ refilled: v, pickedUp: v === 'No' ? null : answer.pickedUp })} />;
    case 'pickedUp':
      return <YesNo name={`${gap.code} picked up`} value={answer.pickedUp} labels={['Yes', 'No, on shelf']} onChange={v => set({ pickedUp: v })} />;
    case 'refillsRemaining':
      return (
        <Input
          type="number"
          min={0}
          className={styles.numInput}
          value={answer.refillsRemaining}
          onChange={e => set({ refillsRemaining: e.target.value === '' ? '' : String(Math.max(0, Number(e.target.value))) })}
          aria-label={`${gap.code} refills remaining`}
        />
      );
    case 'refillRequestSent':
      return <Checkbox checked={answer.refillRequestSent} onCheckedChange={v => set({ refillRequestSent: !!v })} aria-label={`${gap.code} refill request sent`} />;
    default:
      return null;
  }
}

function LockedCall({ entry }) {
  return (
    <div className={styles.locked}>
      <div className={styles.lockedHead}>
        <Icon name="solar:lock-keyhole-minimalistic-linear" size={14} color="var(--neutral-300)" />
        <span className={styles.lockedTitle}>{entry.date} · Phone · Outbound · {entry.contact}</span>
        <Badge size="S" tone="grey" label={entry.outcome} />
        <span className={styles.muted}>Locked by {entry.by}</span>
      </div>
      {(entry.items || []).map(it => (
        <div key={it.medId} className={styles.lockedItem}>
          <MeasureCode code={it.measure} />
          <span className={styles.lockedDrug}>{it.drug}</span>
          <span className={styles.muted}>{it.steps.join(' · ')}</span>
        </div>
      ))}
      {entry.note ? <div className={styles.lockedNote}>{entry.note}</div> : null}
    </div>
  );
}

// Pharmacy Verification step of the Pharmacy program, as an assessment
// table: questions down the left, one answer column per pharmacy gap. "Same
// answer for all" copies an answer across every column; each column stays
// editable. Each question is labelled with its category (fill history,
// refill, pickup) in the first column.
export function PharmacyVerificationStep({ program, member: memberProp }) {
  const fromProfile = usePharmacyProgramMember();
  const member = memberProp || fromProfile;
  const lockVerification = useAppStore(s => s.lockPharmacyVerification);
  const createTask = useAppStore(s => s.createTask);
  const addProgramTask = useAppStore(s => s.addProgramTask);
  const currentUser = useAppStore(s => s.currentUserProfile);
  const selectedPatientId = useAppStore(s => s.selectedPatientId);
  const patientId = memberProp ? (memberProp.patientId || memberProp.id) : selectedPatientId;
  const showToast = useAppStore(s => s.showToast);

  // One column per gap; its active medications share the answers.
  const gaps = useMemo(() => {
    if (!member) return [];
    const all = (member.measures || [])
      .toSorted((a, b) => MEASURE_ORDER.indexOf(a.code) - MEASURE_ORDER.indexOf(b.code))
      .map(x => ({ code: x.code, pickup: x.pickupConfirmed, status: measureStatus(x, member).gap, meds: x.medications.filter(d => d.status !== 'Discontinued') }))
      .filter(g => g.meds.length)
      .map(g => ({ ...g, med: g.meds[0] }));
    const open = all.filter(g => OPEN_GAPS.has(g.status));
    return open.length ? open : all;
  }, [member]);

  const [answers, setAnswers] = useState({});
  const [sameForAll, setSameForAll] = useState(false);
  const [note, setNote] = useState('');
  const answerFor = (code) => answers[code] || EMPTY_ANSWER;

  if (!member) {
    return (
      <div className={styles.empty}>
        <Icon name="solar:pills-linear" size={40} color="var(--neutral-200)" />
        <p>No MAD, MAH or MAC medications on file for this member.</p>
      </div>
    );
  }

  const setAnswer = (code, a) => setAnswers(prev => (sameForAll
    ? Object.fromEntries(gaps.map(g => [g.code, a]))
    : { ...prev, [code]: a }));
  const toggleSame = (on) => {
    setSameForAll(on);
    if (on && gaps.length) setAnswers(Object.fromEntries(gaps.map(g => [g.code, answerFor(gaps[0].code)])));
  };

  const rows = QUESTIONS;
  const verifications = (member.callHistory || []).filter(e => e.kind === 'pharmacy-verification');
  const allAnswered = gaps.length > 0 && gaps.every(g => isAnswered(answerFor(g.code)));

  const handleLock = async () => {
    const today = todayMdy();
    const items = gaps.flatMap(g => g.meds.map(med => {
      const a = answerFor(g.code);
      return { medId: med.id, measure: g.code, drug: medLabel(med), steps: stepsFor(med, a), answer: a };
    }));
    const pickedAll = items.every(it => it.answer.pickedUp === 'Yes');
    const onShelf = items.some(it => it.answer.refilled === 'Yes' && it.answer.pickedUp === 'No');
    const outcome = pickedAll ? 'Med pickup confirmed' : onShelf ? 'Filled, not picked up' : 'Not refilled';
    const pickedUpCodes = gaps.filter(g => answerFor(g.code).pickedUp === 'Yes').map(g => g.code);
    const pendingCodes = gaps.filter(g => answerFor(g.code).refilled === 'Yes' && answerFor(g.code).pickedUp === 'No').map(g => g.code);
    const refillsByMed = {};
    for (const it of items) refillsByMed[it.medId] = Number(it.answer.refillsRemaining);
    const by = currentUser?.name || 'You';
    lockVerification(member.id, {
      kind: 'pharmacy-verification',
      locked: true,
      date: today,
      mode: 'Phone',
      direction: 'Outbound',
      contact: member.pharmacy?.name || 'Pharmacy',
      outcome,
      result: pickedAll ? 'success' : 'failed',
      by,
      note,
      measures: gaps.map(g => g.code),
      items: items.map(({ medId, measure, drug, steps, answer }) => ({
        medId, measure, drug, steps,
        refilled: answer.refilled === 'Yes',
        pickedUp: answer.pickedUp === 'Yes',
      })),
    }, { pickedUpCodes, pendingCodes, refillsByMed, status: pickedAll ? 'Completed' : 'In Progress' });

    // Follow-ups: re-check the next gap report for a reversal; confirm any
    // refill request reached the pharmacy a month out.
    const followUps = [{ name: `Check gap report for claim reversal: ${member.name}`, due: addDaysMdy(today, REVERSAL_CHECK_DAYS) }];
    for (const g of gaps) {
      if (answerFor(g.code).refillRequestSent) {
        followUps.push({ name: `Confirm refill request received: ${g.code} (${member.name})`, due: addDaysMdy(today, REFILL_RECHECK_DAYS) });
      }
    }
    let createdCount = 0;
    for (const f of followUps) {
      const created = await createTask({
        name: f.name, status: 'pending', priority: 'medium', due_date: f.due,
        assigned_to: by, assigned_to_id: currentUser?.id || null, member: member.name,
        labels: [], meta: '', description: '', pool: null, mentions: [], attachments: 0, comments: 0,
        is_subtask: false, parent_task: null, parent_task_id: null,
        program_code: program.code, patient_id: patientId != null ? String(patientId) : null,
      });
      if (created) { addProgramTask(program.code, created); createdCount += 1; }
    }
    setAnswers({});
    setNote('');
    showToast?.(createdCount === followUps.length
      ? `Verification call locked · ${createdCount} follow-up task${createdCount === 1 ? '' : 's'} created`
      : `Verification call locked · could not create ${followUps.length - createdCount} follow-up task${followUps.length - createdCount === 1 ? '' : 's'}`);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.banner}>
        <Icon name="solar:info-circle-linear" size={16} color="var(--status-info)" />
        <span>
          A processed claim isn’t proof of pickup, and plan data lags 1–4 weeks. Call the pharmacy to confirm each gap’s medication was refilled and picked up.
        </span>
      </div>

      <DashboardCard
        title="Pharmacy Verification Assessment"
        actions={gaps.length > 1 ? <Switch checked={sameForAll} onChange={toggleSame} label="Same answer for all gaps" /> : undefined}
      >
        <div className={styles.callMeta}>Phone · Outbound · {member.pharmacy?.name || 'Pharmacy'}{member.pharmacy?.phone ? ` · ${member.pharmacy.phone}` : ''}</div>
        <div className={styles.assessment}>
          <div className={styles.tableScroll}>
            <table className={styles.qTable}>
              <thead>
                <tr>
                  <th className={styles.qCol}>Question</th>
                  {gaps.map(g => (
                    <th key={g.code}>
                      <span className={styles.gapHead}>
                        <MeasureCode code={g.code} />
                        <span className={styles.gapMed}>{g.meds.map(medLabel).join(', ')}</span>
                        <span className={styles.gapFacts}>
                          Next due <b className={TONE_CLASS[fillDueTone(g.med.nextFill)] || ''}>{g.med.nextFill}</b> · PDC <b className={TONE_CLASS[pdcTone(g.med.pdc)] || ''}>{g.med.pdc == null ? '—' : `${g.med.pdc}%`}</b>
                        </span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(q => (
                  <tr key={q.key}>
                    <td className={styles.qCol}>
                      <span className={styles.qCategory}>{q.category}</span>
                      <span className={styles.qLabel}>{q.label(gaps[0] || { med: {} })}</span>
                    </td>
                    {gaps.map(g => (
                      <td key={g.code}>
                        <AnswerCell q={q} gap={g} answer={answerFor(g.code)} onChange={a => setAnswer(g.code, a)} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className={styles.actionRow}>
                  <td className={styles.qCol}><span className={styles.qLabel}>Next action</span></td>
                  {gaps.map(g => {
                    const action = nextAction(g.med, answerFor(g.code));
                    return (
                      <td key={g.code}>
                        {action ? (
                          <span className={`${styles.actionChip} ${styles[`action_${action.tone}`]}`}>
                            <span className={styles.actionLabel}>{action.label}</span>
                            {action.detail && <span className={styles.actionDetail}>{action.detail}</span>}
                          </span>
                        ) : <span className={styles.na}>Answer the questions</span>}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.callBody}>
          <div className={styles.q}>
            <span className={styles.qLabel}>Call Note</span>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="One note for the whole call" aria-label="Call note" />
          </div>
          <div className={styles.callFoot}>
            <span className={styles.muted}>Locking logs this call as one action across all gaps (counts as 1 outreach).</span>
            <Button variant="primary" size="L" disabled={!allAnswered} onClick={handleLock}>
              Lock &amp; Log Call
            </Button>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title="Verification History" count={verifications.length || undefined}>
        {verifications.length === 0
          ? <div className={styles.locked}><span className={styles.muted}>No verification calls logged yet.</span></div>
          : verifications.map((e, i) => <LockedCall key={`${e.date}-${i}`} entry={e} />)}
      </DashboardCard>
    </div>
  );
}
