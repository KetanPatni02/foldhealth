import { useEffect, useRef } from 'react';
import { Icon } from '../Icon/Icon';
import { useAppStore } from '../../store/useAppStore';
import styles from './NotificationsPopover.module.css';

/**
 * NotificationsPopover — bell-icon dropdown.
 *
 * Renders the notifications slice from the global store. Each entry has
 * a typed icon, title, body, and a relative-time stamp. Clicking an
 * entry runs its mapped action (e.g. re-opening the HCC upload drawer
 * at the review phase) and marks the entry read. A "Mark all as read"
 * footer link clears the unread badge in one tap.
 *
 * Anchor: positioned absolutely under the bell icon by the parent.
 * Click-outside closes via a document listener.
 */
export function NotificationsPopover({ onClose, anchorRef }) {
  const ref = useRef(null);
  const notifications = useAppStore(s => s.notifications) || [];
  const markRead = useAppStore(s => s.markNotificationRead);
  const markAllRead = useAppStore(s => s.markAllNotificationsRead);
  const expandHccUpload = useAppStore(s => s.expandHccUpload);
  const openHccSftpReview = useAppStore(s => s.openHccSftpReview);
  const setActivePage = useAppStore(s => s.setActivePage);
  const setActiveSubnavList = useAppStore(s => s.setActiveSubnavList);

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return;
      onClose?.();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [onClose, anchorRef]);

  const handleEntryClick = (n) => {
    markRead?.(n.id);
    if (n.action === 'openHccReview') {
      setActivePage?.('population');
      setActiveSubnavList?.('HCC');
      expandHccUpload?.();
    } else if (n.action === 'openSftpReview') {
      setActivePage?.('population');
      setActiveSubnavList?.('HCC');
      openHccSftpReview?.();
    }
    onClose?.();
  };

  return (
    <div ref={ref} className={styles.popover} role="dialog" aria-label="Notifications">
      <div className={styles.header}>
        <span className={styles.title}>Notifications</span>
        {notifications.some(n => !n.read) && (
          <button
            type="button"
            className={styles.markAll}
            onClick={() => markAllRead?.()}
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="solar:bell-off-linear" size={24} color="var(--neutral-200)" />
          <span>You're all caught up</span>
        </div>
      ) : (
        <div className={styles.list}>
          {notifications.map(n => (
            <button
              key={n.id}
              type="button"
              className={[styles.entry, n.read ? styles.entryRead : ''].join(' ')}
              onClick={() => handleEntryClick(n)}
            >
              <span className={styles.entryIcon}>
                <Icon
                  name={n.type === 'hcc.extraction_complete' ? 'solar:document-text-linear' : 'solar:bell-linear'}
                  size={16}
                  color="var(--primary-300)"
                />
              </span>
              <span className={styles.entryBody}>
                <span className={styles.entryTitle}>{n.title}</span>
                {n.body && <span className={styles.entrySub}>{n.body}</span>}
                <span className={styles.entryTime}>{relativeTime(n.ts)}</span>
              </span>
              {!n.read && <span className={styles.entryDot} aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
