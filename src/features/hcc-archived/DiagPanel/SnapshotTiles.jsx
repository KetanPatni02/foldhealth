import { Icon } from '../../../components/Icon/Icon';
import styles from './SnapshotTiles.module.css';

/**
 * SnapshotTiles — collapsible row of 4 tiles showing Open / Suspect / Recapture
 * / Other gap counts. Each tile is click-to-filter. Mirrors the prototype's
 * "Patient Gap Snapshot" section.
 *
 * Props:
 *  - counts   ({ open, suspect, recapture, other })  Totals to render.
 *  - filter   (null | 'Open' | 'Suspect' | 'Recapture' | 'Other')
 *  - onFilter (fn(filter|null))   Called with the toggled filter.
 *  - open     (boolean)           Collapsed vs expanded state.
 *  - onToggle (fn(boolean))       Toggle collapsed.
 */
export function SnapshotTiles({ counts, filter, onFilter, open, onToggle }) {
  const cards = [
    { key: 'Open',      label: 'Open Gaps', count: counts.open      },
    { key: 'Suspect',   label: 'Suspect',   count: counts.suspect   },
    { key: 'Recapture', label: 'Recapture', count: counts.recapture },
    { key: 'Other',     label: 'Other',     count: counts.other     },
  ];

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.header}
        onClick={() => onToggle(!open)}
      >
        <span className={styles.title}>Patient Summary</span>

        {!open && (
          <span className={styles.collapsedCount}>
            <span className={styles.collapsedNum}>{counts.open}</span>
            <span className={styles.collapsedLabel}>Open</span>
          </span>
        )}
        {open && filter && (
          <span
            className={styles.clearChip}
            onClick={(e) => { e.stopPropagation(); onFilter(null); }}
            role="button"
            aria-label="Clear snapshot filter"
          >
            <Icon name="solar:close-linear" size={12} color="var(--neutral-300)" />
            <span>Clear</span>
          </span>
        )}
        <Icon
          name={open ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'}
          size={12}
          color="var(--neutral-300)"
        />
      </button>

      {open && (
        <div className={styles.tiles}>
          {cards.map((card) => {
            const active = filter === card.key;
            return (
              <button
                key={card.key}
                type="button"
                className={[
                  styles.tile,
                  styles[`tile_${card.key}`],
                  active ? styles.tileActive : '',
                ].join(' ')}
                onClick={() => onFilter(filter === card.key ? null : card.key)}
              >
                <span className={styles.tileLabel}>{card.label}</span>
                <span className={styles.tileSep} aria-hidden="true">·</span>
                <span className={styles.tileCount}>{card.count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
