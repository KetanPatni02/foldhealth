import { Timeline } from './Timeline';

export default {
  title: 'Data/Timeline',
  component: Timeline,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    currentUserName: { control: 'text' },
    emptyLabel: { control: 'text' },
  },
};

const SAMPLE = [
  { id: 1, t: 'note', by: 'You', role: 'Coder', headline: 'Added a note', body: 'Confirmed diabetes with retinopathy.', at: '2026-07-22T10:00:00Z' },
  { id: 2, t: 'status', by: 'Ana Torres', role: 'QA', headline: 'Marked as Reviewed', at: '2026-07-21T15:00:00Z' },
  { id: 3, t: 'upload', by: 'You', role: 'Coder', headline: 'Uploaded chart.pdf', file: 'chart.pdf', at: '2026-07-20T09:15:00Z' },
];

export const Playground = { args: { entries: SAMPLE, currentUserName: 'You' } };
export const Empty = { args: { entries: [], emptyLabel: 'No activity yet.' } };
