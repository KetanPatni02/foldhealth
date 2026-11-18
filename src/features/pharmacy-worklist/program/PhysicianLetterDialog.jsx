import { useState } from 'react';
import { ConfirmDialog } from '../../../components/ConfirmDialog/ConfirmDialog';
import { Textarea } from '../../../components/Textarea/Textarea';
import styles from './InterventionPlanDialog.module.css';

// Send to physician (Session 7): the side-effect letter to the prescriber,
// drafted for the pharmacist to edit before it is faxed. Sending logs it in
// Activity. `letter`: the draft text; `to`: the prescriber's name and fax.
export function PhysicianLetterDialog({ letter, to, onSend, onCancel }) {
  const [text, setText] = useState(letter);
  return (
    <ConfirmDialog
      variant="primary"
      icon="solar:letter-linear"
      iconColor="var(--primary-300)"
      align="start"
      className={styles.wide}
      title="Send to physician"
      description={`Fax to ${to}. Edit the letter before it goes.`}
      confirmLabel="Send by fax"
      confirmDisabled={!text.trim()}
      onConfirm={() => onSend(text)}
      onCancel={onCancel}
      onClose={onCancel}
    >
      <div className={styles.groups}>
        <Textarea value={text} onChange={e => setText(e.target.value)} rows={12} aria-label="Letter to the physician" />
      </div>
    </ConfirmDialog>
  );
}
