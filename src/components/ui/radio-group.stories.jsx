import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from './radio-group';

export default {
  title: 'shadcn/RadioGroup',
  tags: ['autodocs'],
};

function Wrapper({ options = [], defaultValue }) {
  const [value, setValue] = useState(defaultValue ?? options[0]?.value);
  return (
    <RadioGroup value={value} onValueChange={setValue}>
      {options.map((opt) => (
        <label
          key={opt.value}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        >
          <RadioGroupItem value={opt.value} id={`opt-${opt.value}`} />
          <span style={{ fontSize: 14, color: 'var(--neutral-500)' }}>{opt.label}</span>
        </label>
      ))}
    </RadioGroup>
  );
}

export const Playground = {
  render: () => (
    <Wrapper
      options={[
        { value: 'default', label: 'Default' },
        { value: 'comfortable', label: 'Comfortable' },
        { value: 'compact', label: 'Compact' },
      ]}
    />
  ),
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 8 }}>
          Density
        </div>
        <Wrapper
          options={[
            { value: 'default', label: 'Default' },
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]}
        />
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 8 }}>
          Two options
        </div>
        <Wrapper
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
        />
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 8 }}>
          Disabled option
        </div>
        <RadioGroup defaultValue="one">
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <RadioGroupItem value="one" />
            <span style={{ fontSize: 14, color: 'var(--neutral-500)' }}>One</span>
          </label>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              opacity: 0.5,
              cursor: 'not-allowed',
            }}
          >
            <RadioGroupItem value="two" disabled />
            <span style={{ fontSize: 14, color: 'var(--neutral-500)' }}>Two (disabled)</span>
          </label>
        </RadioGroup>
      </div>
    </div>
  ),
};
