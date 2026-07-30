import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './ShadcnAlertDialog';
import { Button } from '../Button/Button';

export default {
  title: 'shadcn/AlertDialog',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'shadcn/ui compound `AlertDialog` (Radix-backed) — modal dialog that requires the user to acknowledge or cancel. Compose: `AlertDialog` (root, open state), `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel`. Use the `example` control to flip between the composition patterns.',
      },
    },
  },
  argTypes: {
    example: {
      control: { type: 'select' },
      options: ['confirm', 'confirm-destructive', 'info'],
      description: 'Composition pattern: standard confirm, destructive confirm, or single-action notice.',
    },
  },
  args: { example: 'confirm' },
};

const EXAMPLES = {
  'confirm': {
    trigger: <Button variant="primary">Open Alert Dialog</Button>,
    title: 'Are you absolutely sure?',
    description:
      'This action cannot be undone. It will permanently remove the item and revoke any associated access.',
    footer: (
      <>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction>Continue</AlertDialogAction>
      </>
    ),
  },
  'confirm-destructive': {
    trigger: <Button variant="danger">Delete Account</Button>,
    title: 'Delete this account?',
    description:
      'All patient records, worklists, and history for this account will be permanently deleted. This cannot be reversed.',
    footer: (
      <>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction style={{ background: 'var(--danger-300)', color: 'white' }}>
          Delete
        </AlertDialogAction>
      </>
    ),
  },
  'info': {
    trigger: <Button variant="secondary">Show Notice</Button>,
    title: 'Session about to expire',
    description:
      'Your session will expire in 2 minutes. Save your work to avoid losing progress.',
    footer: <AlertDialogAction>Got it</AlertDialogAction>,
  },
};

function PlaygroundAlertDialog({ example }) {
  const [open, setOpen] = useState(false);
  const cfg = EXAMPLES[example] || EXAMPLES['confirm'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 }}>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>{cfg.trigger}</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{cfg.title}</AlertDialogTitle>
            <AlertDialogDescription>{cfg.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>{cfg.footer}</AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const Playground = { render: (args) => <PlaygroundAlertDialog {...args} /> };
