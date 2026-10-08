import { Icon } from '../Icon/Icon';
import styles from './MessageStatus.module.css';

// Glyphs from Fold-Pixel 1.0 "Message Status" (1117:19507), 16px at 1px stroke.
const GLYPHS = {
  delay: <path d="M8 5.333V8l1.667 1.667M14.667 8A6.667 6.667 0 1 1 1.333 8a6.667 6.667 0 0 1 13.334 0Z" strokeLinecap="round" strokeLinejoin="round" />,
  sent: <path d="M3.333 8.06l2.24 2.49a1 1 0 0 0 1.45.038l5.255-5.255" strokeLinecap="round" />,
  received: <path d="M2.667 8.6 4.762 11 10 5m3.334.042-5.715 6-.286-.375" strokeLinecap="round" strokeLinejoin="round" />,
};
GLYPHS.read = GLYPHS.received;

const LABELS = { delay: 'Sending', sent: 'Sent', received: 'Delivered', read: 'Read', failed: 'Not sent' };

/**
 * Fold Health MessageStatus: the small mark beside a sent message's time.
 * Clock while it goes out, one tick once sent, two grey ticks once
 * delivered, two green ticks once read; a failed send shows "Resend".
 *
 * @param {'delay'|'sent'|'received'|'read'|'failed'} props.status
 * @param {() => void} [props.onResend] – shown with `failed`
 */
export function MessageStatus({ status, onResend }) {
  if (status === 'failed') {
    return (
      <button type="button" className={styles.resend} onClick={onResend} disabled={!onResend}>
        <Icon name="solar:danger-circle-linear" size={16} color="var(--status-error)" />
        Resend
      </button>
    );
  }
  const glyph = GLYPHS[status];
  if (!glyph) return null;
  return (
    <svg
      className={[styles.mark, status === 'read' ? styles.read : ''].join(' ')}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      role="img"
      aria-label={LABELS[status]}
    >
      {glyph}
    </svg>
  );
}
