import { useState } from 'react';
import { Select } from './Select';

export default {
  title: 'Core/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: { component: 'Fold Health custom `Select` — matches Input tokens, supports single- and multi-select, searchable menus, section headers, and leading icons. Every optional label/helper slot is exposed through a Figma-style `show*` boolean paired with its value.' },
    },
  },
  argTypes: {
    // Options + core select behaviour
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
    // Label row — mirrors src/components/Input's toggle+value pattern
    showLabel: { control: 'boolean', description: 'Storybook-only toggle for the Title slot. Renders `label` when true.' },
    label: { control: 'text', description: 'Text above the trigger.' },
    required: { control: 'boolean', description: 'Adds the 4×4 red dot next to the label.' },
    showInfo: { control: 'boolean', description: 'Info icon next to the label (`infoText` sets its tooltip).' },
    infoText: { control: 'text', description: 'Tooltip for the info icon.' },
    // Leading icon — same toggle+string pair Input uses
    showLeadingIcon: { control: 'boolean', description: 'Storybook-only toggle for the leading icon slot.' },
    leadingIcon: { control: 'text', description: 'Solar icon name (e.g. `solar:user-linear`) rendered inside the trigger.' },
    // Below the field
    showSupportingText: { control: 'boolean', description: 'Show supporting text below the trigger (helperText slot).' },
    helperText: { control: 'text', description: 'Muted text below the trigger. Hidden while an error shows.' },
    errorText: { control: 'text', description: 'Error message below the trigger. Forces the error state.' },
  },
};

const SAMPLE_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'archived', label: 'Archived', disabled: true },
];

// Storybook glue: fold every "show*" toggle + its value into the real
// Select props. Component API stays idiomatic (label/leadingIcon/helperText
// are strings on the component itself) while the Controls panel mirrors
// Figma's toggle-first pattern where every optional string has a boolean
// gate above it.
function SelectFromArgs({
  showLabel, label,
  showLeadingIcon, leadingIcon,
  showSupportingText, helperText,
  ...rest
}) {
  return (
    <Select
      {...rest}
      label={showLabel ? label : undefined}
      leadingIcon={showLeadingIcon ? leadingIcon : undefined}
      helperText={showSupportingText ? helperText : undefined}
    />
  );
}

function SingleWrapper({ initial = '', ...props }) {
  const [value, setValue] = useState(initial);
  return <SelectFromArgs {...props} value={value} onChange={setValue} />;
}

function MultiWrapper({ initial = [], ...props }) {
  const [value, setValue] = useState(initial);
  return <SelectFromArgs {...props} multiple value={value} onChange={setValue} />;
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
    multiple: false,
    // Label row
    showLabel: false,
    label: 'Status',
    required: false,
    showInfo: false,
    infoText: "Pick the workflow status.",
    // Leading icon
    showLeadingIcon: false,
    leadingIcon: 'solar:tag-linear',
    // Below the field
    showSupportingText: false,
    helperText: 'This is supporting text',
    errorText: '',
  },
};
