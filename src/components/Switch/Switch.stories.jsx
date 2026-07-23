import { useState } from 'react';
import { Switch } from './Switch';

export default {
  title: 'Forms/Switch',
  component: Switch,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: { component: 'On/off toggle switch. Controlled — parent owns `checked` and updates it in `onChange`.' },
    },
  },
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'Current on/off state.',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    onChange: {
      action: 'onChange',
      description: 'Fires with the new checked state.',
      table: { type: { summary: '(next: boolean) => void' } },
    },
    label: {
      control: 'text',
      description: 'Optional visible label text (right of the track).',
      table: { type: { summary: 'string' } },
    },
    ariaLabel: {
      control: 'text',
      description: 'Screen-reader label — use when there is no visible `label`.',
      table: { type: { summary: 'string' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Disable interaction.',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
  },
};

function Wrapper({ checked: initial = false, ...props }) {
  const [checked, setChecked] = useState(initial);
  return <Switch {...props} checked={checked} onChange={setChecked} />;
}

export const Playground = {
  render: (args) => <Wrapper {...args} />,
  args: {
    checked: false,
    label: 'Enable notifications',
    ariaLabel: '',
    disabled: false,
  },
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>OFF</span>
        <Wrapper ariaLabel="off example" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>ON</span>
        <Wrapper checked ariaLabel="on example" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>With label</span>
        <Wrapper label="Auto-generate summary" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Disabled OFF</span>
        <Wrapper disabled label="Locked" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Disabled ON</span>
        <Wrapper checked disabled label="Locked on" />
      </div>
    </div>
  ),
};
