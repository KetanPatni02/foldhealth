import styles from './Collapse.module.css';

/**
 * Collapse: shows or hides its children with the height easing open and
 * shut (the same grid-row technique CollapsibleSection uses). The content
 * stays mounted; while shut it's inert, so it can't be tabbed into.
 *
 * @param {object}  props
 * @param {boolean} props.open
 * @param {React.ReactNode} props.children
 * @param {string}  [props.className] – On the animated outer box
 */
export function Collapse({ open, children, className }) {
  return (
    <div className={[styles.outer, open ? styles.open : '', className || ''].filter(Boolean).join(' ')} inert={!open}>
      <div className={styles.inner}>{children}</div>
    </div>
  );
}
