import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { DestructiveDialog } from './DestructiveDialog';
import { Button } from '../Button/Button';

export default {
  title: 'Overlays/Modal',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Two flavors of centered modal dialog: `ConfirmDialog` (icon + title + description + Confirm/Cancel, tokenized variant colors) and `DestructiveDialog` (red-styled shortcut for irreversible actions).',
      },
    },
  },
  argTypes: {
    dialog: {
      control: 'select',
      options: ['confirm', 'destructive'],
      description: 'Which modal component to render: ConfirmDialog or DestructiveDialog.',
    },
    icon: {
      control: 'text',
      description: 'Solar icon name shown in the header (ConfirmDialog only).',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'solar:danger-triangle-linear' } },
    },
    iconColor: {
      control: 'color',
      description: 'CSS color for the icon (ConfirmDialog only).',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'var(--status-error)' } },
    },
    title: {
      control: 'text',
      description: 'Dialog heading.',
      table: { type: { summary: 'string' } },
    },
    description: {
      control: 'text',
      description: 'Supporting body copy under the title.',
      table: { type: { summary: 'string' } },
    },
    confirmLabel: {
      control: 'text',
      description: 'Label for the primary/destructive button.',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'Delete' } },
    },
    cancelLabel: {
      control: 'text',
      description: 'Label for the cancel button.',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'Cancel' } },
    },
    variant: {
      control: 'select',
      options: ['error', 'success', 'warning', 'info'],
      description: 'Colors the confirm button + default icon (ConfirmDialog only).',
      table: { type: { summary: "'error' | 'success' | 'warning' | 'info'" }, defaultValue: { summary: 'error' } },
    },
    loading: {
      control: 'boolean',
      description: 'Disables Confirm and shows a busy state while an async action is pending.',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    onConfirm: {
      action: 'onConfirm',
      description: 'Fires when the primary/destructive button is clicked.',
      table: { type: { summary: '() => void' } },
    },
    onCancel: {
      action: 'onCancel',
      description: 'Fires when Cancel or the overlay is clicked.',
      table: { type: { summary: '() => void' } },
    },
  },
};

const centerStage = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 };

function DialogWrapper({ dialog, ...props }) {
  const [open, setOpen] = useState(false);
  const Component = dialog === 'destructive' ? DestructiveDialog : ConfirmDialog;
  return (
    <div style={centerStage}>
      <Button
        variant={dialog === 'destructive' ? 'danger' : 'secondary'}
        onClick={() => setOpen(true)}
      >
        Open {dialog === 'destructive' ? 'DestructiveDialog' : 'ConfirmDialog'}
      </Button>
      {open && <Component {...props} onConfirm={() => setOpen(false)} onCancel={() => setOpen(false)} />}
    </div>
  );
}

export const Playground = {
  render: (args) => <DialogWrapper {...args} />,
  args: {
    dialog: 'confirm',
    title: 'Delete this DOS?',
    description: 'This will remove the DOS row and all associated ICDs.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    variant: 'error',
  },
};
