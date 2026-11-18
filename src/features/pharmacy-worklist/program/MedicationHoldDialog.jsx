import { useState } from 'react';
import { ReasonDialog } from '../../../components/ReasonDialog/ReasonDialog';
import { DatePicker } from '../../../components/DatePicker/DatePicker';
import { Input } from '../../../components/Input/Input';
import styles from './MedicationHoldDialog.module.css';

const HOLD_REASONS = [
  'Side effects or allergy',
  'Prescriber changed therapy',
  'Prescriber stopped or paused it',
  'Member in hospital or facility',
  'Member choice',
  'Cost',
];
// ISO (YYYY-MM-DD) from the date field to the MM/DD/YYYY the worklist keeps.
const toMdy = (iso) => (iso ? `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}` : null);
const todayIso = () => new Date().toISOString().slice(0, 10);

// Stop or Pause a drug (Suresh): from when, until when for a pause, why and
// who confirmed it. For outreach and audit; the gap's PDC clock keeps running.
// `kind`: 'stop' | 'pause'. `onSave(hold)` gets { kind, start, end, reason, confirmedBy }.
export function MedicationHoldDialog({ kind, med, onSave, onCancel }) {
  const [start, setStart] = useState(todayIso());
  const [end, setEnd] = useState('');
  const [confirmedBy, setConfirmedBy] = useState('');
  const isPause = kind === 'pause';
  const datesValid = !!start && (!isPause || !end || end >= start);
  return (
    <ReasonDialog
      title={`${isPause ? 'Pause' : 'Stop'} ${med.name}`}
      description="Recorded for outreach and audit. The gap's PDC keeps counting, and this drug's next fill is no longer projected."
      standardReasons={HOLD_REASONS}
      confirmLabel={isPause ? 'Pause medication' : 'Stop medication'}
      confirmTone="primary"
      confirmDisabled={!datesValid || !confirmedBy.trim()}
      notesPlaceholder="Anything else the team should know"
      onCancel={onCancel}
      onSubmit={({ code, freeText }) => onSave({
        kind,
        start: toMdy(start),
        end: isPause ? toMdy(end) : null,
        reason: [code, freeText].filter(Boolean).join(': '),
        confirmedBy: confirmedBy.trim(),
      })}
    >
      <div className={styles.fields}>
        <DatePicker label={isPause ? 'Paused from' : 'Stopped on'} value={start} onSelect={setStart} required />
        {isPause && <DatePicker label="Resume on (optional)" value={end} onSelect={setEnd} />}
        <Input label="Confirmed by" required placeholder="Prescriber, pharmacist or member" value={confirmedBy} onChange={e => setConfirmedBy(e.target.value)} />
      </div>
    </ReasonDialog>
  );
}
