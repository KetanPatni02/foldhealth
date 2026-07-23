import { Timeline } from './Timeline';

export default {
  title: 'Data/Timeline',
  component: Timeline,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Vertical activity feed grouped by month. Each entry renders with an icon, actor, headline, and (optional) body.',
      },
    },
  },
  argTypes: {
    entries: {
      control: 'object',
      description: 'Activity entries in reverse-chronological order.',
      table: {
        type: {
          summary:
            "Array<{ id, t: 'note'|'status'|'upload'|…, by, role, headline, body?, file?, at: ISOString }>",
        },
      },
    },
    currentUserName: {
      control: 'text',
      description: 'Name of the current user — used to render "You" replacements.',
      table: { type: { summary: 'string' } },
    },
    emptyLabel: {
      control: 'text',
      description: 'Shown when `entries` is empty.',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'No activity yet.' } },
    },
    renderExtra: {
      description: 'Optional render prop for injecting custom content per entry.',
      table: { type: { summary: '(entry) => React.ReactNode' } },
    },
  },
};

const SAMPLE = [
  { id: 1, t: 'note', by: 'You', role: 'Coder', headline: 'Added a note', body: 'Confirmed diabetes with retinopathy.', at: '2026-07-22T10:00:00Z' },
  { id: 2, t: 'status', by: 'Ana Torres', role: 'QA', headline: 'Marked as Reviewed', at: '2026-07-21T15:00:00Z' },
  { id: 3, t: 'upload', by: 'You', role: 'Coder', headline: 'Uploaded chart.pdf', file: 'chart.pdf', at: '2026-07-20T09:15:00Z' },
];

export const Playground = { args: { entries: SAMPLE, currentUserName: 'You' } };
export const Empty = { args: { entries: [], emptyLabel: 'No activity yet.' } };
