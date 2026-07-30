import { CardSkeleton } from './CardSkeleton';
import { KpiSkeleton } from '../KpiSkeleton/KpiSkeleton';
import { SimpleTableSkeleton } from '../SimpleTableSkeleton/SimpleTableSkeleton';
import { TableSkeleton as FullTableSkeleton } from '../TableSkeleton/TableSkeleton';

// The Skeleton directory exports several composed loading-state skeletons
// (no single "Skeleton" primitive). This story showcases each one.
export default {
  title: 'Feedback/Skeleton',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Loading-state placeholders — the directory exports several compositions (`CardSkeleton`, `KpiSkeleton`, `SimpleTableSkeleton`, `TableSkeleton`) rather than one primitive. Pick the shape closest to the layout you\'re replacing.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['FullTableSkeleton', 'SimpleTableSkeleton', 'CardSkeleton', 'KpiSkeleton'],
      description: 'Which skeleton composition to render.',
      table: { type: { summary: "'FullTableSkeleton' | 'SimpleTableSkeleton' | 'CardSkeleton' | 'KpiSkeleton'" }, defaultValue: { summary: 'FullTableSkeleton' } },
    },
    rows: {
      control: { type: 'number', min: 1, max: 20 },
      description: 'Row count (Table/SimpleTable).',
      table: { type: { summary: 'number' }, defaultValue: { summary: '6' } },
    },
    cols: {
      control: { type: 'number', min: 1, max: 12 },
      description: 'Column count (SimpleTable).',
      table: { type: { summary: 'number' }, defaultValue: { summary: '6' } },
    },
    count: {
      control: { type: 'number', min: 1, max: 12 },
      description: 'Card/KPI count (Card/Kpi).',
      table: { type: { summary: 'number' }, defaultValue: { summary: '4' } },
    },
  },
};

function Wrapper({ variant, rows, cols, count }) {
  if (variant === 'FullTableSkeleton') return <FullTableSkeleton rows={rows} />;
  if (variant === 'SimpleTableSkeleton') return <SimpleTableSkeleton rows={rows} cols={cols} />;
  if (variant === 'CardSkeleton') return <CardSkeleton count={count} />;
  if (variant === 'KpiSkeleton') return <KpiSkeleton count={count} />;
  return null;
}

export const Playground = {
  render: (args) => <Wrapper {...args} />,
  args: { variant: 'FullTableSkeleton', rows: 6, cols: 6, count: 4 },
};
