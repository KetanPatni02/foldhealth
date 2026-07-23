import { SearchIconButton } from './SearchIconButton';

export default {
  title: 'Composed/SearchIconButton',
  component: SearchIconButton,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Tooltip label',
      table: { defaultValue: { summary: 'Search' } },
    },
    onClick: { action: 'onClick', description: 'Click handler' },
    className: { control: 'text', description: 'Extra class name' },
  },
};

export const Playground = {
  args: {
    title: 'Search',
  },
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <SearchIconButton onClick={() => {}} />
        <span style={{ fontSize: 13, color: 'var(--neutral-300)' }}>Default</span>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <SearchIconButton title="Search patients" onClick={() => {}} />
        <span style={{ fontSize: 13, color: 'var(--neutral-300)' }}>Custom tooltip</span>
      </div>
    </div>
  ),
};
