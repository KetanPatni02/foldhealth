import styles from './Link.module.css';

/**
 * Link — inline primary-colored text link.
 *
 * Use for primary text actions like "Download Template" or "Choose file".
 * Renders a span (so it composes inside sentences and clickable containers);
 * pass `onClick` for standalone actions.
 *
 * Props:
 *  - children   (ReactNode)
 *  - variant    ('primary'|'secondary')  — 'secondary' renders the same link in
 *                                          neutral text, for de-emphasised
 *                                          actions sitting next to a primary one
 *  - disabled   (boolean)  — greyed out and inert (no click, not focusable)
 *  - onClick    (function)
 *  - className  (string)
 *  - style      (object)   — e.g. { fontSize: 'var(--font-sm)' }
 */
export function Link({ children, variant = 'primary', disabled = false, onClick, className, style, ...rest }) {
  return (
    <span
      className={[styles.link, variant === 'secondary' ? styles.secondary : '', disabled ? styles.disabled : '', className].filter(Boolean).join(' ')}
      onClick={disabled ? undefined : onClick}
      style={style}
      {...rest}
      {...(disabled ? { 'aria-disabled': true, tabIndex: -1, onKeyDown: undefined } : {})}
    >
      {children}
    </span>
  );
}
