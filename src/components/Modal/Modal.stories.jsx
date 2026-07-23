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

function ConfirmWrapper(props) {
  const [open, setOpen] = useState(false);
  return (
    <div style={centerStage}>
      <Button variant="secondary" onClick={() => setOpen(true)}>Open ConfirmDialog</Button>
      {open && <ConfirmDialog {...props} onConfirm={() => setOpen(false)} onCancel={() => setOpen(false)} />}
    </div>
  );
}

function DestructiveWrapper(props) {
  const [open, setOpen] = useState(false);
  return (
    <div style={centerStage}>
      <Button variant="danger" onClick={() => setOpen(true)}>Open DestructiveDialog</Button>
      {open && <DestructiveDialog {...props} onConfirm={() => setOpen(false)} onCancel={() => setOpen(false)} />}
    </div>
  );
}

export const Confirm = {
  render: (args) => <ConfirmWrapper {...args} />,
  args: {
    title: 'Delete this DOS?',
    description: 'This will remove the DOS row and all associated ICDs.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    variant: 'error',
  },
};

export const ConfirmSuccessVariant = {
  render: (args) => <ConfirmWrapper {...args} />,
  args: {
    icon: 'solar:check-circle-linear',
    iconColor: 'var(--status-success)',
    title: 'Submit for review?',
    description: 'The record will be locked once submitted.',
    confirmLabel: 'Submit',
    variant: 'success',
  },
};

export const Destructive = {
  render: (args) => <DestructiveWrapper {...args} />,
  args: {
    title: 'Remove Jane Doe from the worklist?',
    description: 'This cannot be undone — the audit trail will retain the removal.',
    confirmLabel: 'Remove',
  },
};
