import { Tooltip } from './Tooltip';
import { Button } from '../Button/Button';

export default {
  title: 'Overlays/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Small floating label shown on hover of the wrapped element.',
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Tooltip text',
      table: { type: { summary: 'string' } },
    },
    placement: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
      description: 'Placement relative to the trigger',
      table: { type: { summary: "'top' | 'right' | 'bottom' | 'left'" }, defaultValue: { summary: 'top' } },
    },
    className: {
      control: 'text',
      description: 'Extra class on the tooltip element',
      table: { type: { summary: 'string' } },
    },
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
