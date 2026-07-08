import { Icon } from '../Icon/Icon';
import { CHECK_KEYS, CHECK_SHORT_LABELS, CHECK_LABELS } from '../../features/hcc/compliance';
import styles from './ComplianceStrip.module.css';

/**
 * ComplianceStrip — compact at-a-glance view of the 5-point compliance
 * checklist on a document card. Each check is a dot:
 *   pass + AI source     → green sparkle dot
 *   pass + Support source→ green check dot
 *   fail                 → red ×
 *   pending              → amber circle
 *
 * Clicking a dot fires onCheckClick(checkKey). Without a handler, hovering
 * shows a tooltip with the check label and current state. Designed to live
 * inline on a document row.
 *
 * @param {object}  props
 * @param {object}  props.compliance       – Compliance object (see compliance.js)
 * @param {string}  [props.size='M']       – 'S' (very compact) | 'M' (default)
 * @param {boolean} [props.showLabels=false]
 * @param {function}[props.onCheckClick]   – Called with (checkKey) on dot click
 */
export function ComplianceStrip({ compliance, size = 'M', showLabels = false, onCheckClick }) {
  if (!compliance) return null;

  return (
    <div className={[styles.strip, styles[`size_${size}`]].join(' ')} role="group" aria-label="Compliance checks">
      {CHECK_KEYS.map((k) => {
        const check = compliance[k];
        return (
          <CheckDot
            key={k}
            checkKey={k}
            check={check}
            size={size}
            showLabel={showLabels}
            onClick={onCheckClick ? () => onCheckClick(k) : undefined}
          />
        );
      })}
    </div>
  );
}

function CheckDot({ checkKey, check, size, showLabel, onClick }) {
  const { status = 'pending', source } = check || {};
  const isInteractive = !!onClick;

  const iconSize = size === 'S' ? 10 : 12;
  let iconName = 'solar:clock-circle-linear';
  let toneClass = styles.pending;

  if (status === 'pass') {
    iconName = source === 'ai' ? 'solar:magic-stick-3-bold' : 'solar:check-circle-bold';
    toneClass = source === 'ai' ? styles.passAi : styles.passSupport;
  } else if (status === 'fail') {
    iconName = 'solar:close-circle-bold';
    toneClass = styles.fail;
  }

  const tooltip = `${CHECK_LABELS[checkKey]}: ${labelForStatus(status, source)}`;
  const cls = [styles.dot, toneClass, isInteractive ? styles.interactive : ''].filter(Boolean).join(' ');

  const inner = (
    <>
      <Icon name={iconName} size={iconSize} color="currentColor" />
      {showLabel && <span className={styles.label}>{CHECK_SHORT_LABELS[checkKey]}</span>}
    </>
  );

  if (isInteractive) {
    return (
      <button type="button" className={cls} onClick={onClick} title={tooltip} aria-label={tooltip}>
        {inner}
      </button>
    );
  }
  return (
    <span className={cls} title={tooltip} aria-label={tooltip}>
      {inner}
    </span>
  );
}

function labelForStatus(status, source) {
  if (status === 'pass' && source === 'ai') return 'Passed by AI';
  if (status === 'pass' && source === 'support') return 'Passed by Support';
  if (status === 'fail') return 'Failed';
  return 'Pending Support review';
}
