import { Icon } from '../Icon/Icon';
import styles from './QuickActionTile.module.css';

/**
 * QuickActionTile: an icon-over-label shortcut button, laid out in a grid of
 * pinned actions (the patient Overview's Quick Actions card).
 *
 * `attention` adds a small red dot for an action that needs doing now (an
 * overdue assessment); `attentionLabel` is announced with the label so the
 * dot is not colour-only information.
 *
 * @param {object} props
 * @param {string} props.icon             Solar icon name
 * @param {string} props.label
 * @param {boolean} [props.attention=false]
 * @param {string} [props.attentionLabel]  e.g. "PHQ-9 overdue"
 * @param {function} [props.onClick]
 */
export function QuickActionTile({ icon, label, attention = false, attentionLabel, onClick }) {
  return (
    <button
      type="button"
      className={styles.tile}
      onClick={onClick}
      aria-label={attention && attentionLabel ? `${label}, ${attentionLabel}` : undefined}
      title={attention ? attentionLabel : undefined}
    >
      <Icon name={icon} size={20} color="var(--primary-300)" />
      <span className={styles.label}>{label}</span>
      {attention && <span className={styles.dot} aria-hidden="true" />}
    </button>
  );
}
