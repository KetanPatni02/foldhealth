import { Icon } from '../Icon/Icon';
import styles from './PhoneLink.module.css';

/**
 * PhoneLink — click-to-dial for a phone number that isn't a patient's
 * (prescriber, pharmacy, facility). Opens the device's dialer / softphone
 * through a `tel:` link; `onDial` lets the caller log the attempt.
 *
 * Props:
 *  - number  string — display format, e.g. "(626) 555-0190"
 *  - label   string — who is being called, for the accessible name
 *  - onDial  () => void — optional
 */
export function PhoneLink({ number, label, onDial }) {
  if (!number) return <span className={styles.empty}>—</span>;
  const digits = number.replace(/[^\d+]/g, '');
  return (
    <a
      className={styles.link}
      href={`tel:${digits}`}
      onClick={(e) => { e.stopPropagation(); onDial?.(); }}
      aria-label={label ? `Call ${label} at ${number}` : `Call ${number}`}
    >
      <Icon name="solar:phone-linear" size={14} color="currentColor" />
      {number}
    </a>
  );
}
