import { QuickActionTile } from './QuickActionTile';

export default {
  title: 'Inputs/QuickActionTile',
  component: QuickActionTile,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'An icon-over-label shortcut, laid out in a grid of pinned actions (patient Overview → Quick Actions). `attention` adds a red dot for an action that is due; `attentionLabel` is announced with it.',
      },
    },
  },
};

export const Default = {
  args: { icon: 'solar:notes-linear', label: 'Add Note' },
  decorators: [Story => <div style={{ width: 96 }}><Story /></div>],
};

export const Attention = {
  args: { icon: 'solar:clipboard-check-linear', label: 'Assessment', attention: true, attentionLabel: 'PHQ-9 overdue' },
  decorators: [Story => <div style={{ width: 96 }}><Story /></div>],
};

export const Grid = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: 320 }}>
      <QuickActionTile icon="solar:notes-linear" label="Add Note" />
      <QuickActionTile icon="solar:checklist-linear" label="Add Task" />
      <QuickActionTile icon="solar:calendar-add-linear" label="Schedule" />
      <QuickActionTile icon="solar:clipboard-list-linear" label="Care Plan" />
      <QuickActionTile icon="solar:clipboard-check-linear" label="Assessment" attention attentionLabel="PHQ-9 overdue" />
      <QuickActionTile icon="solar:book-linear" label="Education" />
    </div>
  ),
};
