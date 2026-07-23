import { useState } from 'react';
import { FilterChip } from './FilterChip';

export default {
  title: 'Forms/FilterChip',
  component: FilterChip,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The single filter primitive used across the app. Inactive renders as `Label ⌄`; when values are selected it flips to `Label : Value ✕` and opens a popover of options.',
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Chip trigger label (e.g. "Status"). Shown before any picked values.',
      table: { type: { summary: 'string' } },
    },
    popoverLabel: {
      control: 'text',
      description:
        'Optional header shown inside the popover. Defaults to `label`. Use when the trigger text and the popover header should differ.',
      table: { type: { summary: 'string' } },
    },
    options: {
      control: 'object',
      description: 'Available values.',
      table: { type: { summary: 'string[] | { label: string, value: string }[]' } },
    },
    selected: {
      control: 'object',
      description: 'Currently selected values. Empty → chip renders as "Label ⌄".',
      table: { type: { summary: 'string[]' }, defaultValue: { summary: '[]' } },
    },
    singleSelect: {
      control: 'boolean',
      description: 'Use the RadioListPopover (single-select) instead of the checkbox popover.',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    onChange: {
      action: 'onChange',
      description: 'Fires with the new selected array whenever the user picks a value.',
      table: { type: { summary: '(next: string[]) => void' } },
    },
  },
};

function Wrapper(props) {
  const [selected, setSelected] = useState(props.selected || []);
  return <FilterChip {...props} selected={selected} onChange={setSelected} />;
}

export const Playground = {
  render: (args) => (
    <div style={{ padding: 24 }}>
      <Wrapper {...args} />
    </div>
  ),
  args: {
    label: 'Status',
    options: ['New', 'In Progress', 'Under Review', 'Closed'],
    selected: [],
    singleSelect: false,
  },
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24 }}>
      <Row title="Inactive (default)">
        <Wrapper label="Status" options={['New', 'In Progress', 'Under Review', 'Closed']} />
        <Wrapper label="Priority" options={['Low', 'Medium', 'High']} />
      </Row>

      <Row title="Active — single value">
        <Wrapper label="Priority" options={['Low', 'Medium', 'High']} selected={['High']} />
      </Row>

      <Row title="Active — two values (comma-joined)">
        <Wrapper
          label="Tags"
          options={['Urgent', 'Follow-up', 'Compliance', 'Insurance']}
          selected={['Urgent', 'Follow-up']}
        />
      </Row>

      <Row title="Active — 3+ values (first +N)">
        <Wrapper
          label="Tags"
          options={['Urgent', 'Follow-up', 'Compliance', 'Insurance']}
          selected={['Urgent', 'Follow-up', 'Compliance']}
        />
      </Row>

      <Row title="Single-select (radio popover)">
        <Wrapper
          label="Assignee"
          options={['Alice Nguyen', 'Bob Chen', 'Charlie Rivera', 'Diana Patel']}
          singleSelect
        />
        <Wrapper
          label="Bucket"
          options={['Bucket A', 'Bucket B', 'Bucket C']}
          selected={['Bucket A']}
          singleSelect
        />
      </Row>

      <Row title="Distinct popover header (`popoverLabel`)">
        <Wrapper
          label="Documents Available"
          popoverLabel="Select No. of Documents"
          options={['0', '1', '2', '3+']}
          singleSelect
        />
      </Row>
    </div>
  ),
};

function Row({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div>
    </div>
  );
}
