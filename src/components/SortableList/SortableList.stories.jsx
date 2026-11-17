import { useState } from 'react';
import { SortableItem, SortableList } from './SortableList';

export default {
  title: 'Layout/SortableList',
  component: SortableList,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Drag-to-reorder for vertical lists. Drag by the grip, or focus it and use Space + arrow keys. Pass `dragOnItem` to `SortableItem` to start a pointer drag anywhere on the item except its controls.',
      },
    },
  },
};

export const Default = {
  render: () => {
    const [ids, setIds] = useState(['Gaps', 'PAMI/Hx', 'Vitals/Labs', 'Summary']);
    return (
      <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <SortableList ids={ids} onReorder={setIds}>
          {ids.map(id => (
            <SortableItem key={id} id={id} label={id}>
              {handle => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2)', border: '0.5px solid var(--neutral-150)', borderRadius: 'var(--space-2)', background: 'var(--neutral-0)' }}>
                  {handle}
                  {id}
                </div>
              )}
            </SortableItem>
          ))}
        </SortableList>
      </div>
    );
  },
};
