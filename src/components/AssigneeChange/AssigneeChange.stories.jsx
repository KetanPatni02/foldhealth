import { AssigneeChange } from './AssigneeChange';

export default {
  title: 'Data/AssigneeChange',
  component: AssigneeChange,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Worklist row cell for assigning / re-assigning a user. Assigned state = 24px provider avatar + name + optional role, fixed 140px width with name truncation. Unassigned state = outlined person slot + "Assign User", width hugs the content. Hover fills the pill with `--neutral-50` and reveals a chevron.',
      },
    },
  },
  argTypes: {
    name: { control: 'text' },
    initials: { control: 'text' },
    role: { control: 'text' },
    unassigned: { control: 'boolean' },
  },
};

export const Playground = {
  args: {
    name: 'Deborah Hintz',
    initials: 'DH',
    role: 'Support team',
    unassigned: false,
  },
};

export const Assigned = {
  args: { name: 'Deborah Hintz', initials: 'DH', role: 'Support team' },
};

export const AssignedLongName = {
  name: 'Assigned · truncated name',
  args: {
    name: 'Dr. Shravank Krishnamurthy Montgomery-Patel',
    initials: 'SM',
    role: 'Support team',
  },
};

export const AssignedNoRole = {
  name: 'Assigned · name only',
  args: { name: 'Daniel Arsulo', initials: 'DA' },
};

export const Unassigned = {
  args: { unassigned: true },
};
