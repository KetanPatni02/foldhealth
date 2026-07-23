import { Input } from './Input';

export default {
  title: 'Forms/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'error'],
      description: 'Visual state — error swaps border/background to the error tokens',
      table: { defaultValue: { summary: 'default' } },
    },
    placeholder: {
      control: 'text',
      description: 'Native input placeholder',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable interaction',
      table: { defaultValue: { summary: 'false' } },
    },
    readOnly: {
      control: 'boolean',
      description: 'Read-only state',
      table: { defaultValue: { summary: 'false' } },
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
      description: 'Native input type — forwarded through to the underlying <input>',
      table: { defaultValue: { summary: 'text' } },
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
