import { useState } from 'react';
import { Select } from './Select';

export default {
  title: 'Forms/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: { component: 'Fold Health custom `Select` — matches Input tokens, supports single- and multi-select, searchable menus, section headers, and leading icons.' },
    },
  },
  argTypes: {
    options: {
      control: 'object',
      description: 'Option list. Supports `{ value, label, disabled?, style?, triggerLabel?, searchText?, singleAction? }` and `{ type: "header", label, value }` section headers.',
      table: { type: { summary: 'Option[] | Header[]' } },
    },
    placeholder: {
      control: 'text',
      description: 'Trigger label when nothing is selected.',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'Select…' } },
    },
    variant: {
      control: 'select',
      options: ['default', 'error'],
      description: 'Visual state — error swaps border/background to the error tokens.',
      table: { type: { summary: "'default' | 'error'" }, defaultValue: { summary: 'default' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Disable interaction.',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    menuAlign: {
      control: 'select',
      options: ['left', 'right'],
      description: 'Popover horizontal anchor.',
      table: { type: { summary: "'left' | 'right'" }, defaultValue: { summary: 'left' } },
    },
    searchable: {
      control: 'boolean',
      description: 'Show a search field at the top of the menu.',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    searchPlaceholder: {
      control: 'text',
      description: 'Placeholder for the search field (when `searchable`).',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'Search…' } },
    },
    leadingIcon: {
      control: 'text',
      description: 'Optional Solar icon rendered before the trigger label.',
      table: { type: { summary: 'string' } },
    },
    multiple: {
      control: 'boolean',
      description: 'Multi-select mode — value becomes `string[]`; menu stays open on pick.',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    value: {
      control: 'text',
      description: 'Selected value (`string` in single mode, `string[]` in `multiple` mode).',
      table: { type: { summary: 'string | string[]' } },
    },
    onChange: {
      action: 'onChange',
      description: 'Fires with the new value on pick.',
      table: { type: { summary: '(next: string | string[]) => void' } },
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
