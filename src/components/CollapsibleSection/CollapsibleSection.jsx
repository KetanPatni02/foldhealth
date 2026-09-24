import { useState } from 'react';
import { Icon } from '../Icon/Icon';
import { DownChevronIcon } from '../Icon/DownChevronIcon';
import styles from './CollapsibleSection.module.css';

/**
 * CollapsibleSection: a bordered accordion card: an icon + title header that
 * folds the body away, with the height animating open and shut.
 *
 * First built for the Create Insurance Plan form's sections, and moved here so
 * other forms (the PAMI/Hx Social History drawer) share one implementation.
 *
 * @param {object}   props
 * @param {string}   [props.icon]           – Icon name, shown in primary-300
 * @param {string}   props.title
 * @param {boolean}  [props.defaultOpen=true]
 * @param {node}     props.children         – The section body
 */
export function CollapsibleSection({ icon, title, defaultOpen = true, children }) {
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  return (
    <div className={styles.card}>
      <button
        type="button"
        aria-expanded={!collapsed}
        className={`${styles.header} ${collapsed ? styles.collapsed : ''}`}
        onClick={() => setCollapsed(v => !v)}
      >
        {icon && <Icon name={icon} size={16} color="var(--primary-300)" />}
        <span className={styles.title}>{title}</span>
        <DownChevronIcon
          size={12}
          color="var(--neutral-300)"
          style={collapsed ? { transform: 'rotate(-90deg)' } : undefined}
        />
      </button>
      <div className={`${styles.collapseOuter} ${collapsed ? styles.collapsed : ''}`}>
        <div className={styles.collapseInner}>
          <div className={styles.body}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
