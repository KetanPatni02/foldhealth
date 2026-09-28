import { useRef, useState } from 'react';
import { Icon } from '../Icon/Icon';
import { MenuPopover } from '../MenuPopover/MenuPopover';
import { formatFileSize } from './formatFileSize';
import styles from './AttachmentCard.module.css';


const ICONS = {
  pdf: 'custom:pdf-file',
  image: 'solar:gallery-linear',
  doc: 'solar:document-text-linear',
};
const kindOf = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
  return 'doc';
};

/**
 * Fold Health AttachmentCard: a file attached to a message, as a mail client
 * shows it: its type's icon, the name (truncated), the size, and a ▾ menu
 * for Preview, Download and Remove (each only when handled).
 *
 * @param {object}   props
 * @param {string}   props.name
 * @param {number}   [props.size]       – In bytes
 * @param {string}   [props.meta]       – Instead of the size (e.g. "From Documents")
 * @param {function} [props.onPreview]
 * @param {function} [props.onDownload]
 * @param {function} [props.onRemove]
 */
export function AttachmentCard({ name, size, meta, onPreview, onDownload, onRemove }) {
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const items = [
    onPreview && { key: 'preview', label: 'Preview', icon: 'solar:eye-linear' },
    onDownload && { key: 'download', label: 'Download', icon: 'solar:download-minimalistic-linear' },
    onRemove && { key: 'remove', label: 'Remove', icon: 'solar:trash-bin-trash-linear', danger: true },
  ].filter(Boolean);
  const run = { preview: onPreview, download: onDownload, remove: onRemove };
  return (
    <div className={styles.card}>
      <span className={styles.icon} aria-hidden="true">
        <Icon name={ICONS[kindOf(name)]} size={24} color="var(--neutral-300)" />
      </span>
      <span className={styles.text}>
        <span className={styles.name} title={name}>{name}</span>
        <span className={styles.meta}>{meta ?? formatFileSize(size)}</span>
      </span>
      {items.length > 0 && (
        <span ref={menuRef} className={styles.menuAnchor}>
          <button
            type="button"
            className={styles.menuButton}
            aria-label={`Options for ${name}`}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen(o => !o)}
          >
            <Icon name="solar:alt-arrow-down-linear" size={16} color="currentColor" />
          </button>
        </span>
      )}
      {open && (
        <MenuPopover
          anchorRef={menuRef}
          ariaLabel={`Options for ${name}`}
          items={items}
          width={160}
          onSelect={(key) => { setOpen(false); run[key]?.(); }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
