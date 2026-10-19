import { Button } from '../../../../components/Button/Button';
import { Icon } from '../../../../components/Icon/Icon';
import { formatLockTime, isLocked, reasonLabel } from './accountLock';
import styles from './AccountLockPanel.module.css';

/**
 * The lock context on a user's profile, as one compact card: when, how many
 * attempts, from which apps and who locked it, with the Unlock action. After
 * an unlock it shows who did it, when and why.
 */
export function AccountLockPanel({ lock, canUnlock, onUnlock, onResendLink }) {
  if (!lock) return null;
  if (isLocked(lock)) {
    const attempts = lock.failed_count || 5;
    const details = [
      `Since ${formatLockTime(lock.locked_at)}`,
      `${attempts} failed attempt${attempts === 1 ? '' : 's'}`,
      (lock.failed_apps || []).join(', '),
      lock.locked_by === 'system' ? 'Locked by the system' : lock.locked_by && `Locked by ${lock.locked_by}`,
      !canUnlock && 'Only a practice admin can unlock it',
    ].filter(Boolean).join(' · ');
    return (
      <section className={[styles.panel, styles.locked].join(' ')} aria-label="Account locked">
        <div className={styles.head}>
          <Icon name="solar:lock-keyhole-minimalistic-linear" size={16} color="var(--status-error)" />
          <div className={styles.text}>
            <span className={styles.title}>Account locked</span>
            <span className={styles.note}>{details}</span>
          </div>
          {canUnlock && (
            <Button variant="secondary" size="S" leadingIcon="solar:lock-keyhole-unlocked-linear" onClick={onUnlock}>
              Unlock
            </Button>
          )}
        </div>
      </section>
    );
  }
  if (!lock.unlocked_at) return null;
  const by = lock.unlock_reason === 'password_reset' ? 'the user' : (lock.unlocked_by_name || 'an admin');
  return (
    <section className={styles.panel} aria-label="Account unlocked">
      <div className={styles.head}>
        <Icon name="solar:lock-keyhole-unlocked-linear" size={16} color="var(--neutral-300)" />
        <div className={styles.text}>
          <span className={styles.title}>Unlocked by {by}, {formatLockTime(lock.unlocked_at)}</span>
          <span className={styles.note}>
            Reason: {reasonLabel(lock.unlock_reason)}{lock.unlock_note ? ` (${lock.unlock_note})` : ''}
            {lock.require_reset ? ' · Waiting for them to set a new password from the emailed link' : ' · They set a new password'}
          </span>
        </div>
        {lock.require_reset && canUnlock && onResendLink && (
          <Button variant="secondary" size="S" leadingIcon="solar:letter-linear" onClick={onResendLink}>
            Resend Link
          </Button>
        )}
      </div>
    </section>
  );
}
