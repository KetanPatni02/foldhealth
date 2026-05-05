import { Icon } from '../Icon/Icon';
import styles from './Badge.module.css';

export function Badge({ variant, label, icon, trailingIcon, dot, className, style }) {
  const variantClass = variant ? styles[variant.replace(/-/g, '_')] || styles[variant] || '' : '';
  return (
    <span
      className={[styles.badge, variantClass, className || ''].filter(Boolean).join(' ')}
      style={style}
    >
      {dot && <span className={styles.dot} />}
      {icon && <Icon name={icon} size={13} />}
      {label}
      {trailingIcon && <Icon name={trailingIcon} size={13} />}
    </span>
  );
}

// Convenience: map variant name to CSS class (handles hyphens → underscores issue)
// CSS modules convert hyphens to camelCase
// We keep both forms in the CSS so it works
