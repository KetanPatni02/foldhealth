import { useState } from 'react';
import { DatePicker } from './DatePicker';

export default {
  title: 'Forms/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: { component: 'Native `<input type="date">` wrapped with Fold form styling. Controlled — parent owns the ISO value.' },
    },
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'ISO date string (`YYYY-MM-DD`).',
      table: { type: { summary: 'string' } },
    },
    onSelect: {
      action: 'onSelect',
      description: 'Fires with the new ISO date on pick.',
      table: { type: { summary: '(next: string) => void' } },
    },
    placeholder: {
      control: 'text',
      description: 'Native input placeholder (some browsers only).',
      table: { type: { summary: 'string' } },
    },
    hasError: {
      control: 'boolean',
      description: 'Apply the error border/background.',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Disable interaction.',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    hidden: {
      control: 'boolean',
      description: 'Visually hide the field while keeping it in the DOM (for imperative `showPicker()`).',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    min: {
      control: 'text',
      description: 'Minimum selectable ISO date.',
      table: { type: { summary: 'string' } },
    },
    max: {
      control: 'text',
      description: 'Maximum selectable ISO date.',
      table: { type: { summary: 'string' } },
    },
    id: {
      control: 'text',
      description: 'Optional id — auto-generated via `useId` when omitted.',
      table: { type: { summary: 'string' } },
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
