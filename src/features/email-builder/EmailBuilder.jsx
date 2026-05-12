import { useState } from 'react';
import { Reader } from '@usewaypoint/email-builder';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import { Button } from '../../components/Button/Button';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Toggle } from '../../components/Toggle/Toggle';
import { ComponentsPanel } from './ComponentsPanel';
import { PreviewCanvas } from './PreviewCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { buildParentMap } from './blockHelpers';
import styles from './EmailBuilder.module.css';

// Match the active.id and over.id strings produced in ComponentsPanel and
// PreviewCanvas to figure out the right store action.
const NEW_PREFIX = '__new:';   // dragging a tile from the panel
const EMPTY_PREFIX = '__empty:'; // dropping into an empty container/column

function parseDropTarget(overId, doc) {
  if (!overId) return null;
  if (overId.startsWith(EMPTY_PREFIX)) {
    // __empty:parentId  OR  __empty:parentId:colIdx  → append to that container
    const rest = overId.slice(EMPTY_PREFIX.length);
    const parts = rest.split(':');
    if (parts.length === 1) {
      const parent = doc[parts[0]];
      const list = parent?.data?.props?.childrenIds || [];
      return { parentId: parts[0], index: list.length };
    }
    const containerId = parts[0];
    const columnIdx = Number(parts[1]);
    const parent = doc[containerId];
    const list = parent?.data?.props?.columns?.[columnIdx]?.childrenIds || [];
    return { parentId: containerId, columnIdx, index: list.length };
  }
  // Otherwise the over id is a real block id — drop adjacent to that block.
  const map = buildParentMap(doc);
  const slot = map[overId];
  if (!slot) return null;
  return { parentId: slot.parentId, columnIdx: slot.columnIdx, index: slot.index + 1 };
}

export function EmailBuilder() {
  const name = useAppStore(s => s.editingCampaignName) || 'Edit Template';
  const closeEmailBuilder = useAppStore(s => s.closeEmailBuilder);
  const showToast = useAppStore(s => s.showToast);
  const moveBlock = useAppStore(s => s.moveBlock);
  const insertNewBlock = useAppStore(s => s.insertNewBlock);
  const [activeDrag, setActiveDrag] = useState(null);
  const [viewMode, setViewMode] = useState('builder');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragStart = (event) => {
    const id = String(event.active.id);
    if (id.startsWith(NEW_PREFIX)) {
      setActiveDrag({ kind: 'new', type: id.slice(NEW_PREFIX.length) });
    } else {
      setActiveDrag({ kind: 'block', id });
    }
  };

  const handleDragEnd = (event) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;
    const doc = useAppStore.getState().emailDocument;
    if (!doc) return;
    const target = parseDropTarget(String(over.id), doc);
    if (!target) return;

    const activeId = String(active.id);
    if (activeId.startsWith(NEW_PREFIX)) {
      insertNewBlock(activeId.slice(NEW_PREFIX.length), target);
    } else {
      moveBlock(activeId, target);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
    <div className={styles.builder}>
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <h1 className={styles.title}>Edit Template</h1>
        </div>
        <div className={styles.topCenter}>
          <Toggle
            items={[
              { key: 'builder', label: 'Builder', icon: 'solar:pen-linear' },
              { key: 'web',     label: 'Web',     icon: 'solar:monitor-linear' },
              { key: 'mobile',  label: 'Mobile',  icon: 'solar:smartphone-2-linear' },
            ]}
            active={viewMode}
            size="S"
            onChange={setViewMode}
          />
        </div>
        <div className={styles.topRight}>
          <ActionButton icon="solar:chart-2-linear" size="L" tooltip="Analytics" onClick={() => showToast('Analytics — coming soon')} />
          <ActionButton icon="solar:eye-linear" size="L" tooltip="Preview" onClick={() => showToast('Preview — coming soon')} />
          <Button
            variant="primary"
            size="L"
            onClick={() => { showToast('Template saved'); closeEmailBuilder(); }}
          >
            Save
          </Button>
          <button className={styles.closeBtn} onClick={closeEmailBuilder} aria-label="Close">
            <Icon name="solar:close-circle-linear" size={22} color="var(--neutral-300)" />
          </button>
        </div>
      </div>

      {viewMode === 'builder' ? (
        <div className={styles.body}>
          <ComponentsPanel />
          <PreviewCanvas />
          <PropertiesPanel />
        </div>
      ) : (
        <PreviewMode mode={viewMode} />
      )}
    </div>
      <DragOverlay>
        {activeDrag && (
          <div className={styles.dragOverlay}>
            {activeDrag.kind === 'new' ? `New ${activeDrag.type}` : 'Moving block'}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// Read-only preview at desktop or mobile viewport. Uses Reader directly so
// the result is exactly what the recipient would see in their email client.
function PreviewMode({ mode }) {
  const doc = useAppStore(s => s.emailDocument);
  if (!doc) return null;
  const isMobile = mode === 'mobile';
  return (
    <div className={styles.previewWrap}>
      <div
        className={isMobile ? styles.previewMobile : styles.previewDesktop}
      >
        {isMobile && <div className={styles.previewMobileNotch} />}
        <div className={styles.previewInner}>
          <Reader document={doc} rootBlockId="root" />
        </div>
      </div>
    </div>
  );
}

// Re-export Reader so consumers (e.g. the canvas) can use it
export { Reader };
