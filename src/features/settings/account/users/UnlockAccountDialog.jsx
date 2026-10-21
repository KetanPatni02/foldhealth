import { useState } from 'react';
import { ReasonDialog } from '../../../../components/ReasonDialog/ReasonDialog';
import { Checkbox } from '../../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { UNLOCK_REASONS } from './accountLock';
import styles from './AccountLockPanel.module.css';

const BY_LABEL = Object.fromEntries(UNLOCK_REASONS.map(r => [r.label, r.code]));

/**
 * Unlock asks for a reason and a confirmation that the user's identity was
 * checked. The user then gets an email with their User ID and a one-time
 * link to set a new password; their old password no longer works.
 */
export function UnlockAccountDialog({ user, onCancel, onConfirm }) {
  const [identityChecked, setIdentityChecked] = useState(false);
  return (
    <ReasonDialog
      title={`Unlock ${user.name}?`}
      description="We'll email them their User ID and a one-time link (valid 24 hours) to set a new password. The reason, your name and the time are recorded on their profile."
      decision="pass"
      standardReasons={UNLOCK_REASONS.map(r => r.label)}
      confirmLabel="Unlock Account"
      confirmVariant="primary"
      confirmDisabled={!identityChecked}
      notesPlaceholder="How you checked their identity, or why you're unlocking (required for Other)"

      onCancel={onCancel}
      onSubmit={({ code, freeText }) => onConfirm({
        reason: code ? BY_LABEL[code] : 'other',
        note: freeText,
        identityConfirmed: identityChecked,
      })}
    >
      <label className={styles.check}>
        <Checkbox checked={identityChecked} onCheckedChange={v => setIdentityChecked(v === true)} />
        <span>I checked this user's identity</span>
      </label>
    </ReasonDialog>
  );
}
