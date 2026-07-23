import { FoldhealthLogo } from './FoldhealthLogo';

export default {
  title: 'Core/FoldhealthLogo',
  component: FoldhealthLogo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'The Fold Health wordmark glyph. Renders inline SVG at any size.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'number',
      description: 'Square pixel size (width = height).',
      table: { type: { summary: 'number' }, defaultValue: { summary: '32' } },
    },
    color: {
      control: 'color',
      description: 'Glyph fill color.',
      table: { type: { summary: 'string' }, defaultValue: { summary: '#8C5AE2' } },
    },
    className: {
      control: 'text',
      description: 'Extra class on the svg element.',
      table: { type: { summary: 'string' } },
    },
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
