import { SearchIconButton } from './SearchIconButton';

export default {
  title: 'Composed/SearchIconButton',
  component: SearchIconButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: { component: 'Icon-only search button — expands into a search input on click. Preset shape used across toolbars.' },
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Tooltip label.',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'Search' } },
    },
    onClick: {
      action: 'onClick',
      description: 'Click handler.',
      table: { type: { summary: '() => void' } },
    },
    className: {
      control: 'text',
      description: 'Extra class name on the wrapper.',
      table: { type: { summary: 'string' } },
    },
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
