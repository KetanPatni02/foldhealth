import { EmptyState } from './EmptyState';

export default {
  title: 'Feedback/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Zero-state placeholder — icon, title, supporting copy, optional call-to-action.',
      },
    },
  },
  argTypes: {
    icon: {
      control: 'text',
      description: 'Solar icon name',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'solar:inbox-line-bold' } },
    },
    title: {
      control: 'text',
      description: 'Heading text',
      table: { type: { summary: 'string' } },
    },
    description: {
      control: 'text',
      description: 'Supporting description',
      table: { type: { summary: 'string' } },
    },
    actionLabel: {
      control: 'text',
      description: 'CTA button label (button hidden when empty)',
      table: { type: { summary: 'string' } },
    },
    onAction: {
      action: 'onAction',
      description: 'CTA click handler (button hidden when omitted)',
      table: { type: { summary: '() => void' } },
    },
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
