import { Icon } from '../Icon/Icon';
import styles from './AuditBadge.module.css';

/**
 * AuditBadge — distinguishes who passed/failed a compliance check.
 *
 *   source="ai"      → sparkle icon + primary purple
 *   source="support" → check icon  + status-success green
 *
 * Distinct icon AND color so colorblind users can still tell them apart.
 * Tooltip surfaces actor + timestamp for audit drill-down.
 *
 * @param {object}  props
 * @param {'ai'|'support'} props.source
 * @param {string}  [props.actor]   – Display name of the actor (defaults: 'AI' / 'Support')
 * @param {string}  [props.at]      – ISO timestamp; rendered into tooltip
 * @param {'S'|'M'} [props.size='S']
 * @param {string}  [props.className]
 */
export function AuditBadge({ source, actor, at, size = 'S', className }) {
  if (source !== 'ai' && source !== 'support') return null;

  const isAi = source === 'ai';
  const iconName = isAi ? 'solar:magic-stick-3-linear' : 'solar:check-circle-linear';
  const iconSize = size === 'M' ? 14 : 12;
  const label = actor || (isAi ? 'AI' : 'Support');
  const tooltip = at
    ? `${isAi ? 'AI auto-passed' : 'Support reviewed by ' + label} · ${formatDate(at)}`
    : (isAi ? 'AI auto-passed' : `Support reviewed by ${label}`);

  return (
    <span
      className={[styles.badge, isAi ? styles.ai : styles.support, styles[`size_${size}`], className || ''].filter(Boolean).join(' ')}
      title={tooltip}
      aria-label={tooltip}
    >
      <Icon name={iconName} size={iconSize} color="currentColor" />
      <span className={styles.label}>{label}</span>
    </span>
  );
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}
