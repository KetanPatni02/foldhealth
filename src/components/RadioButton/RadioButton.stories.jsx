import { useState } from 'react';
import { RadioButton } from './RadioButton';

export default {
  title: 'Forms/RadioButton',
  component: RadioButton,
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'Current selected state',
    },
    label: {
      control: 'text',
      description: 'Optional visible label text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable interaction',
      table: { defaultValue: { summary: 'false' } },
    },
    name: {
      control: 'text',
      description: 'HTML name attribute for form grouping',
    },
    value: {
      control: 'text',
      description: 'HTML value attribute',
    },
  },
};

function SingleWrapper({ checked: initial = false, ...props }) {
  const [checked, setChecked] = useState(initial);
  return <RadioButton {...props} checked={checked} onChange={() => setChecked(v => !v)} />;
}

function GroupWrapper({ options, initial }) {
  const [selected, setSelected] = useState(initial);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map(opt => (
        <RadioButton
          key={opt.value}
          name="story-group"
          value={opt.value}
          label={opt.label}
          checked={selected === opt.value}
          onChange={() => setSelected(opt.value)}
        />
      ))}
    </div>
  );
}

export const Playground = {
  render: (args) => <SingleWrapper {...args} />,
  args: {
    checked: false,
    label: 'I agree',
    disabled: false,
    name: 'consent',
    value: 'yes',
  },
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Unselected</span>
        <SingleWrapper label="Option A" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Selected</span>
        <SingleWrapper checked label="Option B" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Disabled</span>
        <SingleWrapper disabled label="Locked option" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Group (mutually exclusive)</span>
        <GroupWrapper
          initial="phone"
          options={[
            { value: 'phone', label: 'Phone call' },
            { value: 'sms', label: 'Text message' },
            { value: 'email', label: 'Email' },
          ]}
        />
      </div>
    </div>
  ),
};
