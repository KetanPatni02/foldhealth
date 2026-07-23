import { Textarea } from './Textarea';

export default {
  title: 'Forms/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'error'],
      description: 'Visual state — error swaps border/background to the error tokens',
      table: { defaultValue: { summary: 'default' } },
    },
    rows: {
      control: { type: 'number', min: 1, max: 20 },
      description: 'Native textarea row count',
      table: { defaultValue: { summary: '3' } },
    },
    placeholder: {
      control: 'text',
      description: 'Native textarea placeholder',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable interaction',
      table: { defaultValue: { summary: 'false' } },
    },
    defaultValue: {
      control: 'text',
      description: 'Initial value for uncontrolled use',
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

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 420 }}>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Default</span>
        <Textarea placeholder="Type here…" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Filled — 5 rows</span>
        <Textarea rows={5} defaultValue={'Patient reports intermittent chest tightness.\nStarted after activity, resolves at rest.'} />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Error</span>
        <Textarea variant="error" defaultValue="Required field cannot be empty." />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Disabled</span>
        <Textarea disabled defaultValue="Locked note" />
      </div>
    </div>
  ),
};
