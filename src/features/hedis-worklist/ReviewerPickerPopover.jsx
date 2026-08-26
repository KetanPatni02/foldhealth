import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import { Avatar } from '../../components/Avatar/Avatar';
import { Button } from '../../components/Button/Button';
import styles from './ReviewerPickerPopover.module.css';

/**
 * ReviewerPickerPopover — "Send for Review" reviewer chooser.
 *
 * Reuses the platformUsers pattern already implemented for the Care Gap
 * Drawer's assignee menu (title + search + Avatar list + click-away).
 * Rendered via createPortal so the escape / overlay handling works even
 * from inside the deeply nested Clinical Note left workspace.
 */
export function ReviewerPickerPopover({ open, onClose, onConfirm }) {
  const platformUsers = useAppStore(s => s.platformUsers);
  const fetchPlatformUsers = useAppStore(s => s.fetchPlatformUsers);
  useEffect(() => { if (open) fetchPlatformUsers(); }, [open, fetchPlatformUsers]);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  useEffect(() => { if (!open) { setQuery(''); setSelected(null); } }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return platformUsers || [];
    return (platformUsers || []).filter(u => u.name.toLowerCase().includes(q));
  }, [platformUsers, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <>
      <div aria-hidden="true" className={styles.overlay} onClick={onClose} />
      <div className={styles.card} role="dialog" aria-modal="true" aria-label="Send for review">
        <div className={styles.head}>
          <span className={styles.title}>Send for Review</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <Icon name="solar:close-circle-linear" size={18} color="var(--neutral-300)" />
          </button>
        </div>
        <div className={styles.searchRow}>
          <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-300)" />
          <input
            aria-label="Search reviewers"
            autoFocus
            type="text"
            className={styles.searchInput}
            placeholder="Search users…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className={styles.list}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>{query ? 'No users match your search.' : 'No users found.'}</div>
          ) : filtered.map(u => (
            <button
              key={u.id}
              type="button"
              className={`${styles.item} ${selected?.id === u.id ? styles.itemActive : ''}`}
              onClick={() => setSelected(u)}
            >
              <Avatar variant="assignee" initials={u.initials} />
              <span className={styles.itemName}>{u.name}</span>
              {selected?.id === u.id && (
                <Icon name="solar:check-read-linear" size={14} color="var(--primary-300)" />
              )}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" size="M" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="M"
            disabled={!selected}
            onClick={() => onConfirm?.(selected)}
          >
            Send for Review
          </Button>
        </div>
      </div>
    </>,
    document.body,
  );
}
