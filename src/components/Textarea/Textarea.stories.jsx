import { Textarea } from './Textarea';

export default {
  title: 'Core/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Multi-line text input. Two shapes: a plain <textarea> (no label props set) and an enhanced labeled card with an optional rich-text toolbar, character counter, speech-to-text mic, and CTA. Mirrors Figma Fold-Pixel 5786:1273 / 25:78337.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'error'],
    },
    rows: { control: { type: 'number', min: 1, max: 20 } },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    // Boolean toggles for the three optional label / helper regions. When
    // `true` they render with a default string; consumers can still pass a
    // string via code to override the copy.
    title: { control: 'boolean', description: 'Show the label above the field. Accepts a string to override the default "Title" copy.' },
    info: { control: 'boolean', description: 'Show the info icon next to the title. Accepts a string to override the tooltip copy.' },
    supportingText: { control: 'boolean', description: 'Show the helper line below the field. Accepts a string to override the default copy.' },
    mandatory: { control: 'boolean' },
    richText: { control: 'boolean', description: 'Reveals the toolbar footer. Only when richText is on can attachment / speech-to-text / bottomButton surface.' },
    attachment: { control: 'boolean', description: 'Paperclip button — only visible when richText is on.' },
    speechToText: { control: 'boolean', description: 'Speech-to-text mic — only visible when richText is on.' },
    bottomButton: { control: 'boolean', description: 'Publish CTA — only visible when richText is on. Pass `{ label, onClick, variant, disabled }` in code to customize.' },
    maxLength: { control: 'number' },
  },
};

export const Playground = {
  args: {
    variant: 'default',
    rows: 3,
    placeholder: 'Add a note…',
  },
};

// ── Plain (legacy) shapes ─────────────────────────────────────────────
export const Plain = {
  args: { placeholder: 'Add a note…', rows: 3 },
};
export const PlainError = {
  args: { placeholder: 'Add a note…', variant: 'error', defaultValue: 'This value is invalid.' },
};
export const PlainDisabled = {
  args: { placeholder: 'Add a note…', disabled: true },
};

// ── Enhanced (labeled) shapes ─────────────────────────────────────────
export const Labeled = {
  args: {
    title: true,
    supportingText: true,
    placeholder: 'Enter Task Title',
  },
};

export const LabeledMandatory = {
  args: {
    title: true,
    info: true,
    mandatory: true,
    supportingText: true,
    placeholder: 'Enter Task Title',
    maxLength: 150,
  },
};

export const RichText = {
  args: {
    title: 'Description',
    info: false,
    mandatory: false,
    richText: false,
    placeholder: 'Enter Task Title',
    supportingText: false,
    maxLength: 150,
    speechToText: false,
    attachment: true,
    bottomButton: false,
  },
};

export const ErrorState = {
  args: {
    title: true,
    variant: 'error',
    supportingText: 'This field is required.',
    mandatory: true,
    placeholder: 'Enter Task Title',
    maxLength: 150,
  },
};

export const Disabled = {
  args: {
    title: true,
    disabled: true,
    supportingText: true,
    placeholder: 'Enter Task Title',
    maxLength: 150,
  },
};
