import { Icon } from '../Icon/Icon';
import styles from './RingEmptyState.module.css';

/**
 * RingEmptyState — the concentric dashed-ring empty state used across the app
 * (e.g. "No Active Programs"). A gradient disc holds a single linear Solar icon
 * at 1px stroke in neutral-200, ringed by two dashed circles, with a caption.
 *
 * @param {string} props.icon   – Solar linear icon name shown in the centre
 * @param {string} props.label  – caption beneath the disc
 * @param {number} [props.iconSize=46]
 */
export function RingEmptyState({ icon = 'solar:inbox-linear', label, iconSize = 46 }) {
  return (
    <div className={styles.emptyWrap}>
      <div className={styles.emptyCard}>
        <div className={styles.emptyIcon}>
          <span className={styles.iconInner}>
            <Icon name={icon} size={iconSize} color="var(--neutral-200)" />
          </span>
        </div>
        <p className={styles.emptyText}>{label}</p>
      </div>
    </div>
  );
}
