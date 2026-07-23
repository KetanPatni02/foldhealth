import { GoalProgress } from './GoalProgress';

export default {
  title: 'Composed/GoalProgress',
  component: GoalProgress,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    goalsDetail: {
      control: 'object',
      description: 'Flat list of goals: [{ name, desc, pass }] — used by callDetails / DetailDrawer.',
    },
    goals: {
      control: 'object',
      description: 'Structured shape: { mandatory: [], optional: [], progress, passed, total, mandatoryMet }.',
    },
  },
};

const GOALS_ALL_FAIL = [
  { name: 'Confirm identity', desc: 'DOB + last 4 SSN', pass: false },
  { name: 'Verify medications', desc: 'Read active med list', pass: false },
  { name: 'Schedule follow-up', desc: 'Within 7 days of discharge', pass: false },
  { name: 'Review discharge instructions', desc: 'Read back to patient', pass: false },
];

const GOALS_MID = [
  { name: 'Confirm identity', desc: 'DOB + last 4 SSN', pass: true },
  { name: 'Verify medications', desc: 'Read active med list', pass: true },
  { name: 'Schedule follow-up', desc: 'Within 7 days of discharge', pass: false },
  { name: 'Review discharge instructions', desc: 'Read back to patient', pass: false },
];

const GOALS_ALL_PASS = [
  { name: 'Confirm identity', desc: 'DOB + last 4 SSN', pass: true },
  { name: 'Verify medications', desc: 'Read active med list', pass: true },
  { name: 'Schedule follow-up', desc: 'Within 7 days of discharge', pass: true },
  { name: 'Review discharge instructions', desc: 'Read back to patient', pass: true },
];

const STRUCTURED_GOALS = {
  mandatory: [
    { name: 'Confirm identity', desc: 'DOB + last 4 SSN', pass: true },
    { name: 'Verify medications', desc: 'Read active med list', pass: true },
  ],
  optional: [
    { name: 'Offer transportation', desc: 'Lyft/Uber voucher', pass: true },
    { name: 'Send educational content', desc: 'Post-discharge PDF', pass: false },
  ],
  progress: 75,
  passed: 3,
  total: 4,
  mandatoryMet: true,
};

export const Playground = {
  args: {
    goalsDetail: GOALS_MID,
  },
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 520 }}>
      <div>
        <p style={{ fontSize: 13, color: 'var(--neutral-300)', marginBottom: 8 }}>0% — all failing</p>
        <GoalProgress goalsDetail={GOALS_ALL_FAIL} />
      </div>
      <div>
        <p style={{ fontSize: 13, color: 'var(--neutral-300)', marginBottom: 8 }}>50% — half passed</p>
        <GoalProgress goalsDetail={GOALS_MID} />
      </div>
      <div>
        <p style={{ fontSize: 13, color: 'var(--neutral-300)', marginBottom: 8 }}>100% — all passed</p>
        <GoalProgress goalsDetail={GOALS_ALL_PASS} />
      </div>
      <div>
        <p style={{ fontSize: 13, color: 'var(--neutral-300)', marginBottom: 8 }}>Structured shape (Mandatory / Optional sections)</p>
        <GoalProgress goals={STRUCTURED_GOALS} />
      </div>
    </div>
  ),
};
