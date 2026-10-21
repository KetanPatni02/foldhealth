import { useMemo, useState } from 'react';
import { Drawer } from '../../../../../../components/Drawer/Drawer';
import { Button } from '../../../../../../components/Button/Button';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { SortableLanes } from '../../../../../../components/SortableLanes/SortableLanes';
import { useAppStore } from '../../../../../../store/useAppStore';
import { LANE_HINTS, LANE_LABELS, OVERVIEW_WIDGETS, normalizeOverviewLayout } from '../OverviewTab/overviewLayout';
import styles from './OverviewCustomizeDrawer.module.css';

const BY_KEY = Object.fromEntries(OVERVIEW_WIDGETS.map(w => [w.key, w]));
const HIDDEN = 'hidden';
const laneKey = i => `lane-${i}`;

const toItem = k => ({ key: k, label: BY_KEY[k].label, meta: BY_KEY[k].sample ? 'Sample data' : undefined });

function toLanes(layout) {
  return [
    ...layout.lanes.map((keys, i) => ({
      key: laneKey(i), title: LANE_LABELS[i], hint: LANE_HINTS[i], emptyText: 'Drop widgets here', items: keys.map(toItem),
    })),
    { key: HIDDEN, title: 'Hidden', hint: 'Not shown on the Overview', muted: true, emptyText: 'Drag widgets here to hide them', items: layout.hidden.map(toItem) },
  ];
}

const laneItemKeys = (lanes, key) => (lanes.find(l => l.key === key)?.items || []).map(it => it.key);

function toLayout(lanes) {
  return {
    lanes: [0, 1, 2].map(i => laneItemKeys(lanes, laneKey(i))),
    hidden: laneItemKeys(lanes, HIDDEN),
  };
}

/**
 * Overview > Customize: drag widgets between the three columns, reorder
 * them, or drag them to Hidden. Applies on Save, per user. The 2- and
 * 1-column layouts fold the same three lanes, so there is one arrangement.
 */
export function OverviewCustomizeDrawer({ layout, onSave, onClose }) {
  const showToast = useAppStore(s => s.showToast);
  const [lanes, setLanes] = useState(() => toLanes(layout));
  const defaults = useMemo(() => toLanes(normalizeOverviewLayout(undefined)), []);
  const isDefault = JSON.stringify(toLayout(lanes)) === JSON.stringify(toLayout(defaults));

  const move = (itemKey, fromKey, toKey) => setLanes(prev => {
    const item = prev.find(l => l.key === fromKey)?.items.find(i => i.key === itemKey);
    if (!item) return prev;
    return prev.map((l) => {
      if (l.key === fromKey) return { ...l, items: l.items.filter(i => i.key !== itemKey) };
      if (l.key === toKey) return { ...l, items: [...l.items, item] };
      return l;
    });
  });

  const save = () => {
    const next = toLayout(lanes);
    if (next.lanes.every(l => l.length === 0)) {
      showToast?.('Keep at least one widget shown');
      return;
    }
    onSave(next);
    showToast?.('Overview layout saved');
    onClose();
  };

  return (
    <Drawer
      title="Customize Overview"
      onClose={onClose}
      secondaryAction={(
        <Button variant="secondary" size="L" disabled={isDefault} onClick={() => setLanes(defaults)}>
          Reset to Default
        </Button>
      )}
      primaryAction={<Button variant="primary" size="L" onClick={save}>Save</Button>}
    >
      <p className={styles.intro}>
        Drag widgets between columns to arrange the Overview, or drag them to Hidden. On narrower screens Column 3
        stacks under Column 1, and with one column all three stack in order. Only you see this layout.
      </p>
      <SortableLanes
        lanes={lanes}
        onChange={setLanes}
        renderActions={(item, fromKey) => (fromKey === HIDDEN ? (
          <ActionButton icon="solar:add-circle-linear" size="S" tooltip={`Show ${item.label}`} onClick={() => move(item.key, HIDDEN, laneKey(0))} />
        ) : (
          <ActionButton icon="solar:eye-closed-linear" size="S" tooltip={`Hide ${item.label}`} onClick={() => move(item.key, fromKey, HIDDEN)} />
        ))}
      />
    </Drawer>
  );
}
