import { useState } from 'react';
import { ReasonDialog } from './ReasonDialog';
import { Button } from '../Button/Button';

export default {
  title: 'Overlays/ReasonDialog',
  component: ReasonDialog,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    decision: { control: 'select', options: ['pass', 'fail'] },
    standardReasons: { control: 'object', description: 'Preset reason strings' },
  },
};

const REASONS = ['Illegible', 'Missing signature', 'Wrong DOS', 'Missing provider', 'Other'];

function Wrapper(props) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ padding: 24 }}>
      <Button variant="danger" onClick={() => setOpen(true)}>Open ReasonDialog</Button>
      {open && (
        <ReasonDialog
          {...props}
          onCancel={() => setOpen(false)}
          onSubmit={() => setOpen(false)}
        />
      )}
    </div>
  );
}

export const Playground = {
  render: (args) => <Wrapper {...args} />,
  args: { title: 'Why is this document failing?', description: 'Pick the closest reason. "Other" requires a note.', decision: 'fail', standardReasons: REASONS },
};
