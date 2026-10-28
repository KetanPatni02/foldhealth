import { Icon } from '../Icon/Icon';
import { useAppStore } from '../../store/useAppStore';
import styles from './PhoneLink.module.css';

/**
 * PhoneLink: click-to-call for a phone number that isn't a patient's
 * (prescriber, pharmacy, facility). Opens the app's Voice Call drawer on
 * "Dial a number" with the number filled in, so the user picks the line to
 * call from and the call is logged in Comms. `onDial` lets the caller log
 * the attempt too.
 *
 * Props:
 *  - number  string — display format, e.g. "(626) 555-0190"
 *  - label   string — who is being called, for the accessible name
 *  - onDial  () => void — optional
 */
export function PhoneLink({ number, label, onDial }) {
  const openCommsDrawer = useAppStore(s => s.openCommsDrawer);
  if (!number) return <span className={styles.empty}>—</span>;
  return (
    <button
      type="button"
      className={styles.link}
      onClick={(e) => {
        e.stopPropagation();
        openCommsDrawer('call', { initialMode: 'dial', initialNumber: number });
        onDial?.();
      }}
      aria-label={label ? `Call ${label} at ${number}` : `Call ${number}`}
    >
      <Icon name="solar:phone-linear" size={14} color="currentColor" />
      {number}
    </button>
  );
}
