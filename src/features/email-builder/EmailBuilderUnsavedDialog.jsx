import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';

export function EmailBuilderUnsavedDialog({
  unsavedCount, pendingClose, setPendingClose,
  closeEmailBuilder, setActivePage, setPendingNavTarget,
}) {
  if (!pendingClose) return null;

  return (
    <ConfirmDialog
      icon="solar:danger-triangle-linear"
      iconColor="var(--status-warning)"
      title="Unsaved changes"
      description={`You have ${unsavedCount} unsaved change${unsavedCount !== 1 ? 's' : ''}. Are you sure you want to ${pendingClose?.reason === 'nav' ? 'leave' : 'close'} without saving?`}
      confirmLabel={pendingClose?.reason === 'nav' ? 'Discard & Leave' : 'Discard & Close'}
      cancelLabel="Keep Editing"
      variant="error"
      onConfirm={() => {
        const target = pendingClose;
        setPendingClose(null);
        closeEmailBuilder();
        if (target?.reason === 'nav' && target.target) {
          setActivePage(target.target);
          setPendingNavTarget(null);
        }
      }}
      onCancel={() => {
        if (pendingClose?.reason === 'nav') setPendingNavTarget(null);
        setPendingClose(null);
      }}
    />
  );
}
