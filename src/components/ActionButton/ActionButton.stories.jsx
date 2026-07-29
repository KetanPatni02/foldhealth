import { ActionButton } from './ActionButton';

export default {
  title: 'Core/ActionButton',
  component: ActionButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A compact, square icon-only button — the workhorse of every toolbar, table row, and popover header in the app. Renders any Solar (or `custom:*`) icon in a bordered box that responds to hover and disabled states, and can carry a small badge (numeric count, orange notification dot, red status dot) or a dropdown chevron for menu triggers. Reach for it when a button needs just an icon and lives inside a dense control cluster — for anything with a label, use `Button` instead.',
      },
    },
  },
  argTypes: {
    icon: { control: 'text', description: 'Solar icon name' },
    size: { control: 'select', options: ['S', 'L', 'XL'], description: 'S=16px, L=20px, XL=32px icon' },
    state: { control: 'select', options: ['active', 'disabled', 'error'] },
    tooltip: { control: 'text' },
    notification: { control: 'boolean', description: 'Orange notification badge' },
    count: { control: 'text', description: 'Badge count text' },
    dot: { control: 'boolean', description: 'Red status dot' },
    chevron: { control: 'boolean', description: 'Dropdown chevron' },
    chevronOpen: { control: 'boolean' },
  },
};

export const Playground = {
  args: { icon: 'custom:filter', size: 'L', tooltip: 'Filter', notification: false, dot: false, chevron: false },
};
