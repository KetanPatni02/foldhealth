import { EmptyState } from './EmptyState';

export default {
  title: 'Feedback/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: 'text',
      description: 'Solar icon name (defaults to solar:inbox-line-bold)',
    },
    title: { control: 'text', description: 'Heading text' },
    description: { control: 'text', description: 'Supporting description' },
    actionLabel: { control: 'text', description: 'CTA button label (button hidden when empty)' },
    onAction: { action: 'onAction', description: 'CTA click handler (button hidden when omitted)' },
  },
};

export const Playground = {
  args: {
    icon: 'solar:inbox-line-bold',
    title: 'Nothing here yet',
    description: 'Items will appear here once available.',
    actionLabel: 'Create item',
  },
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 6 }}>Default</div>
        <EmptyState />
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 6 }}>Custom copy</div>
        <EmptyState
          icon="solar:document-add-linear"
          title="No patients yet"
          description="Once patients are enrolled you'll see them listed here."
        />
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 6 }}>With action</div>
        <EmptyState
          icon="solar:users-group-rounded-linear"
          title="No members assigned"
          description="Assign a coder to start reviewing this queue."
          actionLabel="Assign member"
          onAction={() => {}}
        />
      </div>
    </div>
  ),
};
