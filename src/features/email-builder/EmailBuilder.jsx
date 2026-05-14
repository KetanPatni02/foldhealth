import { useState, useEffect, useCallback, useRef } from 'react';
import { Reader } from '@usewaypoint/email-builder';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import { Button } from '../../components/Button/Button';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Toggle } from '../../components/Toggle/Toggle';
import { ConfirmDialog } from '../../components/Modal/ConfirmDialog';
import { CloseButton } from '../../components/CloseButton/CloseButton';
import { ComponentsPanel } from './ComponentsPanel';
import { PreviewCanvas } from './PreviewCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { DevicePreview } from './DevicePreview';
import { renderEmailHtml } from './patchEmailHtml';
import { SendTestPopover } from './SendTestPopover';
import { SelectionToolbar } from './SelectionToolbar';
import { buildParentMap } from './blockHelpers';
import styles from './EmailBuilder.module.css';

function getFirstChild(doc, id) {
  if (id === 'root') return doc.root?.data?.childrenIds?.[0] || null;
  const block = doc[id];
  if (!block) return null;
  const props = block.data?.props || {};
  if (Array.isArray(props.childrenIds) && props.childrenIds.length > 0) return props.childrenIds[0];
  if (Array.isArray(props.columns)) {
    for (const col of props.columns) {
      if (col.childrenIds?.length > 0) return col.childrenIds[0];
    }
  }
  return null;
}

function getParentId(doc, id) {
  if (id === 'root') return null;
  const map = buildParentMap(doc);
  return map[id]?.parentId || null;
}

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


const SHORTCUTS = [
  { keys: '⌘Z', label: 'Undo' },
  { keys: '⇧⌘Z', label: 'Redo' },
  { keys: '⌘D', label: 'Duplicate block' },
  { keys: '⌘R', label: 'Rename layer' },
  { keys: 'Enter', label: 'Select first child / bulk-select children' },
  { keys: '⇧Enter', label: 'Select parent' },
  { keys: 'Esc', label: 'Clear bulk selection' },
  { keys: '⌫', label: 'Delete selected block' },
];

function ShortcutsHelpButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <ActionButton
        icon="solar:question-circle-linear"
        size="L"
        tooltip="Keyboard shortcuts"
        onClick={() => setOpen(o => !o)}
      />
      {open && (
        <div className={styles.shortcutsPopover}>
          <div className={styles.shortcutsTitle}>Keyboard shortcuts</div>
          {SHORTCUTS.map(s => (
            <div key={s.label} className={styles.shortcutRow}>
              <kbd className={styles.shortcutKey}>{s.keys}</kbd>
              <span className={styles.shortcutLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function countChanges(a, b) {
  if (!a || !b) return 0;
  let n = 0;
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of allKeys) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) n++;
  }
  return n;
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function EmailBuilder() {
  const name = useAppStore(s => s.editingCampaignName) || 'Untitled Template';
  const setName = useAppStore(s => s.setEditingCampaignName);
  const closeEmailBuilder = useAppStore(s => s.closeEmailBuilder);
  const saveEmailTemplate = useAppStore(s => s.saveEmailTemplate);
  const showToast = useAppStore(s => s.showToast);
  const moveBlock = useAppStore(s => s.moveBlock);
  const insertNewBlock = useAppStore(s => s.insertNewBlock);
  const emailDocument = useAppStore(s => s.emailDocument);
  const undoEmailEdit = useAppStore(s => s.undoEmailEdit);
  const redoEmailEdit = useAppStore(s => s.redoEmailEdit);
  const canUndo = useAppStore(s => s.emailHistory.length > 0);
  const canRedo = useAppStore(s => s.emailFuture.length > 0);
  const pendingNavTarget = useAppStore(s => s.pendingNavTarget);
  const setPendingNavTarget = useAppStore(s => s.setPendingNavTarget);
  const setActivePage = useAppStore(s => s.setActivePage);
  const [activeDrag, setActiveDrag] = useState(null);
  const [viewMode, setViewMode] = useState('builder');
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  // `pendingClose` carries what should happen after the unsaved-changes
  // confirm dialog resolves: a plain close, or a close+navigate to another
  // sidebar page that the user clicked while editing.
  const [pendingClose, setPendingClose] = useState(null);
  // null | { reason: 'close' } | { reason: 'nav', target: 'home' }
  const showCloseConfirm = pendingClose !== null;
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (emailDocument && !savedSnapshot) setSavedSnapshot(structuredClone(emailDocument));
  }, []);

  const unsavedCount = savedSnapshot ? countChanges(savedSnapshot, emailDocument) : 0;

  // Sidebar click while EmailBuilder is open → either silently leave (no
  // unsaved changes) or pop the confirm dialog so the user doesn't lose work.
  useEffect(() => {
    if (!pendingNavTarget) return;
    if (unsavedCount > 0) {
      setPendingClose({ reason: 'nav', target: pendingNavTarget });
    } else {
      closeEmailBuilder();
      setActivePage(pendingNavTarget);
      setPendingNavTarget(null);
    }
    // unsavedCount intentionally excluded — we only act when the *intent* to
    // navigate fires; we don't want a passing edit during the dialog to
    // re-trigger this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNavTarget]);

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
      const s = useAppStore.getState();
      const doc = s.emailDocument;
      const id = s.selectedBlockId;
      if (!doc) return;

      const isMeta = e.metaKey || e.ctrlKey;

      // Cmd+Z — undo, Cmd+Shift+Z — redo. Allowed even inside text inputs.
      if (isMeta && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) s.redoEmailEdit();
        else s.undoEmailEdit();
        return;
      }

      if (!id) return;

      // Cmd+D — duplicate
      if (isMeta && e.key === 'd') {
        e.preventDefault();
        if (id !== 'root') s.duplicateBlock(id);
        return;
      }

      // Cmd+R — rename layer
      if (isMeta && e.key === 'r') {
        e.preventDefault();
        if (id !== 'root') {
          window.dispatchEvent(new CustomEvent('eb:rename', { detail: { id } }));
        }
        return;
      }

      if (isEditable) return;

      // Enter — bulk-select children if container, otherwise select first child
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const block = id === 'root' ? doc.root : doc[id];
        const blockType = block?.type;
        if (blockType === 'Container' || blockType === 'ColumnsContainer') {
          const p = block.data?.props || {};
          let childIds = [];
          if (blockType === 'Container') {
            childIds = p.childrenIds || [];
          } else {
            (p.columns || []).forEach(col => { childIds.push(...(col.childrenIds || [])); });
          }
          if (childIds.length > 0) {
            s.setBulkSelectedIds(childIds);
            return;
          }
        }
        const child = getFirstChild(doc, id);
        if (child) s.setSelectedBlockId(child);
        return;
      }

      // Shift+Enter — select parent
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        const parent = getParentId(doc, id);
        if (parent) s.setSelectedBlockId(parent);
        return;
      }

      // Escape — clear bulk selection
      if (e.key === 'Escape') {
        if (s.bulkSelectedIds.length > 0) {
          e.preventDefault();
          s.setBulkSelectedIds([]);
          return;
        }
      }

      // Delete / Backspace — remove block
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (id !== 'root') s.removeBlock(id);
        return;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

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
      // Bulk drag: if the user has multiple blocks selected and dragged
      // one of them, move all of them to the same drop target in their
      // original order. Skip duplicates: if a bulk id was the dragged one
      // we still move it once at the target index.
      const bulkIds = useAppStore.getState().bulkSelectedIds;
      const isBulk = bulkIds.length > 1 && bulkIds.includes(activeId);
      if (isBulk) {
        // Move the dragged block first, then insert the rest right after
        // it (each subsequent moveBlock keeps the new doc state, so we
        // re-resolve the parent's childrenIds between calls). Doing them
        // in DOM order preserves the group's vertical sequence.
        const ordered = bulkIds.slice().sort((a, b) => bulkIds.indexOf(a) - bulkIds.indexOf(b));
        let nextTarget = target;
        ordered.forEach((id, idx) => {
          moveBlock(id, { ...nextTarget, index: nextTarget.index + idx });
        });
      } else {
        moveBlock(activeId, target);
      }
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
          <input
            className={styles.titleInput}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
            spellCheck={false}
          />
        </div>
        <div className={styles.topCenter}>
          <Toggle
            items={[
              { key: 'builder', label: 'Builder', icon: 'solar:pen-new-square-linear' },
              { key: 'desktop', label: 'Desktop', icon: 'solar:monitor-linear' },
              { key: 'mobile', label: 'Mobile', icon: 'solar:smartphone-linear' },
            ]}
            active={viewMode}
            onChange={setViewMode}
            size="S"
          />
        </div>
        <div className={styles.topRight} style={{ position: 'relative' }}>
          <ActionButton
            icon="solar:undo-left-linear"
            size="L"
            tooltip="Undo (⌘Z)"
            state={canUndo ? 'active' : 'disabled'}
            onClick={undoEmailEdit}
          />
          <ActionButton
            icon="solar:undo-right-linear"
            size="L"
            tooltip="Redo (⇧⌘Z)"
            state={canRedo ? 'active' : 'disabled'}
            onClick={redoEmailEdit}
          />
          <ShortcutsHelpButton />
          <Button
            variant="secondary"
            size="L"
            leadingIcon="solar:letter-linear"
            onClick={() => setShowTestEmail(v => !v)}
          >
            Test Mail
          </Button>
          {showTestEmail && (
            <SendTestPopover
              campaignId={useAppStore.getState().editingCampaignId}
              onClose={() => setShowTestEmail(false)}
            />
          )}
          {lastSavedAt && unsavedCount === 0 && (
            <span className={styles.saveStatus}>
              <Icon name="solar:check-circle-linear" size={14} color="var(--status-success)" />
              Saved at {formatTime(lastSavedAt)}
            </span>
          )}
          {unsavedCount > 0 && (
            <span className={styles.saveStatus} style={{ color: 'var(--status-warning)' }}>
              <Icon name="solar:pen-2-linear" size={14} color="var(--status-warning)" />
              {unsavedCount} unsaved change{unsavedCount !== 1 ? 's' : ''}
            </span>
          )}
          <Button
            variant="primary"
            size="L"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              const ok = await saveEmailTemplate();
              setSaving(false);
              if (ok) {
                setLastSavedAt(new Date());
                setSavedSnapshot(structuredClone(useAppStore.getState().emailDocument));
                showToast('Template saved');
              } else {
                showToast('Save failed — check console');
              }
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <CloseButton
            size={18}
            onClick={() => unsavedCount > 0 ? setPendingClose({ reason: 'close' }) : closeEmailBuilder()}
          />
        </div>
      </div>

      {viewMode === 'builder' ? (
        <div className={styles.body}>
          <ComponentsPanel />
          <PreviewCanvas />
          <PropertiesPanel />
        </div>
      ) : (
        <DevicePreview device={viewMode} />
      )}
    </div>
      <DragOverlay>
        {activeDrag && (
          <div className={styles.dragOverlay}>
            {activeDrag.kind === 'new' ? `New ${activeDrag.type}` : 'Moving block'}
          </div>
        )}
      </DragOverlay>
      {/* Floating selection toolbar — appears when text is selected inside
          any Text/Heading block on the canvas. Range-level B/I/U/S/Code/Link
          via execCommand; block-level "Text" style dropdown for quick presets. */}
      <SelectionToolbar />
      {showCloseConfirm && (
        <ConfirmDialog
          icon="solar:danger-triangle-linear"
          iconColor="var(--status-warning)"
          title="Unsaved changes"
          description={`You have ${unsavedCount} unsaved change${unsavedCount !== 1 ? 's' : ''}. Are you sure you want to ${pendingClose?.reason === 'nav' ? 'leave' : 'close'} without saving?`}
          confirmLabel={pendingClose?.reason === 'nav' ? 'Discard & Leave' : 'Discard & Close'}
          cancelLabel="Keep Editing"
          variant="error"
          onConfirm={() => {
            const target = pendingClose;
            setPendingClose(null);
            closeEmailBuilder();
            if (target?.reason === 'nav' && target.target) {
              setActivePage(target.target);
              setPendingNavTarget(null);
            }
          }}
          onCancel={() => {
            // User chose to stay — cancel the pending nav (if any) without
            // touching the editing state.
            if (pendingClose?.reason === 'nav') setPendingNavTarget(null);
            setPendingClose(null);
          }}
        />
      )}
    </DndContext>
  );
}

// Re-export Reader so consumers (e.g. the canvas) can use it
export { Reader };
