import { PatientBanner } from './PatientBanner';

export default {
  title: 'Composed/PatientBanner',
  component: PatientBanner,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: 'Compact patient-header row used at the top of chart drawers, call drawers, and detail views. Shows avatar, name, gender/age, member ID, and (optional) RAF trend.' },
    },
  },
  argTypes: {
    initials: {
      control: 'text',
      description: 'Avatar initials (usually 2 letters).',
      table: { type: { summary: 'string' } },
    },
    name: {
      control: 'text',
      description: 'Patient full name.',
      table: { type: { summary: 'string' } },
    },
    gender: {
      control: 'select',
      options: ['Male', 'Female'],
      description: 'Patient gender label.',
      table: { type: { summary: "'Male' | 'Female'" } },
    },
    age: {
      control: 'text',
      description: 'Age string, e.g. "67y 2m".',
      table: { type: { summary: 'string' } },
    },
    memberId: {
      control: 'text',
      description: 'Member ID, e.g. "#219384756102".',
      table: { type: { summary: 'string' } },
    },
    raf: {
      control: 'text',
      description: 'RAF score, e.g. "4.234" (optional).',
      table: { type: { summary: 'string' } },
    },
    rafChange: {
      control: 'text',
      description: 'RAF change, e.g. "0.512" (optional).',
      table: { type: { summary: 'string' } },
    },
    rafUp: {
      control: 'boolean',
      description: 'RAF trend direction: `true` = up (green), `false` = down (red).',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'true' } },
    },
    hidePatientLabel: {
      control: 'boolean',
      description: 'Omit the leading "Patient" meta label.',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    onCall: {
      action: 'onCall',
      description: 'Call button handler — omit to hide the phone button.',
      table: { type: { summary: '() => void' } },
    },
  },
};

export const Playground = {
  args: {
    initials: 'JD',
    name: 'Jane Doe',
    gender: 'Female',
    age: '67y 2m',
    memberId: '#219384756102',
    raf: '4.234',
    rafChange: '0.512',
    rafUp: true,
    hidePatientLabel: false,
  },
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PatientBanner
        initials="JD"
        name="Jane Doe"
        gender="Female"
        age="67y 2m"
        memberId="#219384756102"
        onCall={() => {}}
      />
      <PatientBanner
        initials="MR"
        name="Marcus Reyes"
        gender="Male"
        age="72y 5m"
        memberId="#438201956743"
        raf="3.812"
        rafChange="0.214"
        rafUp
        onCall={() => {}}
      />
      <PatientBanner
        initials="EK"
        name="Elena Kim"
        gender="Female"
        age="58y 0m"
        memberId="#902184573629"
        raf="2.401"
        rafChange="0.187"
        rafUp={false}
        onCall={() => {}}
      />
      <PatientBanner
        initials="TS"
        name="Terrance Smith"
        gender="Male"
        age="65y 8m"
        memberId="#183940275610"
        raf="4.891"
        rafChange="0.622"
        rafUp
        hidePatientLabel
      />
    </div>
  ),
};
