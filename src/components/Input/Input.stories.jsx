import { Input } from './Input';

export default {
  title: 'Forms/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: { component: 'Single-line text input built on the shared form tokens (32px height, 0.5px neutral-200 border, primary-300 focus).' },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'error'],
      description: 'Visual state — error swaps border/background to the error tokens.',
      table: { type: { summary: "'default' | 'error'" }, defaultValue: { summary: 'default' } },
    },
    placeholder: {
      control: 'text',
      description: 'Native input placeholder.',
      table: { type: { summary: 'string' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Disable interaction.',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    readOnly: {
      control: 'boolean',
      description: 'Read-only state.',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
      description: 'Native input type — forwarded to the underlying `<input>`.',
      table: { type: { summary: "'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url'" }, defaultValue: { summary: 'text' } },
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
    placeholder: 'e.g. Jane Doe',
    disabled: false,
    readOnly: false,
    type: 'text',
    defaultValue: '',
  },
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 320 }}>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Default</span>
        <Input placeholder="Placeholder text" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Filled</span>
        <Input defaultValue="Jane Doe" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Error</span>
        <Input variant="error" defaultValue="invalid@" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Disabled</span>
        <Input disabled defaultValue="Can't edit me" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Read-only</span>
        <Input readOnly defaultValue="Read only" />
      </div>
    </div>
  ),
};
