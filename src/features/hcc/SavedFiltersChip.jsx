import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icon/Icon';
import { useAppStore } from '../../store/useAppStore';
import { FilterNameDialog } from './FilterNameDialog';
import styles from './DueDateChip.module.css';

/**
 * Top-bar "Saved Filters" dropdown (Paper 21UY). Sole surface for managing
 * saved views on this worklist now that the SubNav's Saved Filters section
 * has been removed: applies a view on click, filters the list with a search
 * box, and exposes Rename / Delete per row via a ⋯ menu.
 */
export function SavedFiltersChip() {
  const savedFilters = useAppStore(s => s.savedFiltersByList.HCC || []);
  const activeId = useAppStore(s => s.activeSavedIdByList.HCC || null);
  const applyHccSavedFilter = useAppStore(s => s.applyHccSavedFilter);
  const clearHccFilters = useAppStore(s => s.clearHccFilters);
  const renameSavedFilter = useAppStore(s => s.renameSavedFilter);
  const deleteSavedFilter = useAppStore(s => s.deleteSavedFilter);

  const triggerRef = useRef(null);
  const [pos, setPos] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null); // { id, name } | null

  const active = savedFilters.find(f => f.id === activeId) || null;

  const open = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 6, left: rect.left });
  };
  const close = () => setPos(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={[styles.chip, active ? styles.chipActive : ''].join(' ')}
        onClick={pos ? close : open}
      >
        <span>{active ? active.name : 'Saved Filters'}</span>
        <Icon
          name="solar:alt-arrow-down-linear"
          size={12}
          color={active ? 'var(--primary-300)' : 'var(--neutral-300)'}
        />
      </button>
      {pos && (
        <SavedFiltersPopover
          pos={pos}
          savedFilters={savedFilters}
          activeId={activeId}
          onSelect={(id) => { applyHccSavedFilter(id); close(); }}
          onClear={() => { clearHccFilters(); close(); }}
          onRename={(f) => setRenameTarget({ id: f.id, name: f.name })}
          onDelete={(f) => deleteSavedFilter('HCC', f.id)}
          onClose={close}
        />
      )}
      <FilterNameDialog
        open={!!renameTarget}
        title="Rename Filter"
        submitLabel="Save"
        initialName={renameTarget?.name || ''}
        onSubmit={(name) => {
          renameSavedFilter('HCC', renameTarget.id, name);
          setRenameTarget(null);
        }}
        onCancel={() => setRenameTarget(null)}
      />
    </>
  );
}

function SavedFiltersPopover({ pos, savedFilters, activeId, onSelect, onClear, onRename, onDelete, onClose }) {
  const [query, setQuery] = useState('');
  // Per-row ⋯ menu — anchored to the button's rect so it can escape the
  // popover without needing an absolute position inside the list.
  const [rowMenu, setRowMenu] = useState(null); // { id, rect } | null

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return savedFilters;
    return savedFilters.filter(f => f.name.toLowerCase().includes(q));
  }, [query, savedFilters]);

  const menuTarget = rowMenu ? savedFilters.find(f => f.id === rowMenu.id) : null;

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div
        className={[styles.popover, styles.popoverWide].join(' ')}
        style={{ top: pos.top, left: pos.left }}
      >
        <div className={styles.popHeader}>Apply Saved Filters</div>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>
            <Icon name="solar:magnifer-linear" size={14} />
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className={styles.optionList}>
          {savedFilters.length === 0 && (
            <div className={styles.emptyState}>No saved filters yet</div>
          )}
          {savedFilters.length > 0 && filtered.length === 0 && (
            <div className={styles.emptyState}>No matches</div>
          )}
          {filtered.map((f) => (
            <div
              key={f.id}
              className={[
                styles.optionRow,
                activeId === f.id ? styles.optionRowActive : '',
              ].filter(Boolean).join(' ')}
            >
              <button
                type="button"
                className={styles.optionMain}
                onClick={() => onSelect(f.id)}
              >
                <span className={styles.optionLabel}>{f.name}</span>
              </button>
              <button
                type="button"
                aria-label={`Manage ${f.name}`}
                className={styles.rowMenuBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setRowMenu({ id: f.id, rect });
                }}
              >
                <Icon name="solar:menu-dots-bold" size={14} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className={styles.reset} onClick={onClear}>
          Clear Selection
        </button>
      </div>

      {rowMenu && menuTarget && createPortal(
        <>
          <div
            className={styles.rowMenuOverlay}
            onClick={() => setRowMenu(null)}
          />
          <div
            className={styles.rowMenu}
            style={{
              top: rowMenu.rect.bottom + 4,
              left: Math.min(rowMenu.rect.right + 4, window.innerWidth - 170),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.rowMenuItem}
              onClick={() => {
                onRename(menuTarget);
                setRowMenu(null);
                onClose();
              }}
            >
              <Icon name="solar:pen-linear" size={14} color="var(--neutral-400)" />
              Edit Name
            </button>
            <button
              type="button"
              className={[styles.rowMenuItem, styles.rowMenuItemDanger].join(' ')}
              onClick={() => {
                onDelete(menuTarget);
                setRowMenu(null);
              }}
            >
              <Icon name="solar:trash-bin-trash-linear" size={14} color="var(--status-error)" />
              Delete
            </button>
          </div>
        </>,
        document.body,
      )}
    </>,
    document.body,
  );
}
