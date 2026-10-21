import { Icon } from '../Icon/Icon';
import styles from './RingEmptyState.module.css';

/**
 * RingEmptyState — the concentric dashed-ring empty state used across the app
 * (e.g. "No Active Programs"). A gradient disc holds a single linear Solar icon
 * at 1px stroke in neutral-200, ringed by two dashed circles, with a caption.
 *
 * @param {string|function} props.icon – Solar linear icon name shown in the centre, or a
 *   custom icon component (called with `size` and `color`)
 * @param {string} [props.label] – caption beneath the disc (omit for the bare medallion)
 * @param {number} [props.iconSize=46]
 * @param {'M'|'S'|'XS'} [props.size='M'] – S is the compact 80px medallion for inline
 *   slots; XS a 48px one that sits beside text in a row
 * @param {React.ReactNode} [props.children] – optional action under the caption
 */
export function RingEmptyState({ icon = 'solar:inbox-linear', label, iconSize, size = 'M', children }) {
  const glyph = iconSize ?? ({ S: 30, XS: 18 }[size] || 46);
  return (
    <div className={[styles.emptyWrap, size === 'S' ? styles.sizeS : '', size === 'XS' ? styles.sizeXS : ''].filter(Boolean).join(' ')}>
      <div className={styles.emptyCard}>
        <div className={styles.emptyIcon}>
          <span className={styles.iconInner}>
            {typeof icon === 'function'
              ? (() => { const Glyph = icon; return <Glyph size={glyph} color="var(--neutral-200)" />; })()
              : <Icon name={icon} size={glyph} color="var(--neutral-200)" />}
          </span>
        </div>
        {(label || children) && (
          <div className={styles.emptyTextGroup}>
            {label && <p className={styles.emptyText}>{label}</p>}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
