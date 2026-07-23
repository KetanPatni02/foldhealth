import { BulkBar } from './BulkBar';

export default {
  title: 'Composed/BulkBar',
  component: BulkBar,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    selectedIds: {
      control: 'object',
      description: 'Array of selected row IDs. Bar appears when length > 0.',
    },
    onClear: { action: 'onClear', description: 'Clear-all handler' },
    onChangeAssignee: { action: 'onChangeAssignee', description: 'Override default "Change Assignee" action' },
    actions: {
      control: 'object',
      description: 'Custom action buttons: [{ label, icon?, variant?, onClick }]. Replaces default cluster.',
    },
    moreActions: {
      control: 'object',
      description: 'Overflow menu items: [{ label, icon?, variant?, onClick }]. Only when `actions` also provided.',
    },
  },
};

// The bar is position: fixed at the bottom of the viewport — wrap in a
// spacer so it renders inside the story canvas.
const Stage = ({ children }) => (
  <div style={{ minHeight: 240, position: 'relative', padding: 24 }}>
    <p style={{ color: 'var(--neutral-300)', fontSize: 13 }}>
      BulkBar renders as a floating bar at the bottom of the viewport.
    </p>
    {children}
  </div>
);

export const Playground = {
  render: (args) => (
    <Stage>
      <BulkBar {...args} />
    </Stage>
  ),
  args: {
    selectedIds: ['pt-1', 'pt-2', 'pt-3'],
    onClear: () => {},
  },
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <Stage>
        <p style={{ color: 'var(--neutral-400)', fontSize: 13, marginBottom: 8 }}>
          Default: 3 selected, standard worklist actions.
        </p>
        <BulkBar selectedIds={['a', 'b', 'c']} onClear={() => {}} />
      </Stage>

      <Stage>
        <p style={{ color: 'var(--neutral-400)', fontSize: 13, marginBottom: 8 }}>
          Custom actions (SFTP-review style): Add to Worklist + Delete.
        </p>
        <BulkBar
          selectedIds={['a', 'b', 'c', 'd', 'e', 'f', 'g']}
          onClear={() => {}}
          actions={[
            { label: 'Add to Worklist', icon: 'solar:add-circle-linear', variant: 'primary', onClick: () => {} },
            { label: 'Delete', icon: 'solar:trash-bin-2-linear', variant: 'secondary', onClick: () => {} },
          ]}
        />
      </Stage>

      <Stage>
        <p style={{ color: 'var(--neutral-400)', fontSize: 13, marginBottom: 8 }}>
          Custom actions with overflow menu.
        </p>
        <BulkBar
          selectedIds={['a', 'b']}
          onClear={() => {}}
          actions={[
            { label: 'Approve', icon: 'solar:check-circle-linear', variant: 'primary', onClick: () => {} },
            { label: 'Reject', icon: 'solar:close-circle-linear', variant: 'secondary', onClick: () => {} },
          ]}
          moreActions={[
            { label: 'Missed Opportunity', icon: 'solar:danger-triangle-linear', onClick: () => {} },
            { label: 'Defer', icon: 'solar:clock-circle-linear', onClick: () => {} },
            { label: 'Delete', icon: 'solar:trash-bin-2-linear', variant: 'destructive', onClick: () => {} },
          ]}
        />
      </Stage>
    </div>
  ),
};
