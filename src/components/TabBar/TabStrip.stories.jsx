import { useState } from 'react';
import { TabStrip } from './TabStrip';

export default {
  title: 'Navigation/TabStrip',
  component: TabStrip,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    fullWidth: { control: 'boolean' },
    items: { control: 'object' },
  },
};

function Wrapper(props) {
  const [active, setActive] = useState(props.items?.[0]?.key || 'overview');
  return <TabStrip {...props} activeKey={active} onChange={setActive} />;
}

const ITEMS = [
  { key: 'overview', label: 'Overview' },
  { key: 'diagnoses', label: 'Diagnoses' },
  { key: 'documents', label: 'Documents' },
  { key: 'activity', label: 'Activity' },
];

export const Playground = { render: (args) => <Wrapper {...args} />, args: { items: ITEMS, fullWidth: true } };
export const InlineWidth = { render: () => <Wrapper items={ITEMS} fullWidth={false} /> };
