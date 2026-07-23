import { CloseButton } from './CloseButton';

export default {
  title: 'Core/CloseButton',
  component: CloseButton,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'number', description: 'Icon size in px' },
    label: { control: 'text', description: 'aria-label' },
  },
};

export const Playground = { args: { size: 18, label: 'Close' } };
export const Sizes = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <CloseButton size={14} />
      <CloseButton size={18} />
      <CloseButton size={24} />
    </div>
  ),
};
