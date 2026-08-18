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
    showRole: { control: 'boolean' },
    unassigned: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['M', 'S'] },
    avatarOnly: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export const Playground = {
  args: {
    name: 'Deborah Hintz',
    initials: 'DH',
    role: 'Support team',
    unassigned: false,
    avatarOnly: false,
    showRole: false,
    disabled: false,
    size: "M"
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

// Same value for `role` is passed, but `showRole={false}` hides the
// sub-line — matches the "role toggle off" state in Storybook controls.
export const AssignedRoleHidden = {
  name: 'Assigned · role hidden',
  args: {
    name: 'Deborah Hintz',
    initials: 'DH',
    role: 'Support team',
    showRole: false,
    unassigned: false,
    avatarOnly: false,
    disabled: false
  },
};

export const Unassigned = {
  args: { unassigned: true },
};

// ── Size + state matrix — mirrors Figma Fold-Pixel-1.0 node 8629:178 ────

export const SizeSmall = {
  name: 'Size · S',
  args: { name: 'Deborah Hintz', initials: 'DH', role: 'Support team', size: 'S' },
};

export const AvatarOnly = {
  name: 'Avatar only',
  args: { name: 'Deborah Hintz', initials: 'DH', avatarOnly: true },
};

export const AvatarOnlyUnassigned = {
  name: 'Avatar only · unassigned',
  args: { unassigned: true, avatarOnly: true },
};

export const Disabled = {
  args: { name: 'Deborah Hintz', initials: 'DH', role: 'Support team', disabled: true },
};

export const DisabledUnassigned = {
  name: 'Disabled · unassigned',
  args: { unassigned: true, disabled: true },
};

// Avatar-only unassigned matrix (default / hover / disabled) — Figma
// Fold-Pixel-1.0 node 8629:419.
export const AvatarOnlyUnassignedDisabled = {
  name: 'Avatar only · unassigned · disabled',
  args: { unassigned: true, avatarOnly: true, disabled: true },
};
