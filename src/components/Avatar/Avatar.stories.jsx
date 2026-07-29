import { Avatar } from './Avatar';

export default {
  title: 'Core/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A round or square identity chip — shows a person\'s initials in a tinted background whose color scheme is picked by `variant` (patient / agent / provider / assignee). Used for patient avatars, assignee cells, comment authors, and any place a person needs to be identified at a glance.',
      },
    },
  },
  argTypes: {
    initials: { control: 'text' },
    variant: { control: 'select', options: ['patient', 'agent', 'provider', 'assignee'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export const Playground = {
  args: { variant: 'patient', initials: 'AB', size: 'md' },
};
