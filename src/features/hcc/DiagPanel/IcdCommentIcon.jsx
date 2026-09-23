import { Icon } from '../../../components/Icon/Icon';
import styles from './IcdCommentIcon.module.css';

/** Chat icon for an ICD's Comments counter, with a red dot when there are unread comments. */
export function IcdCommentIcon({ unread = false, size = 14 }) {
  return (
    <span className={styles.wrap} style={{ width: size, height: size }}>
      <Icon name="solar:chat-round-line-linear" size={size} color="currentColor" />
      {unread && <span className={styles.dot} aria-label="Unread comments" />}
    </span>
  );
}
