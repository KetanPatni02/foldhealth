import { useState } from 'react';
import { UnityPromptField } from './UnityPromptField';

export default {
  title: 'Core/UnityPromptField',
  component: UnityPromptField,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A plain-English request to UnityAI: labelled textarea with the Unity mark, character counter, a one-click example, and the action that sends it (Cmd/Ctrl+Enter also submits). The host does the generating.',
      },
    },
  },
  argTypes: {
    generating: { control: 'boolean' },
    error: { control: 'text' },
    hint: { control: 'text' },
  },
};

const EXAMPLE = 'A care plan for newly diagnosed Type 2 diabetes with focus on medication adherence and dietary counseling.';

function Stateful(args) {
  const [value, setValue] = useState(args.value || '');
  return (
    <div style={{ maxWidth: 420 }}>
      <UnityPromptField {...args} value={value} onChange={setValue} onSubmit={() => {}} />
    </div>
  );
}

export const Default = {
  render: Stateful,
  args: {
    label: 'Describe this template in plain English',
    placeholder: 'Who it is for and what it should focus on',
    example: EXAMPLE,
    actionLabel: 'Draft Template',
    generatingLabel: 'Drafting…',
    hint: 'UnityAI drafts goals, interventions and barriers from your library. You review before saving.',
  },
};

export const Generating = {
  render: Stateful,
  args: { ...Default.args, value: EXAMPLE, generating: true },
};

export const WithError = {
  render: Stateful,
  args: { ...Default.args, value: EXAMPLE, error: 'The AI service is busy right now. Please try again in a moment.' },
};
