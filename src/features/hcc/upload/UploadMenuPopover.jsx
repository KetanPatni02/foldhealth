import { useEffect, useRef } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { useAppStore } from '../../../store/useAppStore';
import styles from './UploadMenuPopover.module.css';

/**
 * UploadMenuPopover — small dropdown menu anchored under the
 * worklist's "Upload Document" toolbar button. Replaces the 3-card
 * chooser drawer with a lighter popover per Figma 280:114645.
 *
 * Each item starts a fresh upload session and jumps to the
 * corresponding phase, skipping the chooser entirely:
 *   - New Record Manually    → `single` (manual encounter form)
 *   - Extract Record from Doc → `picker` (dropzone + queue)
 *   - Open SFTP Server        → `sftp`   (SFTP path + simulate trigger)
 *
 * Click-outside dismisses; the parent controls visibility.
 */
const ITEMS = [
  { id: 'single', icon: 'solar:document-add-linear',         label: 'New Record Manually' },
  { id: 'picker', icon: 'solar:upload-square-linear',        label: 'Extract Record from Document' },
  { id: 'sftp',   icon: 'solar:square-top-down-linear',      label: 'Open SFTP Server' },
];

export function UploadMenuPopover({ onClose, anchorRef }) {
  const ref = useRef(null);
  const startHccUpload    = useAppStore(s => s.startHccUpload);
  const setHccUploadPhase = useAppStore(s => s.setHccUploadPhase);

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return;
      onClose?.();
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose, anchorRef]);

  const pick = (phase) => {
    startHccUpload?.(null);
    setHccUploadPhase?.(phase);
    onClose?.();
  };

  return (
    <div ref={ref} className={styles.popover} role="menu" aria-label="Add Records">
      {ITEMS.map(item => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          className={styles.item}
          onClick={() => pick(item.id)}
        >
          <Icon name={item.icon} size={16} color="var(--neutral-400)" />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
