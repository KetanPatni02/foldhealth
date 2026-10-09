import { useState } from 'react';
import { RadioOptionGroup } from './RadioOptionGroup';

export default {
  title: 'Forms/RadioOptionGroup',
  component: RadioOptionGroup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: { component: 'A labelled set of radios, each with an optional hint line. Use for a single choice that needs a sentence of explanation per option.' },
    },
  },
};

const OPTIONS = [
  { value: 'extend', label: 'Extend', hint: 'Keep the start date and push the end date out.' },
  { value: 'reinstate', label: 'Reinstate', hint: 'Close the current one and start again, keeping its history.' },
];

export const Default = {
  render: () => {
    const [value, setValue] = useState('extend');
    return <RadioOptionGroup label="When applied again" options={OPTIONS} value={value} onChange={setValue} name="story-renewal" />;
  },
};

export const WithoutHints = {
  render: () => {
    const [value, setValue] = useState('a');
    return (
      <RadioOptionGroup
        label="Pick one"
        options={[{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }]}
        value={value}
        onChange={setValue}
        name="story-plain"
      />
    );
  },
};
