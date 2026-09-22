import { useState } from 'react';
import { Dialog, DialogContent } from '../../../../../../components/ShadcnDialog/ShadcnDialog';
import { Input } from '../../../../../../components/Input/Input';
import { Button } from '../../../../../../components/Button/Button';
import { RadioButton } from '../../../../../../components/RadioButton/RadioButton';
import { Icon } from '../../../../../../components/Icon/Icon';
import { MEDICATION_STOP_REASONS } from './medicationStopReasons';
import styles from './StopMedicationDialog.module.css';


const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Stopping a medication needs a date and a reason, so the row's status
 * dropdown asks for both here rather than writing a half-recorded stop.
 * Figma 2154:22903.
 *
 * @param {object}   props
 * @param {object}   props.medication – The row being stopped; its start date
 *   bounds the stop date.
 * @param {function} props.onConfirm  – ({ stop, stopReason })
 * @param {function} props.onCancel
 */
export function StopMedicationDialog({ medication, onConfirm, onCancel }) {
  const [stop, setStop] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const start = medication?.start || '';
  const stopTooEarly = !!(stop && start && stop < start);
  const canSave = !!stop && !!reason && !stopTooEarly;

  const confirm = async () => {
    setSaving(true);
    await onConfirm({ stop, stopReason: reason });
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel?.(); }}>
      <DialogContent className="max-w-[420px] p-5">
        <div className={styles.head}>
          <Icon name="solar:pill-linear" size={24} color="var(--primary-300)" />
          <div className={styles.headText}>
            <span className={styles.title}>Mark Medication as Stopped</span>
            <span className={styles.subtitle}>
              Select a stop date and reason for marking this medication as stopped
            </span>
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Please add a stop date for this medication:</span>
          <Input
            type="date"
            value={stop}
            min={start || undefined}
            onChange={e => setStop(e.target.value)}
            errorText={stopTooEarly ? 'Stop date cannot be before the start date' : undefined}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Please add a reason for marking medication as stopped:</span>
          <div className={styles.reasons} role="radiogroup" aria-label="Reason for stopping">
            {MEDICATION_STOP_REASONS.map(r => (
              <RadioButton
                key={r}
                label={r}
                value={r}
                name="stop-reason"
                checked={reason === r}
                onChange={() => setReason(r)}
              />
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" size="M" onClick={onCancel} className={styles.action}>Cancel</Button>
          <Button variant="primary" size="M" disabled={!canSave || saving} onClick={confirm} className={styles.action}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
