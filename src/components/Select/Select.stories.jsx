import { useState } from 'react';
import { Select } from './Select';

export default {
  title: 'Forms/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: {
    options: {
      control: 'object',
      description: 'Array of `{ value, label, disabled?, style?, triggerLabel?, searchText?, singleAction? }` or `{ type: "header", label, value }` section headers',
    },
    placeholder: {
      control: 'text',
      description: 'Trigger label when nothing is selected',
      table: { defaultValue: { summary: 'Select…' } },
    },
    variant: {
      control: 'select',
      options: ['default', 'error'],
      table: { defaultValue: { summary: 'default' } },
    },
    disabled: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    menuAlign: {
      control: 'select',
      options: ['left', 'right'],
      description: 'Popover horizontal anchor',
      table: { defaultValue: { summary: 'left' } },
    },
    searchable: {
      control: 'boolean',
      description: 'Show a search field at the top of the menu',
      table: { defaultValue: { summary: 'false' } },
    },
    searchPlaceholder: {
      control: 'text',
      table: { defaultValue: { summary: 'Search…' } },
    },
    leadingIcon: {
      control: 'text',
      description: 'Optional Solar icon shown before the label (e.g. solar:user-linear)',
    },
    multiple: {
      control: 'boolean',
      description: 'Multi-select mode — value becomes an array; menu stays open on pick',
      table: { defaultValue: { summary: 'false' } },
    },
  },
};

const SAMPLE_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'archived', label: 'Archived', disabled: true },
];

function SingleWrapper({ initial = '', ...props }) {
  const [value, setValue] = useState(initial);
  return <Select {...props} value={value} onChange={setValue} />;
}

function MultiWrapper({ initial = [], ...props }) {
  const [value, setValue] = useState(initial);
  return <Select {...props} multiple value={value} onChange={setValue} />;
}

export const Playground = {
  render: (args) => (args.multiple ? <MultiWrapper {...args} initial={[]} /> : <SingleWrapper {...args} />),
  args: {
    options: SAMPLE_OPTIONS,
    placeholder: 'Select status…',
    variant: 'default',
    disabled: false,
    menuAlign: 'left',
    searchable: false,
    searchPlaceholder: 'Search…',
    leadingIcon: '',
    multiple: false,
  },
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 320 }}>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Default</span>
        <SingleWrapper options={SAMPLE_OPTIONS} placeholder="Select status…" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>With selection</span>
        <SingleWrapper options={SAMPLE_OPTIONS} initial="active" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Leading icon</span>
        <SingleWrapper options={SAMPLE_OPTIONS} initial="pending" leadingIcon="solar:user-linear" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Searchable</span>
        <SingleWrapper
          searchable
          placeholder="Pick a state…"
          options={['California', 'Colorado', 'Connecticut', 'Delaware', 'Florida'].map(s => ({ value: s, label: s }))}
        />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Multi-select</span>
        <MultiWrapper options={SAMPLE_OPTIONS} initial={['active', 'pending']} placeholder="Select statuses…" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Error</span>
        <SingleWrapper options={SAMPLE_OPTIONS} variant="error" placeholder="Required" />
      </div>
      <div>
        <span style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 4, display: 'block' }}>Disabled</span>
        <SingleWrapper options={SAMPLE_OPTIONS} initial="inactive" disabled />
      </div>
    </div>
  ),
};
