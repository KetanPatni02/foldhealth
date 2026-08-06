import { AvatarGroup } from './AvatarGroup';

export default {
  title: 'Core/AvatarGroup',
  component: AvatarGroup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'An overlapping stack of Avatar tiles. Renders up to `max` tiles; anything beyond collapses into a neutral `+N` chip that opens a popover listing every member on hover or focus. Matches Figma Fold-Pixel-1.0 node 25:12371.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['patient', 'provider'] },
    size: { control: 'select', options: ['XS', 'S', 'M', 'L', 'XL'] },
    max: { control: { type: 'number', min: 1, max: 8 } },
  },
};

const THREE = [
  { id: '1', initials: 'AB', name: 'Alice Bell' },
  { id: '2', initials: 'CD', name: 'Chris Doyle' },
  { id: '3', initials: 'EF', name: 'Erin Ford' },
];

const FIVE = [
  ...THREE,
  { id: '4', initials: 'GH', name: 'Grace Hunt' },
  { id: '5', initials: 'JK', name: 'Jamal Kim' },
];

export const Playground = {
  args: { people: THREE, variant: 'patient', size: 'M', max: 3 },
};

export const WithOverflow = {
  args: { people: FIVE, variant: 'patient', size: 'M', max: 3 },
};

export const Provider = {
  args: { people: FIVE, variant: 'provider', size: 'M', max: 3 },
};

export const AllSizes = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {['XS', 'S', 'M', 'L', 'XL'].map((s) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ width: 32, fontSize: 12, color: 'var(--neutral-300)' }}>{s}</span>
          <AvatarGroup people={FIVE} size={s} variant="patient" max={3} />
          <AvatarGroup people={FIVE} size={s} variant="staff" max={3} />
        </div>
      ))}
    </div>
  ),
};
