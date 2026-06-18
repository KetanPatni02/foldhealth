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
 *  - onClick    (function)
 *  - className  (string)
 *  - style      (object)   — e.g. { fontSize: 12 }
 */
export function Link({ children, onClick, className, style, ...rest }) {
  return (
    <span
      className={[styles.link, className].filter(Boolean).join(' ')}
      onClick={onClick}
      style={style}
      {...rest}
    >
      {children}
    </span>
  );
}
