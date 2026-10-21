import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, getFirstCollision, pointerWithin,
  rectIntersection, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '../SortableList/SortableList';
import { Icon } from '../Icon/Icon';
import styles from './SortableLanes.module.css';

/**
 * SortableLanes: a kanban-style board for arranging items across lanes.
 * Cards drag within a lane to reorder and between lanes to move, by pointer
 * or keyboard (focus a grip, Space, arrows, Space). Empty lanes still accept
 * drops. Used by the patient Overview's Customize drawer (lanes are columns
 * plus a "hidden" lane).
 *
 * Controlled: `lanes` in, the whole next `lanes` out through `onChange` when
 * a drag ends. During a drag the board previews the move locally.
 *
 * @param {Array<{ key: string, title: string, hint?: string, muted?: boolean, emptyText?: string,
 *   items: Array<{ key: string, label: string, meta?: string }> }>} props.lanes
 * @param {(lanes) => void} props.onChange
 * @param {(item, laneKey) => React.ReactNode} [props.renderActions] – controls on each card (show / hide)
 */
export function SortableLanes({ lanes, onChange, renderActions }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [preview, setPreview] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const shown = preview || lanes;
  // Collision detection runs outside render, so it reads lanes from a ref.
  const shownRef = useRef(shown);
  useLayoutEffect(() => { shownRef.current = shown; });

  // The lane under the pointer wins, then the nearest card inside it.
  // closestCorners alone lets a big neighbouring lane steal the drop.
  const collisionDetection = useCallback((args) => {
    const pointer = pointerWithin(args);
    const overId = getFirstCollision(pointer.length ? pointer : rectIntersection(args), 'id');
    if (overId == null) return [];
    const lane = shownRef.current.find(l => l.key === overId);
    if (lane && lane.items.length) {
      const keys = new Set(lane.items.map(i => i.key));
      const inLane = closestCenter({ ...args, droppableContainers: args.droppableContainers.filter(c => keys.has(c.id)) });
      if (inLane.length) return inLane;
    }
    return [{ id: overId }];
  }, []);

  const laneOf = (id, from = shown) => (
    from.find(l => l.key === id) || from.find(l => l.items.some(i => i.key === id))
  );
  const activeItem = activeId ? shown.flatMap(l => l.items).find(i => i.key === activeId) : null;

  const finish = () => { setPreview(null); setActiveId(null); };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={({ active }) => { setActiveId(active.id); setPreview(lanes); }}
      onDragCancel={finish}
      onDragOver={({ active, over }) => {
        if (!over) return;
        const from = laneOf(active.id);
        const to = laneOf(over.id);
        if (!from || !to || from.key === to.key) return;
        // Crossing into another lane: move the card there now so the target
        // lane opens a gap, at the hovered card's position (or the end).
        setPreview(prev => prev.map((l) => {
          if (l.key === from.key) return { ...l, items: l.items.filter(i => i.key !== active.id) };
          if (l.key !== to.key) return l;
          const item = from.items.find(i => i.key === active.id);
          const at = l.items.findIndex(i => i.key === over.id);
          const items = [...l.items];
          items.splice(at < 0 ? items.length : at, 0, item);
          return { ...l, items };
        }));
      }}
      onDragEnd={({ active, over }) => {
        const current = preview || lanes;
        finish();
        if (!over) return;
        const lane = laneOf(active.id, current);
        const overIndex = lane.items.findIndex(i => i.key === over.id);
        const activeIndex = lane.items.findIndex(i => i.key === active.id);
        const next = overIndex >= 0 && overIndex !== activeIndex
          ? current.map(l => (l.key === lane.key ? { ...l, items: arrayMove(l.items, activeIndex, overIndex) } : l))
          : current;
        if (JSON.stringify(next) !== JSON.stringify(lanes)) onChange(next);
      }}
    >
      <div className={styles.board}>
        {shown.map(lane => (
          <Lane key={lane.key} lane={lane} renderActions={renderActions} />
        ))}
      </div>
      <DragOverlay>
        {activeItem ? (
          <div className={`${styles.card} ${styles.overlay}`}>
            <span className={styles.grip}><Icon name="custom:drag-handle" size={16} color="var(--neutral-300)" /></span>
            <span className={styles.label}>{activeItem.label}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Lane({ lane, renderActions }) {
  const { setNodeRef, isOver } = useDroppable({ id: lane.key });
  return (
    <section className={[styles.lane, lane.muted ? styles.muted : ''].join(' ')} aria-label={lane.title}>
      <header className={styles.laneHeader}>
        <span className={styles.laneTitle}>{lane.title}</span>
        <span className={styles.count}>{lane.items.length}</span>
      </header>
      {lane.hint && <span className={styles.hint}>{lane.hint}</span>}
      <SortableContext id={lane.key} items={lane.items.map(i => i.key)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={[styles.laneBody, isOver ? styles.over : ''].join(' ')}>
          {lane.items.length === 0 && <span className={styles.empty}>{lane.emptyText || 'Drop items here'}</span>}
          {lane.items.map(item => (
            <SortableItem key={item.key} id={item.key} label={item.label} dragOnItem className={styles.card}>
              {handle => (
                <>
                  {handle}
                  <span className={styles.text}>
                    <span className={styles.label}>{item.label}</span>
                    {item.meta && <span className={styles.meta}>{item.meta}</span>}
                  </span>
                  {renderActions && <span className={styles.actions}>{renderActions(item, lane.key)}</span>}
                </>
              )}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </section>
  );
}
