import { useState } from 'react';
import { SortableHeader } from './SortableHeader';

export default {
  title: 'Data/SortableHeader',
  component: SortableHeader,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Table `<th>` cell that renders a sort control. Clicking cycles `asc → desc → cleared` for its `sortKey`; the parent owns `currentKey`/`currentDir`.',
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Header label shown to the user.',
      table: { type: { summary: 'string' } },
    },
    sortKey: {
      control: 'text',
      description: 'Identifier passed back through `onSort` when this column is clicked.',
      table: { type: { summary: 'string' } },
    },
    currentKey: {
      control: 'text',
      description: 'Which column is currently sorted (matches `sortKey` when this cell is active).',
      table: { type: { summary: 'string' } },
    },
    currentDir: {
      control: 'select',
      options: ['asc', 'desc', null],
      description: 'Active sort direction, or `null` when unsorted.',
      table: { type: { summary: "'asc' | 'desc' | null" } },
    },
    onSort: {
      action: 'onSort',
      description: 'Fires with the picked `sortKey` and next `dir`.',
      table: { type: { summary: "(sortKey: string, dir: 'asc' | 'desc' | null) => void" } },
    },
    align: {
      control: 'select',
      options: ['left', 'center', 'right'],
      description: 'Text alignment inside the cell.',
      table: { type: { summary: "'left' | 'center' | 'right'" }, defaultValue: { summary: 'left' } },
    },
  },
};

function Wrapper(props) {
  const [key, setKey] = useState(props.currentKey || null);
  const [dir, setDir] = useState(props.currentDir || 'asc');
  return (
    <SortableHeader
      {...props}
      currentKey={key}
      currentDir={dir}
      onSort={(k, d) => { setKey(k); setDir(d); }}
    />
  );
}

export const Playground = {
  render: (args) => <Wrapper {...args} />,
  args: { label: 'Member', sortKey: 'name', currentKey: 'name', currentDir: 'asc', align: 'left' },
};
