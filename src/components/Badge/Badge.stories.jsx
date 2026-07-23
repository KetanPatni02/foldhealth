import { Badge } from './Badge';

export default {
  title: 'Core/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A small pill that surfaces status, category, or scoring at a glance — the shared visual for LACE risk, TOC engagement, worklist status, AI signal buckets, and outreach windows. Pick a `variant` to inherit the semantic color pair from tokens; add an `icon`, `trailingIcon`, or leading `dot` when the meaning benefits from it. Keep the label short (one or two words, or a count).',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'status-completed', 'status-scheduled', 'status-queued', 'status-failed',
        'lace-high', 'lace-medium', 'lace-low',
        'toc-enrolled', 'toc-engaged', 'toc-attempted', 'toc-new', 'toc-oncall',
        'outreach-48h', 'outreach-7d', 'ai-care',
      ],
      description: 'Visual variant',
    },
    label: { control: 'text', description: 'Badge text' },
    icon: { control: 'text', description: 'Optional Solar icon name' },
    dot: { control: 'boolean', description: 'Show leading dot' },
  },
};

export const Playground = {
  args: { variant: 'status-completed', label: 'Completed' },
};

export const AllVariants = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {[
        ['status-completed', 'Completed'], ['status-scheduled', 'Scheduled'], ['status-queued', '6'], ['status-failed', 'Failed'],
        ['lace-high', 'High'], ['lace-medium', 'Medium'], ['lace-low', 'Low'],
        ['toc-enrolled', 'Enrolled'], ['toc-new', 'New'], ['ai-care', 'RAF +0.3'],
        ['outreach-48h', 'TOC 48h'], ['outreach-7d', 'TOC 7d'],
      ].map(([v, l]) => <Badge key={v} variant={v} label={l} />)}
    </div>
  ),
};
