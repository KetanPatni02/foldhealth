import { useState } from 'react';
import { TabStrip } from './TabStrip';

export default {
  title: 'Navigation/TabStrip',
  component: TabStrip,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Horizontal tab bar with animated underline. Controlled — parent owns the active key.',
      },
    },
  },
  argTypes: {
    items: {
      control: 'object',
      description: 'Tabs, in display order.',
      table: { type: { summary: '{ key: string; label: string }[]' } },
    },
    activeKey: {
      control: 'text',
      description: 'Currently selected tab key.',
      table: { type: { summary: 'string' } },
    },
    onChange: {
      action: 'onChange',
      description: 'Fires with the picked tab key.',
      table: { type: { summary: '(key: string) => void' } },
    },
    fullWidth: {
      control: 'boolean',
      description: 'When true, tabs stretch to fill the container.',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'true' } },
    },
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
