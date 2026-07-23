import { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './dialog';
import { Button } from '../Button/Button';

export default {
  title: 'shadcn/Dialog',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

function Playground_() {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="primary">Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when done.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--neutral-400)' }}>
              Name
              <input
                type="text"
                defaultValue="Jane Doe"
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 4,
                  padding: '6px 10px',
                  border: '0.5px solid var(--neutral-150)',
                  borderRadius: 4,
                  fontSize: 14,
                }}
              />
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button variant="primary">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Playground = { render: () => <Playground_ /> };

function Info_() {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary">What's new</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What's new in Fold</DialogTitle>
            <DialogDescription>
              A round-up of the latest changes across the worklist and drawers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="primary">Got it</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConfirmDestructive_() {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="danger">Discard changes</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              You have unsaved edits. Closing now will drop them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Keep editing</Button>
            </DialogClose>
            <Button variant="danger">Discard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Info = { render: () => <Info_ /> };
export const ConfirmDestructive = { render: () => <ConfirmDestructive_ /> };

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, padding: 24 }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 8 }}>
          Edit form
        </div>
        <Playground_ />
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 8 }}>
          Info — single action
        </div>
        <Info_ />
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 8 }}>
          Confirm — destructive
        </div>
        <ConfirmDestructive_ />
      </div>
    </div>
  ),
};
