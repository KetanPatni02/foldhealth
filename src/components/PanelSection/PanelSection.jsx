import { Fragment, useState } from 'react';
import { DownChevronIcon } from '../Icon/DownChevronIcon';
import { Button } from '../Button/Button';
import styles from './PanelSection.module.css';

/**
 * PanelSection: a collapsible section in a side panel (the patient Summary
 * tab, Overview): a chevron + title on the left, actions on the right, and
 * the body below. Header and body share one inline inset so every section's
 * title, rows and actions line up on the same left and right edges.
 *
 * @param {object}    props
 * @param {string}    props.title
 * @param {React.ReactNode} [props.actions] – right side of the header; hidden while collapsed
 * @param {boolean}   [props.defaultCollapsed=false]
 * @param {React.ReactNode} props.children
 */
export function PanelSection({ title, actions, defaultCollapsed = false, children }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.titleBtn}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(v => !v)}
        >
          <DownChevronIcon
            size={12}
            color="var(--neutral-300)"
            style={collapsed ? { transform: 'rotate(-90deg)' } : undefined}
          />
          <span className={styles.title}>{title}</span>
        </button>
        {!collapsed && actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {!collapsed && <div className={styles.body}>{children}</div>}
    </section>
  );
}

/**
 * A row in a PanelSection list: leading avatar, a title with meta below it,
 * and trailing content (a status badge, a price, a switch) on the right edge.
 * `meta` takes an array; its parts are joined with a dot.
 *
 * @param {React.ReactNode} [props.leading]
 * @param {React.ReactNode} props.title
 * @param {Array<React.ReactNode>|React.ReactNode} [props.meta]
 * @param {React.ReactNode} [props.trailing]
 * @param {React.ReactNode} [props.titleAside] – shown at the end of the title line instead of
 *   as a trailing column, so content below (a progress bar) can span the full row
 * @param {boolean} [props.wrapTitle=false] – let a long title wrap to two lines instead of truncating
 * @param {boolean} [props.inset=false] – pad the row inline so a full-bleed list still lines up with the card header
 * @param {boolean} [props.alignTop=false] – keep trailing actions with the title when the row wraps
 * @param {React.ReactNode} [props.children] – extra content under the meta (e.g. a progress bar)
 */
export function PanelSectionItem({ leading, title, meta, trailing, titleAside, wrapTitle = false, inset = false, alignTop = false, children }) {
  const parts = (Array.isArray(meta) ? meta : [meta]).filter(p => p != null && p !== false && p !== '');
  return (
    <div className={[styles.item, inset ? styles.inset : '', alignTop ? styles.alignTop : ''].filter(Boolean).join(' ')}>
      {leading && <span className={styles.leading}>{leading}</span>}
      <div className={styles.content}>
        <span className={styles.titleRow}>
          <span
            className={[styles.itemTitle, wrapTitle ? styles.wrap : ''].join(' ')}
            title={typeof title === 'string' ? title : undefined}
          >
            {title}
          </span>
          {titleAside}
        </span>
        {parts.length > 0 && (
          <span className={styles.meta}>
            {parts.map((p, i) => (
              // Parts are positional (date, source, …) and never reorder.
              <Fragment key={i}>
                {i > 0 && <span className={styles.dot} aria-hidden="true">•</span>}
                {p}
              </Fragment>
            ))}
          </span>
        )}
        {children}
      </div>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </div>
  );
}

/** 1px divider between groups of header actions (a dropdown, then icon buttons). */
export function PanelSectionDivider() {
  return <span className={styles.divider} aria-hidden="true" />;
}

/** "View N More" / "View Less" under a PanelSection list. Renders nothing when nothing is hidden. */
export function PanelSectionMore({ expanded, hiddenCount, onToggle }) {
  if (hiddenCount <= 0) return null;
  return (
    <Button
      variant="ghost"
      size="S"
      trailingIcon={expanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
      className={styles.more}
      onClick={onToggle}
    >
      {expanded ? 'View Less' : `View ${hiddenCount} More`}
    </Button>
  );
}
