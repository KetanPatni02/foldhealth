import { CloseButton } from './CloseButton';

export default {
  title: 'Core/CloseButton',
  component: CloseButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Square icon button used to dismiss drawers, dialogs, and popovers.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'number',
      description: 'Icon size in px.',
      table: { type: { summary: 'number' }, defaultValue: { summary: '18' } },
    },
    label: {
      control: 'text',
      description: 'Accessible label (aria-label) for the button.',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'Close' } },
    },
    className: {
      control: 'text',
      description: 'Extra class on the button element.',
      table: { type: { summary: 'string' } },
    },
    onClick: {
      action: 'onClick',
      description: 'Fires on click.',
      table: { type: { summary: '() => void' } },
    },
  },
};

export const Playground = { args: { size: 18, label: 'Close' } };
