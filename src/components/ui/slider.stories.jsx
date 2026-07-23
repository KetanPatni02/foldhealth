import { useState } from 'react';
import { Slider } from './slider';

export default {
  title: 'shadcn/Slider',
  component: Slider,
  tags: ['autodocs'],
  argTypes: {
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
  },
};

function Wrapper(props) {
  const [value, setValue] = useState(props.defaultValue || [40]);
  return (
    <div style={{ width: 280, padding: 8 }}>
      <Slider {...props} value={value} onValueChange={setValue} />
      <div style={{ fontSize: 12, color: 'var(--neutral-300)', marginTop: 8 }}>{value.join(' – ')}</div>
    </div>
  );
}

export const Playground = { render: (args) => <Wrapper {...args} />, args: { min: 0, max: 100, step: 1 } };
export const RangeSlider = { render: () => <Wrapper min={0} max={100} step={1} defaultValue={[20, 70]} /> };
