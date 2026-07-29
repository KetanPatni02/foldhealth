import { Textarea } from './Textarea';

export default {
  title: 'Forms/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: { component: 'Multi-line text input. Same variants and tokens as `Input`; use for notes, comments, and longer free-text fields.' },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'error'],
      description: 'Visual state — error swaps border/background to the error tokens.',
      table: { type: { summary: "'default' | 'error'" }, defaultValue: { summary: 'default' } },
    },
    rows: {
      control: { type: 'number', min: 1, max: 20 },
      description: 'Native textarea row count.',
      table: { type: { summary: 'number' }, defaultValue: { summary: '3' } },
    },
    placeholder: {
      control: 'text',
      description: 'Native textarea placeholder.',
      table: { type: { summary: 'string' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Disable interaction.',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    defaultValue: {
      control: 'text',
      description: 'Initial value for uncontrolled use.',
      table: { type: { summary: 'string' } },
    },
  },
};

export const Playground = {
  args: {
    variant: 'default',
    rows: 3,
    placeholder: 'Add a note…',
    disabled: false,
    defaultValue: '',
  },
};
