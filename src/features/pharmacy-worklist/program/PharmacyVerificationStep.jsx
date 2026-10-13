import { useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Badge } from '../../../components/Badge/Badge';
import { Button } from '../../../components/Button/Button';
import { Checkbox } from '../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { Icon } from '../../../components/Icon/Icon';
import { Input } from '../../../components/Input/Input';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import { Textarea } from '../../../components/Textarea/Textarea';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import {
  MEASURE_NAMES, MEASURE_ORDER, addDaysMdy, fillDueTone, medLabel, parseMdy, pdcTone, todayMdy,
} from '../pharmacyWorklist.utils';
import { usePharmacyProgramMember } from './usePharmacyProgramMember';
import styles from './PharmacyVerificationStep.module.css';

// A processed claim isn't proof of pickup: the fill sits on the shelf ~10–14
// days and is reversed if nobody collects it, and plan/claims data lags.
// So the coordinator calls the pharmacy and asks, per drug: last fill date,
// refilled?, picked up?, refills remaining? The answers drive the next action.
const REVERSAL_CHECK_DAYS = 14;
const REFILL_RECHECK_DAYS = 30;

const TONE_CLASS = { error: styles.toneError, warning: styles.toneWarning, success: styles.toneSuccess };
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

function MedVerification({ med, measure, pickup, answer, onChange }) {
  const set = (patch) => onChange({ ...answer, ...patch });
  const action = nextAction(med, answer);
  const firstFill = med.refills.length <= 1;
  const zeroRefills = answer.refillsRemaining !== '' && Number(answer.refillsRemaining) === 0;

  return (
    <div className={styles.med}>
      <div className={styles.medHead}>
        <Tooltip label={MEASURE_NAMES[measure]} placement="bottom">
          <Badge size="S" tone="primary" label={measure} />
        </Tooltip>
        <span className={styles.medName}>{medLabel(med)}</span>
        {firstFill && <Badge size="S" tone="info" label="First fill" />}
      </div>
      <div className={styles.facts}>
        <span>Last fill <b>{med.lastFill}</b></span>
        {pickup && <span>Pickup confirmed <b className={styles.toneSuccess}>{pickup}</b></span>}
        <span>Next due <b className={TONE_CLASS[fillDueTone(med.nextFill)] || ''}>{med.nextFill}</b></span>
        <span>PDC <b className={TONE_CLASS[pdcTone(med.pdc)] || ''}>{med.pdc == null ? '—' : `${med.pdc}%`}</b></span>
        <span>{med.qty} qty · {med.daysSupply} DS</span>
      </div>

      <div className={styles.questions}>
        <div className={styles.q}>
          <span className={styles.qLabel}>Confirm: was {medLabel(med)} last filled on {med.lastFill}?</span>
          <div className={styles.inline}>
            <YesNo name="Last fill confirmed" value={answer.lastFillConfirmed ? 'Yes' : 'No'} onChange={v => set({ lastFillConfirmed: v === 'Yes' })} />
            {!answer.lastFillConfirmed && (
              <Input
                className={styles.dateInput}
                placeholder="MM/DD/YYYY"
                value={answer.actualLastFill}
                onChange={e => set({ actualLastFill: e.target.value })}
                aria-label="Actual last fill date"
              />
            )}
          </div>
        </div>
        <div className={styles.q}>
          <span className={styles.qLabel}>Has it been refilled?</span>
          <YesNo name="Refilled" value={answer.refilled} onChange={v => set({ refilled: v, pickedUp: v === 'No' ? null : answer.pickedUp })} />
        </div>
        {answer.refilled === 'Yes' && (
          <div className={styles.q}>
            <span className={styles.qLabel}>Has it been picked up?</span>
            <YesNo name="Picked up" value={answer.pickedUp} labels={['Yes', 'No — still on the shelf']} onChange={v => set({ pickedUp: v })} />
          </div>
        )}
        <div className={styles.q}>
          <span className={styles.qLabel}>How many refills are remaining?</span>
          <Input
            type="number"
            min={0}
            className={styles.numInput}
            value={answer.refillsRemaining}
            onChange={e => set({ refillsRemaining: e.target.value === '' ? '' : String(Math.max(0, Number(e.target.value))) })}
            aria-label="Refills remaining"
          />
        </div>
        {zeroRefills && (
          <label className={styles.checkRow}>
            <Checkbox checked={answer.refillRequestSent} onCheckedChange={v => set({ refillRequestSent: !!v })} />
            <span>Asked the pharmacy to send a refill request to {med.prescriber?.name || 'the prescriber'}</span>
          </label>
        )}
      </div>

      {action && (
        <div className={`${styles.action} ${styles[`action_${action.tone}`]}`}>
          <Icon name={action.tone === 'success' ? 'solar:check-circle-linear' : 'solar:danger-circle-linear'} size={16} color="currentColor" />
          <div>
            <div className={styles.actionLabel}>{action.label}</div>
            {action.detail && <div className={styles.actionDetail}>{action.detail}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function LockedCall({ entry }) {
  return (
    <div className={styles.locked}>
      <div className={styles.lockedHead}>
        <Icon name="solar:lock-keyhole-minimalistic-linear" size={14} color="var(--neutral-300)" />
        <span className={styles.lockedTitle}>{entry.date} · Phone · Outbound · {entry.contact}</span>
        <Badge size="S" tone={entry.result === 'success' ? 'success' : 'warning'} label={entry.outcome} />
        <span className={styles.muted}>Locked by {entry.by}</span>
      </div>
      {(entry.items || []).map(it => (
        <div key={it.medId} className={styles.lockedItem}>
          <Badge size="S" tone="primary" label={it.measure} />
          <span className={styles.lockedDrug}>{it.drug}</span>
          <span className={styles.muted}>{it.steps.join(' · ')}</span>
        </div>
      ))}
      {entry.note ? <div className={styles.lockedNote}>{entry.note}</div> : null}
    </div>
  );
}

// Pharmacy Verification step of the Pharmacy program.
export function PharmacyVerificationStep({ program }) {
  const member = usePharmacyProgramMember();
  const lockVerification = useAppStore(s => s.lockPharmacyVerification);
  const createTask = useAppStore(s => s.createTask);
  const addProgramTask = useAppStore(s => s.addProgramTask);
  const currentUser = useAppStore(s => s.currentUserProfile);
  const patientId = useAppStore(s => s.selectedPatientId);
  const showToast = useAppStore(s => s.showToast);

  const meds = useMemo(() => (member?.measures || [])
    .toSorted((a, b) => MEASURE_ORDER.indexOf(a.code) - MEASURE_ORDER.indexOf(b.code))
    .flatMap(x => x.medications.filter(d => d.status !== 'Discontinued').map(d => ({ med: d, measure: x.code, pickup: x.pickupConfirmed }))), [member]);

  const [answers, setAnswers] = useState({});
  const [note, setNote] = useState('');
  const answerFor = (id) => answers[id] || EMPTY_ANSWER;

  if (!member) {
    return (
      <div className={styles.empty}>
        <Icon name="solar:pills-linear" size={40} color="var(--neutral-200)" />
        <p>No MAD, MAH or MAC medications on file for this member.</p>
      </div>
    );
  }

  const verifications = (member.callHistory || []).filter(e => e.kind === 'pharmacy-verification');
  const allAnswered = meds.length > 0 && meds.every(({ med }) => isAnswered(answerFor(med.id)));

  const handleLock = async () => {
    const today = todayMdy();
    const items = meds.map(({ med, measure }) => {
      const a = answerFor(med.id);
      return { medId: med.id, measure, drug: medLabel(med), steps: stepsFor(med, a), answer: a };
    });
    const pickedAll = items.every(it => it.answer.pickedUp === 'Yes');
    const onShelf = items.some(it => it.answer.refilled === 'Yes' && it.answer.pickedUp === 'No');
    const outcome = pickedAll ? 'Med pickup confirmed' : onShelf ? 'Filled — not picked up' : 'Not refilled';
    const pickedUpCodes = [...new Set(items.filter(it => it.answer.pickedUp === 'Yes').map(it => it.measure))];
    const pendingCodes = [...new Set(items.filter(it => it.answer.refilled === 'Yes' && it.answer.pickedUp === 'No').map(it => it.measure))];
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
      measures: [...new Set(items.map(it => it.measure))],
      items: items.map(({ medId, measure, drug, steps, answer }) => ({
        medId, measure, drug, steps,
        refilled: answer.refilled === 'Yes',
        pickedUp: answer.pickedUp === 'Yes',
      })),
    }, { pickedUpCodes, pendingCodes, refillsByMed, status: pickedAll ? 'Completed' : 'In Progress' });

    // Follow-ups: re-check the next gap report for a reversal; confirm any
    // refill request reached the pharmacy a month out.
    const followUps = [{ name: `Check gap report for claim reversal — ${member.name}`, due: addDaysMdy(today, REVERSAL_CHECK_DAYS) }];
    for (const it of items) {
      if (it.answer.refillRequestSent) {
        followUps.push({ name: `Confirm refill request received — ${it.drug} (${member.name})`, due: addDaysMdy(today, REFILL_RECHECK_DAYS) });
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
          A processed claim isn’t proof of pickup, and plan data lags 1–4 weeks. Call the pharmacy to confirm each drug was refilled and picked up.
        </span>
      </div>

      <div className={styles.callCard}>
        <div className={styles.callHead}>
          <div>
            <div className={styles.callTitle}>Verification call</div>
            <div className={styles.muted}>Phone · Outbound · {member.pharmacy?.name || 'Pharmacy'}{member.pharmacy?.phone ? ` · ${member.pharmacy.phone}` : ''}</div>
          </div>
          {member.status !== 'Completed' && member.status !== 'Closed-Data' && <Badge size="S" tone="warning" label="Pending pharmacy verification" />}
        </div>

        {meds.map(({ med, measure, pickup }) => (
          <MedVerification
            key={med.id}
            med={med}
            measure={measure}
            pickup={pickup}
            answer={answerFor(med.id)}
            onChange={a => setAnswers(prev => ({ ...prev, [med.id]: a }))}
          />
        ))}

        <div className={styles.q}>
          <span className={styles.qLabel}>Call note</span>
          <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="One note for every medication and measure on this call" aria-label="Call note" />
        </div>

        <div className={styles.callFoot}>
          <span className={styles.muted}>Locking logs this call as one action across all measures (counts as 1 outreach).</span>
          <Button variant="primary" size="L" disabled={!allAnswered} onClick={handleLock}>
            Lock &amp; log call
          </Button>
        </div>
      </div>

      <div className={styles.sectionTitle}>Verification history</div>
      {verifications.length === 0
        ? <div className={styles.muted}>No verification calls logged yet.</div>
        : verifications.map((e, i) => <LockedCall key={`${e.date}-${i}`} entry={e} />)}
    </div>
  );
}
