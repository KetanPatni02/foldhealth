import { Sparkline } from './Sparkline';

export default {
  title: 'Data Display/Sparkline',
  component: Sparkline,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A tiny axis-less trend line that stretches to its container. Use it beside a value to show recent direction (vitals tiles on the patient Overview).',
      },
    },
  },
  decorators: [Story => <div style={{ width: 160 }}><Story /></div>],
};

export const Rising = { args: { values: [128, 131, 129, 134, 132, 138, 142], color: 'var(--status-error)', label: 'Blood pressure rising' } };
export const Falling = { args: { values: [182, 178, 185, 174, 170, 168, 165], color: 'var(--status-success)' } };
