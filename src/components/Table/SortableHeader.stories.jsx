import { useState } from 'react';
import { SortableHeader } from './SortableHeader';

export default {
  title: 'Data/SortableHeader',
  component: SortableHeader,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    sortKey: { control: 'text' },
    currentDir: { control: 'select', options: ['asc', 'desc', null] },
    align: { control: 'select', options: ['left', 'center', 'right'] },
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

export const AllExamples = {
  render: () => (
    <table style={{ width: 640 }}>
      <thead>
        <tr>
          <Wrapper label="Member" sortKey="name" currentKey="name" currentDir="asc" />
          <Wrapper label="DOS" sortKey="dos" currentDir="desc" />
          <Wrapper label="RAF" sortKey="raf" align="right" />
        </tr>
      </thead>
    </table>
  ),
};
