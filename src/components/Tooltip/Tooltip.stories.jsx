import { Tooltip } from './Tooltip';
import { Button } from '../Button/Button';

export default {
  title: 'Overlays/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text', description: 'Tooltip text' },
    placement: { control: 'select', options: ['top', 'bottom', 'left', 'right'] },
  },
};

export const Playground = {
  args: { label: 'Delete this row', placement: 'top' },
  render: (args) => (
    <Tooltip {...args}>
      <Button variant="secondary">Hover me</Button>
    </Tooltip>
  ),
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', gap: 32, padding: 48 }}>
      {['top', 'right', 'bottom', 'left'].map(p => (
        <Tooltip key={p} label={`Placed ${p}`} placement={p}>
          <Button variant="secondary">{p}</Button>
        </Tooltip>
      ))}
    </div>
  ),
};
