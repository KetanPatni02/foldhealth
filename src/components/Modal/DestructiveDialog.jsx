import { ConfirmDialog } from './ConfirmDialog';

/**
 * DestructiveDialog — system-wide confirmation for destructive actions
 * (delete, discard, revoke, archive-with-loss). Wraps `ConfirmDialog` with
 * the destructive defaults pre-applied: red seal icon at top, error tone on
 * the primary button, centered title + supporting copy.
 *
 * Matches Figma 678:181477 (Jan-Feb 2026 file). Reuse this everywhere a
 * "Delete X?" / "Discard changes?" prompt is needed so the look and the
 * keyboard/escape behavior stay identical across the app.
 *
 * @param {object} props
 * @param {string} props.title         – e.g. "Delete Team?"
 * @param {string} props.description   – Single sentence explaining the impact.
 * @param {string} props.confirmLabel  – Defaults to "Delete".
 * @param {string} props.cancelLabel   – Defaults to "Cancel".
 * @param {function} props.onConfirm   – Fires when the user confirms.
 * @param {function} props.onCancel    – Fires on Cancel / overlay / Escape.
 * @param {boolean} props.loading      – Disable both buttons while a request
 *                                       is in flight.
 */
export function DestructiveDialog({
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
}) {
  return (
    <ConfirmDialog
      icon="solar:danger-circle-bold"
      iconColor="var(--status-error)"
      variant="error"
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={onConfirm}
      onCancel={onCancel}
      loading={loading}
    />
  );
}
