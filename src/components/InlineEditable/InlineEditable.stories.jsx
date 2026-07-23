import { useState } from 'react';
import { InlineEditable } from './InlineEditable';

export default {
  title: 'Core/InlineEditable',
  component: InlineEditable,
  tags: ['autodocs'],
  argTypes: {
    placeholder: { control: 'text' },
    size: { control: 'select', options: ['S', 'M', 'L'] },
    maxLength: { control: 'number' },
    disabled: { control: 'boolean' },
    title: { control: 'text' },
  },
};

function Wrapper(props) {
  const [value, setValue] = useState(props.value ?? 'Untitled group');
  return <InlineEditable {...props} value={value} onCommit={setValue} />;
}

export const Playground = { render: (args) => <Wrapper {...args} />, args: { value: 'Untitled group', size: 'M', placeholder: 'Type a name…' } };
export const Sizes = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Wrapper value="Small title" size="S" />
      <Wrapper value="Medium title" size="M" />
      <Wrapper value="Large title" size="L" />
    </div>
  ),
};
