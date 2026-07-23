import { useState } from 'react';
import { DatePicker } from './DatePicker';

export default {
  title: 'Forms/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'ISO date string (YYYY-MM-DD)',
    },
    placeholder: {
      control: 'text',
      description: 'Native input placeholder (only shown by some browsers when the value is empty)',
    },
    hasError: {
      control: 'boolean',
      description: 'Apply the error border/background',
      table: { defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Disable interaction',
      table: { defaultValue: { summary: 'false' } },
    },
    hidden: {
      control: 'boolean',
      description: 'Visually hide the field while keeping it in the DOM (for imperative showPicker())',
      table: { defaultValue: { summary: 'false' } },
    },
    min: {
      control: 'text',
      description: 'Minimum selectable ISO date',
    },
    max: {
      control: 'text',
      description: 'Maximum selectable ISO date',
    },
    id: {
      control: 'text',
      description: 'Optional id — auto-generated via useId when omitted',
    },
  },
};

function Wrapper({ value: initial = '', ...props }) {
  const [value, setValue] = useState(initial);
  return <DatePicker {...props} value={value} onSelect={setValue} />;
}

export const Playground = {
  render: (args) => <Wrapper {...args} />,
  args: {
    value: '',
    placeholder: 'Pick a date',
    hasError: false,
    disabled: false,
    hidden: false,
    min: '',
    max: '',
  },
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 260 }}>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Empty</span>
        <Wrapper />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>With value</span>
        <Wrapper value="2026-01-15" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Bounded (min/max)</span>
        <Wrapper value="2026-06-01" min="2026-01-01" max="2026-12-31" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Error</span>
        <Wrapper value="2026-01-15" hasError />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Disabled</span>
        <Wrapper value="2026-01-15" disabled />
      </div>
    </div>
  ),
};
