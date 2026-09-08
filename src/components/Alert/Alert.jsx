import { Icon } from '../Icon/Icon';
import styles from './Alert.module.css';

const TONE = {
  error: {
    icon: 'solar:danger-triangle-linear',
    surface: styles.toneError,
    meta: styles.metaError,
  },
  warning: {
    icon: 'solar:danger-triangle-linear',
    surface: styles.toneWarning,
    meta: styles.metaWarning,
  },
  info: {
    icon: 'solar:info-circle-linear',
    surface: styles.toneInfo,
    meta: styles.metaInfo,
  },
  success: {
    icon: 'solar:check-circle-linear',
    surface: styles.toneSuccess,
    meta: styles.metaSuccess,
  },
};

/**
 * Alert — inline status banner for warnings, deadlines, and contextual notices.
 */
export function Alert({
  tone = 'error',
  icon,
  message,
  children,
  meta,
  className,
}) {
  const cfg = TONE[tone] || TONE.error;
  const content = message ?? children;
  if (!content && !meta) return null;

  return (
    <div
      className={[styles.alert, cfg.surface, className].filter(Boolean).join(' ')}
      role="alert"
    >
      <span className={styles.main}>
        <Icon name={icon || cfg.icon} size={15} />
        <span className={styles.message}>{content}</span>
      </span>
      {meta && <span className={[styles.meta, cfg.meta].join(' ')}>{meta}</span>}
    </div>
  );
}
