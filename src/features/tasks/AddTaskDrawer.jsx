import { Drawer } from '../../components/Drawer/Drawer';
import { Button } from '../../components/Button/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { useAddTaskDrawer } from './useAddTaskDrawer';
import { AddTaskDrawerBody } from './AddTaskDrawerBody';

export function AddTaskDrawer({ onClose, defaultStatus, initialMember, onTaskCreated, extraFields, className }) {
  const drawer = useAddTaskDrawer({ defaultStatus, initialMember, onTaskCreated, extraFields });

  return (
    <>
      <Drawer
        title="Add Task"
        onClose={onClose}
        beforeClose={drawer.guardClose}
        className={className}
        headerRight={
          <Button variant="primary" size="L" disabled={!drawer.canSave} onClick={drawer.handleSave}>
            Save Task
          </Button>
        }
      >
        <AddTaskDrawerBody {...drawer} />
      </Drawer>
      {drawer.showCloseConfirm && (
        <ConfirmDialog
          icon="solar:danger-triangle-linear"
          iconColor="var(--status-warning)"
          title="Discard unsaved task?"
          description="You have unsaved changes. Closing now will discard them."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          variant="error"
          onConfirm={() => { drawer.setShowCloseConfirm(false); onClose(); }}
          onCancel={() => drawer.setShowCloseConfirm(false)}
        />
      )}
    </>
  );
}
