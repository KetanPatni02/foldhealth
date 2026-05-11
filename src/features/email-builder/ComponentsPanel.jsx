import { useState, useRef, useEffect } from 'react';
import { useDraggable, DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '../../components/Icon/Icon';
import { useAppStore } from '../../store/useAppStore';
import { HEADER_PRESETS, FOOTER_PRESETS } from './headerFooterLibrary';
import { buildParentMap } from './blockHelpers';
import styles from './EmailBuilder.module.css';

const COMPONENTS = [
  // Row 1: text-flow basics
  { type: 'Text',      label: 'Text',     icon: 'solar:text-square-linear' },
  { type: 'Image',     label: 'Image',    icon: 'solar:gallery-linear' },
  { type: 'Button',    label: 'Button',   icon: 'solar:bolt-circle-linear' },
  // Row 2: minor decorations
  { type: 'Social',    label: 'Social',   icon: 'solar:share-linear' },
  { type: 'Divider',   label: 'Divider',  icon: 'solar:minus-square-linear' },
  { type: 'Spacer',    label: 'Spacer',   icon: 'solar:square-double-alt-arrow-up-linear' },
  // Row 3: structural
  { type: 'Hero',      label: 'Hero',     icon: 'solar:gallery-wide-linear' },
  { type: 'Container', label: 'Wrapper',  icon: 'solar:square-linear' },
  { type: 'Accordion', label: 'Accordion', icon: 'solar:list-arrow-down-linear', soon: true },
  // Row 4
  { type: 'NavBar',    label: 'Nav Bar',  icon: 'solar:hamburger-menu-linear' },
  { type: 'Group',     label: 'Group',    icon: 'solar:users-group-rounded-linear' },
  { type: 'Column',    label: 'Column',   icon: 'solar:square-bottom-down-linear' },
  // Row 5
  { type: 'Section',   label: 'Section',  icon: 'solar:gallery-rectangle-linear' },
  { type: 'Form',      label: 'Form',     icon: 'solar:document-add-linear', soon: true },
  // Row 6 — Header & Footer use a preset picker rather than a single block
  { type: 'Header',    label: 'Header',   icon: 'solar:gallery-wide-linear', preset: 'header' },
  { type: 'Footer',    label: 'Footer',   icon: 'solar:gallery-bold-linear', preset: 'footer' },
];

// Pre-configured ColumnsContainer templates so the user can drop a layout
// scaffold without manually setting columnsCount/fixedWidths.
const LAYOUTS = [
  { type: 'Layout-2-equal', label: '2 equal',         glyph: [1, 1] },
  { type: 'Layout-1-2',     label: '1 / 2',           glyph: [1, 2] },
  { type: 'Layout-2-1',     label: '2 / 1',           glyph: [2, 1] },
  { type: 'Layout-3-equal', label: '3 equal',         glyph: [1, 1, 1] },
  { type: 'Layout-1-1-2',   label: '1 / 1 / 2',       glyph: [1, 1, 2] },
];

const TYPE_LABELS = {
  EmailLayout: 'Email',
  Heading: 'Heading',
  Text: 'Text',
  Button: 'Button',
  Image: 'Image',
  Avatar: 'Avatar',
  Divider: 'Divider',
  Spacer: 'Spacer',
  Container: 'Wrapper',
  ColumnsContainer: 'Columns',
};

const TYPE_ICONS = {
  EmailLayout: 'solar:letter-linear',
  Heading: 'solar:document-text-linear',
  Text: 'solar:text-square-linear',
  Button: 'solar:bolt-circle-linear',
  Image: 'solar:gallery-linear',
  Avatar: 'solar:user-circle-linear',
  Divider: 'solar:minus-square-linear',
  Spacer: 'solar:square-double-alt-arrow-up-linear',
  Container: 'solar:layers-linear',
  ColumnsContainer: 'solar:hamburger-menu-linear',
};

export function ComponentsPanel() {
  const [tab, setTab] = useState('components');
  const [presetPicker, setPresetPicker] = useState(null); // 'header' | 'footer' | null
  const [renamingId, setRenamingId] = useState(null);
  const addBlock = useAppStore(s => s.addBlock);
  const showToast = useAppStore(s => s.showToast);
  const emailDocument = useAppStore(s => s.emailDocument);
  const editingCampaignName = useAppStore(s => s.editingCampaignName);
  const selectedBlockId = useAppStore(s => s.selectedBlockId);
  const setSelectedBlockId = useAppStore(s => s.setSelectedBlockId);
  const removeBlock = useAppStore(s => s.removeBlock);
  const replaceHeaderFooter = useAppStore(s => s.replaceHeaderFooter);

  useEffect(() => {
    const handler = (e) => {
      setTab('layers');
      setRenamingId(e.detail.id);
    };
    window.addEventListener('eb:rename', handler);
    return () => window.removeEventListener('eb:rename', handler);
  }, []);

  const handleAdd = (item) => {
    if (item.soon) { showToast(`${item.label} — coming soon`); return; }
    if (item.preset) { setPresetPicker(item.preset); return; }
    addBlock(item.type);
  };

  const handlePickPreset = (role, preset) => {
    let counter = Date.now();
    const genId = () => `block-${counter++}-${Math.random().toString(36).slice(2, 5)}`;
    const tree = preset.build(genId, editingCampaignName || 'Welcome');
    replaceHeaderFooter(role, tree);
    setPresetPicker(null);
  };

  return (
    <div className={styles.leftPanel}>
      <div className={styles.tabs}>
        <button
          className={[styles.tab, tab === 'components' ? styles.tabActive : ''].join(' ')}
          onClick={() => setTab('components')}
        >Components</button>
        <button
          className={[styles.tab, tab === 'layers' ? styles.tabActive : ''].join(' ')}
          onClick={() => setTab('layers')}
        >Layers</button>
      </div>

      <div className={styles.panelScrollFlush}>
        {tab === 'components' ? (
          <>
            <p className={styles.sectionHeading}>Content</p>
            <div className={styles.componentGrid}>
              {COMPONENTS.map(c => (
                <DraggableTile key={c.type} item={c} onClick={() => handleAdd(c)} />
              ))}
            </div>

            {presetPicker && (
              <PresetPicker
                role={presetPicker}
                presets={presetPicker === 'header' ? HEADER_PRESETS : FOOTER_PRESETS}
                onPick={(p) => handlePickPreset(presetPicker, p)}
                onClose={() => setPresetPicker(null)}
              />
            )}

            <p className={styles.sectionHeading}>Layout</p>
            <div className={styles.layoutGrid}>
              {LAYOUTS.map(l => (
                <button
                  key={l.type}
                  className={styles.layoutTile}
                  onClick={() => addBlock(l.type)}
                  title={`Add ${l.label} layout`}
                >
                  <div className={styles.layoutGlyph}>
                    {l.glyph.map((flex, i) => (
                      <div key={i} className={styles.layoutGlyphCol} style={{ flex }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <LayerList
            doc={emailDocument}
            selectedId={selectedBlockId}
            onSelect={setSelectedBlockId}
            onRemove={removeBlock}
            renamingId={renamingId}
            setRenamingId={setRenamingId}
          />
        )}
      </div>
    </div>
  );
}

function DraggableTile({ item, onClick }) {
  // Soon items can't be added or dragged.
  const draggable = useDraggable({
    id: `__new:${item.type}`,
    disabled: !!item.soon || !!item.preset,
  });
  const { attributes, listeners, setNodeRef, isDragging } = draggable;
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={[styles.componentTile, isDragging ? styles.componentTileDragging : ''].join(' ')}
      onClick={onClick}
      title={item.soon ? `${item.label} — coming soon` : `Add ${item.label}`}
    >
      <Icon name={item.icon} size={20} color="var(--neutral-300)" />
      {item.label}
    </button>
  );
}

function PresetPicker({ role, presets, onPick, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className={styles.presetPicker}>
      <div className={styles.presetPickerHeader}>
        <span>Choose a {role}</span>
        <button className={styles.presetPickerClose} onClick={onClose} aria-label="Close">
          <Icon name="solar:close-circle-linear" size={14} color="currentColor" />
        </button>
      </div>
      {presets.map(p => (
        <button key={p.id} className={styles.presetPickerItem} onClick={() => onPick(p)}>
          <div className={styles.presetThumb} style={{ background: p.accent + '22' }}>
            <div className={styles.presetThumbBar} style={{ background: p.accent }} />
          </div>
          <div className={styles.presetText}>
            <div className={styles.presetTitle}>{p.label}</div>
            <div className={styles.presetDesc}>{p.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function layerLabel(block) {
  if (block.data?.alias) return block.data.alias;
  const role = block.data?.role;
  if (role === 'header') return 'Header';
  if (role === 'body') return 'Body';
  if (role === 'footer') return 'Footer';
  if (block.type === 'Heading' || block.type === 'Text') {
    return `${TYPE_LABELS[block.type]}: ${(block.data?.props?.text || '').slice(0, 22)}`;
  }
  return TYPE_LABELS[block.type] || block.type;
}

function layerIcon(block) {
  const role = block.data?.role;
  if (role === 'header') return 'solar:gallery-wide-linear';
  if (role === 'body') return 'solar:document-text-linear';
  if (role === 'footer') return 'solar:gallery-bold-linear';
  return TYPE_ICONS[block.type] || 'solar:square-linear';
}

const STRUCTURAL_ROLES = new Set(['header', 'body', 'footer']);

function LayerList({ doc, selectedId, onSelect, onRemove, renamingId, setRenamingId }) {
  if (!doc) return null;
  const moveBlock = useAppStore(s => s.moveBlock);
  const updateBlock = useAppStore(s => s.updateBlock);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const allSortableIds = [];
  const collectIds = (childrenIds) => {
    (childrenIds || []).forEach(id => {
      const block = doc[id];
      if (!block) return;
      allSortableIds.push(id);
      const props = block.data?.props || {};
      if (Array.isArray(props.childrenIds)) collectIds(props.childrenIds);
      if (Array.isArray(props.columns)) props.columns.forEach(c => collectIds(c.childrenIds || []));
    });
  };
  collectIds(doc.root.data.childrenIds || []);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const overId = String(over.id);
    const activeId = String(active.id);
    const overBlock = doc[overId];
    if (!overBlock) return;
    const map = buildParentMap(doc);
    const overSlot = map[overId];
    if (!overSlot) return;
    moveBlock(activeId, { parentId: overSlot.parentId, columnIdx: overSlot.columnIdx, index: overSlot.index });
  };

  const ctx = { doc, selectedId, onSelect, onRemove, renamingId, setRenamingId, updateBlock };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={allSortableIds} strategy={verticalListSortingStrategy}>
        <div className={styles.layerList}>
          <LayerChildren childrenIds={doc.root.data.childrenIds || []} depth={0} ctx={ctx} />
        </div>
      </SortableContext>
    </DndContext>
  );
}

function LayerChildren({ childrenIds, depth, ctx }) {
  return (childrenIds || []).map(id => {
    const block = ctx.doc[id];
    if (!block) return null;
    return <LayerRow key={id} id={id} block={block} depth={depth} ctx={ctx} />;
  });
}

function LayerRow({ id, block, depth, ctx }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [expanded, setExpanded] = useState(true);
  const renameInputRef = useRef(null);
  const isRenaming = ctx.renamingId === id;
  const props = block.data?.props || {};
  const hasChildren = Array.isArray(props.childrenIds) && props.childrenIds.length > 0;
  const hasColumns = Array.isArray(props.columns) && props.columns.some(c => (c.childrenIds || []).length > 0);
  const isExpandable = hasChildren || hasColumns;
  const isStructural = STRUCTURAL_ROLES.has(block.data?.role);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const commitRename = (value) => {
    const trimmed = value.trim();
    ctx.updateBlock(id, prev => ({
      ...prev,
      data: { ...prev.data, alias: trimmed || undefined },
    }));
    ctx.setRenamingId(null);
  };

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={[styles.layerRow, ctx.selectedId === id ? styles.layerRowActive : ''].join(' ')}
        onClick={() => ctx.onSelect(id)}
        onDoubleClick={() => ctx.setRenamingId(id)}
      >
        <span style={{ width: depth * 16, flexShrink: 0 }} />
        {isExpandable ? (
          <button
            className={styles.layerExpandBtn}
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <Icon name={expanded ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'} size={12} color="currentColor" />
          </button>
        ) : (
          <span style={{ width: 16, flexShrink: 0 }} />
        )}
        <Icon name={layerIcon(block)} size={14} color="currentColor" />
        {isRenaming ? (
          <input
            ref={renameInputRef}
            className={styles.layerRenameInput}
            defaultValue={block.data?.alias || layerLabel(block)}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => commitRename(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') commitRename(e.target.value);
              if (e.key === 'Escape') ctx.setRenamingId(null);
            }}
          />
        ) : (
          <span className={styles.layerRowText}>{layerLabel(block)}</span>
        )}
        {!isStructural && (
          <button
            className={styles.layerRemove}
            onClick={(e) => { e.stopPropagation(); ctx.onRemove(id); }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Delete"
          >
            <Icon name="solar:trash-bin-trash-linear" size={14} color="currentColor" />
          </button>
        )}
      </div>
      {expanded && hasChildren && (
        <LayerChildren childrenIds={props.childrenIds} depth={depth + 1} ctx={ctx} />
      )}
      {expanded && hasColumns && props.columns.map((col, ci) => (
        (col.childrenIds || []).length > 0 && (
          <LayerChildren key={ci} childrenIds={col.childrenIds} depth={depth + 1} ctx={ctx} />
        )
      ))}
    </>
  );
}
