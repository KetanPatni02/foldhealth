import { useState } from 'react';
import { InlineEditable } from './InlineEditable';

export default {
  title: 'Core/InlineEditable',
  component: InlineEditable,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Text that becomes an input on click; commits on blur or Enter. Used for renaming groups, boards, and other in-place editable titles.',
      },
    },
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'Committed value.',
      table: { type: { summary: 'string' } },
    },
    onCommit: {
      action: 'onCommit',
      description: 'Fires with the new value on blur or Enter.',
      table: { type: { summary: '(next: string) => void' } },
    },
    placeholder: {
      control: 'text',
      description: 'Shown when the value is empty.',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'Untitled' } },
    },
    size: {
      control: 'select',
      options: ['S', 'M', 'L'],
      description: 'Type scale.',
      table: { type: { summary: "'S' | 'M' | 'L'" }, defaultValue: { summary: 'M' } },
    },
    maxLength: {
      control: 'number',
      description: 'Max characters accepted while editing.',
      table: { type: { summary: 'number' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Disables editing; renders as read-only text.',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    title: {
      control: 'text',
      description: 'Native title attribute (hover tooltip).',
      table: { type: { summary: 'string' } },
    },
  },
};

function Wrapper(props) {
  const [value, setValue] = useState(props.value ?? 'Untitled group');
  return <InlineEditable {...props} value={value} onCommit={setValue} />;
}

export const Playground = { render: (args) => <Wrapper {...args} />, args: { value: 'Untitled group', size: 'M', placeholder: 'Type a name…' } };
