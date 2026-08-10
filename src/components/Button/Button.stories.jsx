import { Button } from './Button';

export default {
  title: 'Core/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The single button primitive used everywhere in the app. Pick a `variant` for meaning (primary for the main action, secondary for the alternative, ghost for low-emphasis controls, success / danger / info for status-flavored actions) and a `size` for context (S for dense toolbars, L for standard use, XL for mobile). Supports leading and trailing Solar icons and can be flipped to an `iconOnly` square variant when the layout is tight.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary', 'ghost', 'alt', 'success', 'danger', 'dangerFilled', 'info'],
      description: 'Visual style of the button',
      table: { defaultValue: { summary: 'primary' } },
    },
    size: {
      control: 'select',
      options: ['S', 'L', 'XL'],
      description: 'S = 24px, L = 32px (default), XL = 52px (mobile)',
      table: { defaultValue: { summary: 'L' } },
    },
    children: {
      control: 'text',
      description: 'Button label text',
    },
    showLeadingIcon: {
      control: 'boolean',
      description: 'Toggle the leading icon on/off (uses `leadingIcon` for the glyph)',
      table: { defaultValue: { summary: 'false' } },
    },
    leadingIcon: {
      control: 'text',
      description: 'Solar icon name used when `showLeadingIcon` is on (or when `iconOnly` is on)',
    },
    showTrailingIcon: {
      control: 'boolean',
      description: 'Toggle the trailing icon on/off (uses `trailingIcon` for the glyph)',
      table: { defaultValue: { summary: 'false' } },
    },
    trailingIcon: {
      control: 'text',
      description: 'Solar icon name used when `showTrailingIcon` is on',
    },
    iconOnly: {
      control: 'boolean',
      description: 'Square icon-only button (hides text)',
      table: { defaultValue: { summary: 'false' } },
    },
    dropdown: {
      control: 'boolean',
      description: 'Split-button mode — appends a chevron with a MenuPopover of secondary actions',
      table: { defaultValue: { summary: 'false' } },
    },
    fullWidth: {
      control: 'boolean',
      description: 'Expand to fill container width',
      table: { defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the button',
      table: { defaultValue: { summary: 'false' } },
    },
  },
};

/**
 * The default playground — tweak every prop in the Controls panel.
 * This single story replaces all the individual variant stories.
 *
 * Leading / trailing icons live behind their own boolean toggles so the
 * default preview stays label-only; flip `showLeadingIcon` (or set
 * `iconOnly`) to bring the glyph in.
 */
const DROPDOWN_MENU = [
  { key: 'draft',     icon: 'solar:document-linear',        label: 'Save as draft' },
  { key: 'template',  icon: 'solar:copy-linear',            label: 'Save as template' },
  { key: 'duplicate', icon: 'solar:documents-linear',       label: 'Duplicate' },
  { divider: true },
  { key: 'delete',    icon: 'solar:trash-bin-trash-linear', label: 'Delete', danger: true },
];

export const Playground = {
  args: {
    variant: 'primary',
    size: 'L',
    children: 'Button Text',
    showLeadingIcon: false,
    leadingIcon: 'solar:add-circle-linear',
    showTrailingIcon: false,
    trailingIcon: 'solar:alt-arrow-right-linear',
    iconOnly: false,
    dropdown: false,
    fullWidth: false,
    disabled: false,
  },
  render: ({ showLeadingIcon, leadingIcon, showTrailingIcon, trailingIcon, iconOnly, dropdown, ...rest }) => (
    <Button
      {...rest}
      iconOnly={iconOnly}
      leadingIcon={(showLeadingIcon || iconOnly) ? leadingIcon : ''}
      trailingIcon={showTrailingIcon ? trailingIcon : ''}
      menuItems={dropdown ? DROPDOWN_MENU : undefined}
      onMenuSelect={dropdown ? (key) => alert(`Menu action: ${key}`) : undefined}
    />
  ),
};
