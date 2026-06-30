import { useAppStore } from '../../../store/useAppStore';
import { MenuPopover } from '../../../components/Popover/MenuPopover';

/**
 * UploadMenuPopover — small dropdown menu anchored under the worklist's
 * "Upload Document" toolbar button. Shares chrome with the row-level
 * actions menu via the shared MenuPopover primitive so every popover in
 * the app reads as the same component.
 *
 * Each item starts a fresh upload session and jumps to the corresponding
 * phase, skipping the chooser entirely:
 *   - New Record Manually    → `single` (manual encounter form)
 *   - Extract Record from Doc → `picker` (dropzone + queue)
 *   - Open SFTP Server        → `sftp`   (SFTP path + simulate trigger)
 */
const ITEMS = [
  { key: 'single', icon: 'solar:document-add-linear',         label: 'New Record Manually' },
  { key: 'picker', icon: 'solar:upload-minimalistic-linear',  label: 'Extract Record from Document' },
  { key: 'sftp',   icon: 'solar:square-top-down-linear',      label: 'Open SFTP Server' },
];

export function UploadMenuPopover({ onClose, anchorRef }) {
  const startHccUpload    = useAppStore(s => s.startHccUpload);
  const setHccUploadPhase = useAppStore(s => s.setHccUploadPhase);

  const pick = (phase) => {
    startHccUpload?.(null);
    setHccUploadPhase?.(phase);
  };

  return (
    <MenuPopover
      anchorRef={anchorRef}
      items={ITEMS}
      ariaLabel="Add Records"
      width={240}
      align="right"
      onSelect={pick}
      onClose={onClose}
    />
  );
}
