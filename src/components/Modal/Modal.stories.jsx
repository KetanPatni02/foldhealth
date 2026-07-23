import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { DestructiveDialog } from './DestructiveDialog';
import { Button } from '../Button/Button';

export default {
  title: 'Overlays/Modal',
  tags: ['autodocs'],
};

function ConfirmWrapper(props) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ padding: 24 }}>
      <Button variant="secondary" onClick={() => setOpen(true)}>Open ConfirmDialog</Button>
      {open && <ConfirmDialog {...props} onConfirm={() => setOpen(false)} onCancel={() => setOpen(false)} />}
    </div>
  );
}

function DestructiveWrapper(props) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ padding: 24 }}>
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
