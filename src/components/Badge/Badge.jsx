import { Icon } from '../Icon/Icon';
import { DownChevronIcon } from '../Icon/DownChevronIcon';
import styles from './Badge.module.css';

// Badges always render icons in the linear (line) weight — even if a caller
// hands in a filled/bold Solar name. Coerces `solar:foo-bold` → `solar:foo-linear`.
function toLinear(name) {
  if (typeof name !== 'string') return name;
  return name.replace(/-bold$/, '-linear').replace(/-bold(-duotone|-outline)?$/, '-linear');
}

// Any down-chevron Solar name — regardless of weight — routes to the shared
// DownChevronIcon so the popover-trigger chevron reads the same everywhere.
function isDownChevron(name) {
  return typeof name === 'string' && /alt-arrow-down|arrow-down|angle-down|chevron-down/.test(name);
}

/**
 * Badge — small colored pill for status, category, count, or tag values.
 *
 * Canonical props (Figma "Fold Pixel 1.0" spec — Badge node 24:1678):
 *   • tone — one of white | grey | ghost | primary | secondary | success |
 *            warning | error | info | disabled. Drives the color palette.
 *   • size — 'S' | 'M' | 'L' — matches Figma S=18px / M=22px / L=30px heights.
 *   • hover — force the hover-state class (used by Storybook to demo the
 *             hover appearance; real UX still uses CSS :hover).
 *
 * Legacy `variant` prop stays supported for backward compatibility — every
 * existing worklist / feature variant (lace-*, toc-*, awv-*, status-*,
 * outreach-*, ai-*, care-plan-*, compliance-*, dos-source-*, etc.) is still
 * declared in Badge.module.css. New callers should prefer `tone` + `size`.
 *
 * Slot props:
 *   • label — text content
 *   • dot — leading colored dot
 *   • icon — leading Solar icon name
 *   • trailingIcon — trailing Solar icon name
 *   • trailingIconElement — trailing custom node (wins over trailingIcon)
 *   • chevron — when true, renders the shared DownChevronIcon trailing.
 *              Handy for popover-trigger badges without threading a Solar
 *              name through. Ignored when `trailingIcon` or
 *              `trailingIconElement` is already provided.
 */
export function Badge({
  tone,
  // No default — leaving `size` unset keeps existing callers rendering at
  // the base `.badge` sizing (12px, 2px 6px padding, ≈18px height, which
  // is basically Figma S). New callers who want the Figma sizing curve
  // explicitly opt into 'S' / 'M' / 'L'.
  size,
  hover = false,
  variant,
  label,
  icon,
  trailingIcon,
  trailingIconElement,
  onTrailingIconClick,
  trailingIconLabel,
  chevron = false,
  dot,
  className,
  style,
}) {
  const variantClass = variant
    ? styles[variant.replace(/-/g, '_')] || styles[variant] || ''
    : '';
  const toneClass = tone ? styles[`tone-${tone}`] || styles[`tone${tone[0].toUpperCase()}${tone.slice(1)}`] || '' : '';
  const sizeClass = size ? styles[`size${size}`] || '' : '';
  const hoverClass = hover ? styles.hover : '';
  // Chevron pairs with the badge's size — L=16, M=14, S=12; unspecified size
  // stays at the legacy 13.
  const chevronPx = size === 'L' ? 16 : size === 'M' ? 14 : size === 'S' ? 12 : 13;

  return (
    <span
      className={[styles.badge, sizeClass, toneClass, variantClass, hoverClass, className || '']
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {dot && <span className={styles.dot} />}
      {icon && (
        isDownChevron(icon)
          ? <DownChevronIcon size={chevronPx} color="currentColor" />
          : <Icon name={toLinear(icon)} size={13} />
      )}
      {label}
      {trailingIconElement}
      {!trailingIconElement && trailingIcon && (
        onTrailingIconClick ? (
          <button
            type="button"
            className={styles.trailingButton}
            aria-label={trailingIconLabel || 'Remove'}
            onClick={(e) => { e.stopPropagation(); onTrailingIconClick(e); }}
          >
            {isDownChevron(trailingIcon)
              ? <DownChevronIcon size={chevronPx} color="currentColor" />
              : <Icon name={toLinear(trailingIcon)} size={13} />}
          </button>
        ) : (
          isDownChevron(trailingIcon)
            ? <DownChevronIcon size={chevronPx} color="currentColor" />
            : <Icon name={toLinear(trailingIcon)} size={13} />
        )
      )}
      {!trailingIconElement && !trailingIcon && chevron && (
        <DownChevronIcon size={chevronPx} color="currentColor" />
      )}
    </span>
  );
}
