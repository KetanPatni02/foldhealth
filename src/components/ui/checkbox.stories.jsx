import { useState } from 'react';
import { Checkbox } from './checkbox';

export default {
  title: 'shadcn/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
};

function Wrapper({ defaultChecked = false, ...rest }) {
  const [checked, setChecked] = useState(defaultChecked);
  return <Checkbox checked={checked} onCheckedChange={setChecked} {...rest} />;
}

export const Playground = {
  render: () => (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <Wrapper defaultChecked={false} />
      <span style={{ fontSize: 14, color: 'var(--neutral-500)' }}>Accept terms</span>
    </label>
  ),
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Row label="Unchecked">
        <Wrapper defaultChecked={false} />
      </Row>
      <Row label="Checked">
        <Wrapper defaultChecked={true} />
      </Row>
      <Row label="Indeterminate">
        <Checkbox checked="indeterminate" onCheckedChange={() => {}} />
      </Row>
      <Row label="Disabled — unchecked">
        <Checkbox disabled />
      </Row>
      <Row label="Disabled — checked">
        <Checkbox disabled checked />
      </Row>
      <Row label="With label">
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <Wrapper defaultChecked={true} />
          <span style={{ fontSize: 14, color: 'var(--neutral-500)' }}>
            Email me a summary
          </span>
        </label>
      </Row>
    </div>
  ),
};

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ width: 200, fontSize: 12, color: 'var(--neutral-300)' }}>{label}</span>
      {children}
    </div>
  );
}
