import { forwardRef, useRef, useState } from 'react';
import { Icon } from '../Icon/Icon';
import { DownChevronIcon } from '../Icon/DownChevronIcon';
import { MenuPopover } from '../MenuPopover/MenuPopover';
import styles from './Button.module.css';

/**
 * Fold Health Button — single source-of-truth button control.
 *
 * Matches Figma Fold-Pixel-1.0 node 25:155 exactly.
 *
 * @param {object}   props
 * @param {'primary'|'secondary'|'tertiary'|'ghost'|'alt'|'success'|'danger'|'dangerFilled'|'info'} [props.variant='primary']
 * @param {'S'|'L'|'XL'}  [props.size='L']         – S=24px, L=32px, XL=52px (mobile)
 * @param {string}   [props.leadingIcon]             – Solar icon name for leading icon
 * @param {React.ReactNode} [props.leadingIconElement] – Custom React node for leading icon (overrides leadingIcon)
 * @param {string}   [props.trailingIcon]            – Solar icon name for trailing icon
 * @param {boolean}  [props.iconOnly=false]          – Square icon-only button (no text)
 * @param {boolean}  [props.fullWidth=false]          – Full-width button
 * @param {boolean}  [props.disabled=false]
 * @param {Array}    [props.menuItems]               – When provided, renders the split-button
 *                                                    variant: main action on the left, a divider,
 *                                                    and a chevron on the right that opens a
 *                                                    MenuPopover of secondary actions. Items follow
 *                                                    the MenuPopover schema.
 * @param {function} [props.onMenuSelect]            – (key, item) => void; fired when a menuItem is chosen
 * @param {string}   [props.menuAriaLabel='More actions']
 * @param {number}   [props.menuWidth=200]
 * @param {'left'|'right'} [props.menuAlign='right']
 * @param {string}   [props.className]               – Extra class on the button
 * @param {string}   [props.type='button']
 * @param {React.ReactNode} props.children           – Button text / content
 */
export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'L',
    leadingIcon,
    leadingIconElement,
    trailingIcon,
    trailingIconElement,
    iconOnly = false,
    fullWidth = false,
    disabled = false,
    menuItems,
    onMenuSelect,
    menuAriaLabel = 'More actions',
    menuWidth = 200,
    menuAlign = 'right',
    className,
    children,
    type = 'button',
    ...rest
  },
  ref
) {
  // Split-button rendering (main + divider + chevron + menu) when the caller
  // supplies `menuItems`. Delegates both halves to the base render below so
  // every variant / size / hover / disabled state carries over unchanged.
  if (Array.isArray(menuItems) && menuItems.length > 0) {
    return (
      <SplitButtonBody
        ref={ref}
        variant={variant}
        size={size}
        leadingIcon={leadingIcon}
        leadingIconElement={leadingIconElement}
        trailingIcon={trailingIcon}
        trailingIconElement={trailingIconElement}
        disabled={disabled}
        fullWidth={fullWidth}
        menuItems={menuItems}
        onMenuSelect={onMenuSelect}
        menuAriaLabel={menuAriaLabel}
        menuWidth={menuWidth}
        menuAlign={menuAlign}
        className={className}
        type={type}
        rest={rest}
      >
        {children}
      </SplitButtonBody>
    );
  }

  const sizeClass = size === 'S' ? styles.sizeS : size === 'XL' ? styles.sizeXL : styles.sizeL;
  const iconSize = size === 'S' ? 14 : size === 'XL' ? 24 : 16;

  // Icon color follows the button's text color via `currentColor` — so
  // hover states (tertiary purple→white, success green→white, danger
  // red→white) and the disabled state re-tint the icon with the label,
  // no per-variant JS lookup needed.
  const iconColor = 'currentColor';

  const cls = [
    styles.btn,
    sizeClass,
    styles[variant] || styles.primary,
    iconOnly ? styles.iconOnly : '',
    fullWidth ? styles.fullWidth : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} type={type} className={cls} disabled={disabled} {...rest}>
      {leadingIconElement && leadingIconElement}
      {!leadingIconElement && leadingIcon && (
        <Icon name={leadingIcon} size={iconSize} color={iconColor} className={styles.icon} />
      )}
      {!iconOnly && children}
      {trailingIconElement && trailingIconElement}
      {!trailingIconElement && trailingIcon && (
        <Icon name={trailingIcon} size={iconSize} color={iconColor} className={styles.icon} />
      )}
    </button>
  );
});

// ── Split-button body ─────────────────────────────────────────────────
// Kept inside Button.jsx (rather than a sibling SplitButton file) so
// callers reach for one API — `<Button menuItems={…} />` — and every
// variant / size / hover / disabled state stays defined in one place.
// Renders two <button>s (main + chevron) inside a wrapper <span>, joined
// by a 1px divider. The main button carries the primary `onClick`; the
// chevron toggles a MenuPopover of secondary actions.
const SplitButtonBody = forwardRef(function SplitButtonBody(
  {
    variant,
    size,
    leadingIcon,
    leadingIconElement,
    trailingIcon,
    trailingIconElement,
    disabled,
    fullWidth,
    menuItems,
    onMenuSelect,
    menuAriaLabel,
    menuWidth,
    menuAlign,
    className,
    type,
    rest,
    children,
  },
  ref
) {
  const [menuOpen, setMenuOpen] = useState(false);
  const chevronRef = useRef(null);

  const sizeClass = size === 'S' ? styles.sizeS : size === 'XL' ? styles.sizeXL : styles.sizeL;
  const iconSize = size === 'S' ? 14 : size === 'XL' ? 24 : 16;
  // Chevron glyph: 14px on S, 18px on L, 24px on XL — sits slightly larger
  // than the leading icon so the affordance still reads as the dominant hit
  // target on the right half.
  const chevronSize = size === 'S' ? 14 : size === 'XL' ? 24 : 18;
  const variantClass = styles[variant] || styles.primary;
  const iconColor = 'currentColor';

  // Wrapper carries only variant chrome — size lives on the inner halves.
  // Applying `sizeClass` on the wrapper double-paints padding/height and
  // throws off the icon/label alignment; wrapper radius adapts via :has().
  const wrapperCls = [
    styles.splitWrapper,
    variantClass,
    fullWidth ? styles.fullWidth : '',
    className || '',
  ].filter(Boolean).join(' ');

  // The wrapper owns the variant chrome (background, border, radius, color);
  // the two halves are transparent click regions inside it — so the pill reads
  // as one cohesive shape and only paints a hover tint on the hovered half.
  const mainCls = [styles.btn, sizeClass, styles.splitMain].filter(Boolean).join(' ');
  const chevronCls = [styles.btn, sizeClass, styles.iconOnly, styles.splitChevron]
    .filter(Boolean).join(' ');

  const { onClick, ...restNoClick } = rest || {};

  return (
    <span className={wrapperCls}>
      <button
        ref={ref}
        type={type}
        className={mainCls}
        disabled={disabled}
        onClick={onClick}
        {...restNoClick}
      >
        {leadingIconElement && leadingIconElement}
        {!leadingIconElement && leadingIcon && (
          <Icon name={leadingIcon} size={iconSize} color={iconColor} className={styles.icon} />
        )}
        {children}
        {trailingIconElement && trailingIconElement}
        {!trailingIconElement && trailingIcon && (
          <Icon name={trailingIcon} size={iconSize} color={iconColor} className={styles.icon} />
        )}
      </button>
      <span className={styles.splitDivider} aria-hidden="true" />
      <button
        ref={chevronRef}
        type="button"
        className={chevronCls}
        disabled={disabled}
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={menuAriaLabel}
      >
        <DownChevronIcon size={chevronSize} color="currentColor" />
      </button>
      {menuOpen && (
        <MenuPopover
          anchorRef={chevronRef}
          items={menuItems}
          onSelect={(key, item) => onMenuSelect?.(key, item)}
          onClose={() => setMenuOpen(false)}
          width={menuWidth}
          align={menuAlign}
          ariaLabel={menuAriaLabel}
        />
      )}
    </span>
  );
});
