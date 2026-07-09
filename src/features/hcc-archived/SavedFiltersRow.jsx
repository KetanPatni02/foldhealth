import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icon/Icon';
import { useAppStore } from '../../store/useAppStore';
import styles from './SavedFiltersRow.module.css';

/**
 * Horizontal strip of saved filter sets, sitting between the FilterChipBar and
 * the worklist table. Click a saved chip to apply it; the dots menu offers
 * rename/delete. When no filters are saved, the row collapses to a single
 * "no saved filters yet" hint.
 *
 * Props:
 *  - onRename (fn(saved))  Open the RenameFilterDialog with the given record.
 */
export function SavedFiltersRow({ onRename }) {
  const saved = useAppStore(s => s.hccSavedFilters);
  const activeId = useAppStore(s => s.hccActiveSavedId);
  const apply = useAppStore(s => s.applyHccSavedFilter);
  const remove = useAppStore(s => s.deleteHccSavedFilter);

  const [menu, setMenu] = useState(null); // { id, rect } | null

  if (!saved.length) return null;

  return (
    <div className={styles.bar}>
      <span className={styles.label}>Saved</span>
      <div className={styles.chips}>
        {saved.map((sf) => {
          const active = activeId === sf.id;
          return (
            <span
              key={sf.id}
              className={[styles.chip, active ? styles.chipActive : ''].join(' ')}
            >
              <button
                type="button"
                className={styles.chipLabel}
                onClick={() => apply(sf.id)}
              >
                {sf.name}
              </button>
              <button
                type="button"
                className={styles.dots}
                aria-label={`Manage ${sf.name}`}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMenu({ id: sf.id, rect });
                }}
              >
                <Icon name="solar:menu-dots-bold" size={12} color="var(--neutral-300)" />
              </button>
            </span>
          );
        })}
      </div>

      {menu && (
        <DotsMenu
          anchorRect={menu.rect}
          onClose={() => setMenu(null)}
          onRename={() => {
            const sf = saved.find(x => x.id === menu.id);
            setMenu(null);
            if (sf) onRename?.(sf);
          }}
          onDelete={() => { remove(menu.id); setMenu(null); }}
        />
      )}
    </div>
  );
}

function DotsMenu({ anchorRect, onClose, onRename, onDelete }) {
  const top = anchorRect.top;
  const left = Math.min(anchorRect.right + 6, window.innerWidth - 170);
  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div
        className={styles.menu}
        style={{ top, left }}
        onClick={(e) => e.stopPropagation()}
        role="menu"
      >
        <button type="button" className={styles.menuItem} onClick={onRename}>
          <Icon name="solar:pen-linear" size={14} color="var(--neutral-400)" />
          <span>Edit Name</span>
        </button>
        <button type="button" className={[styles.menuItem, styles.menuItemDanger].join(' ')} onClick={onDelete}>
          <Icon name="solar:trash-bin-trash-linear" size={14} color="var(--status-error)" />
          <span>Delete</span>
        </button>
      </div>
    </>,
    document.body,
  );
}
