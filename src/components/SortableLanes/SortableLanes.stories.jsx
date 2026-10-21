import { useState } from 'react';
import { SortableLanes } from './SortableLanes';
import { ActionButton } from '../ActionButton/ActionButton';

export default {
  title: 'Layout/SortableLanes',
  component: SortableLanes,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A kanban-style board: drag cards to reorder within a lane or move them between lanes, by pointer or keyboard. Empty lanes accept drops. Used by the patient Overview\'s Customize drawer, where the lanes are the three columns plus a muted "Hidden" lane.',
      },
    },
  },
};

const INITIAL = [
  { key: 'c1', title: 'Column 1', hint: 'Narrow, left', items: [{ key: 'synopsis', label: 'Patient Synopsis' }, { key: 'chart', label: 'Health Chart' }] },
  { key: 'c2', title: 'Column 2', hint: 'Wide, middle', items: [{ key: 'actions', label: 'Suggested Actions' }, { key: 'plan', label: 'Care Plan' }] },
  { key: 'c3', title: 'Column 3', hint: 'Narrow, right', items: [{ key: 'tasks', label: 'Tasks' }] },
  { key: 'hidden', title: 'Hidden', muted: true, emptyText: 'Drag widgets here to hide them', items: [{ key: 'insurance', label: 'Insurance', meta: 'Sample data' }] },
];

export const Default = {
  render: () => {
    const [lanes, setLanes] = useState(INITIAL);
    return (
      <div style={{ width: 680 }}>
        <SortableLanes
          lanes={lanes}
          onChange={setLanes}
          renderActions={(item, laneKey) => (
            <ActionButton
              icon={laneKey === 'hidden' ? 'solar:add-circle-linear' : 'solar:eye-closed-linear'}
              size="S"
              tooltip={laneKey === 'hidden' ? 'Show' : 'Hide'}
              onClick={() => setLanes(prev => {
                const from = prev.find(l => l.key === laneKey);
                const moved = from.items.find(i => i.key === item.key);
                const toKey = laneKey === 'hidden' ? 'c1' : 'hidden';
                return prev.map(l => (l.key === laneKey
                  ? { ...l, items: l.items.filter(i => i.key !== item.key) }
                  : l.key === toKey ? { ...l, items: [...l.items, moved] } : l));
              })}
            />
          )}
        />
      </div>
    );
  },
};
