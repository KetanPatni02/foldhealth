import { FoldhealthLogo } from './FoldhealthLogo';

export default {
  title: 'Core/FoldhealthLogo',
  component: FoldhealthLogo,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'number' },
    color: { control: 'color' },
  },
};

export const Playground = { args: { size: 32, color: '#8C5AE2' } };
export const Sizes = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {[16, 24, 32, 48, 72].map(s => <FoldhealthLogo key={s} size={s} />)}
    </div>
  ),
};
