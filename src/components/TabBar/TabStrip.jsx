import { Icon } from '../Icon/Icon';
import styles from './TabStrip.module.css';

/**
 * TabStrip — the visual tab row used by the app's top-level TabBar and by
 * drawers that need the same tab pattern (Activity / Documents in the HCC
 * Activity History drawer, etc.). Just the pattern — no store wiring.
 *
 * Props:
 *  - items       {key, label, icon?}[]  — tab definitions.
 *  - activeKey   string                 — currently-selected key.
 *  - onChange    (key) => void          — called when a tab is clicked.
 *  - fullWidth   boolean (default true) — bleed to the drawer/container edges.
 */
export function TabStrip({ items, activeKey, onChange, fullWidth = true }) {
  return (
    <div className={[styles.tabBar, fullWidth ? styles.fullWidth : ''].filter(Boolean).join(' ')}>
      {items.map((it) => {
        const active = it.key === activeKey;
        return (
          <button
            key={it.key}
            type="button"
            className={[styles.tabItem, active ? styles.active : ''].filter(Boolean).join(' ')}
            onClick={() => onChange?.(it.key)}
          >
            {it.icon && (
              <Icon
                name={it.icon}
                size={14}
                color={active ? 'var(--primary-300)' : 'var(--neutral-300)'}
              />
            )}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
