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

export const Patient = { args: { variant: 'patient', initials: 'AB' } };
export const Agent = { args: { variant: 'agent', initials: 'E' } };
export const Large = { args: { variant: 'patient', initials: 'JR', size: 'lg' } };

export const AllSizes = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Avatar variant="patient" initials="SM" size="sm" />
      <Avatar variant="patient" initials="MD" />
      <Avatar variant="patient" initials="LG" size="lg" />
    </div>
  ),
};
