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
  { type: 'Social',    label: 'Social',   icon: 'solar:share-circle-linear' },
  { type: 'Divider',   label: 'Divider',  icon: 'solar:minus-square-linear' },
  { type: 'Spacer',    label: 'Spacer',   icon: 'solar:paragraph-spacing-linear' },
  // Row 3: structural
  { type: 'Hero',      label: 'Hero',     icon: 'solar:laptop-minimalistic-linear' },
  { type: 'Container', label: 'Wrapper',  icon: null, customIcon: 'group' },
  { type: 'Accordion', label: 'Accordion', icon: 'solar:list-arrow-down-linear', soon: true },
  // Row 4
  { type: 'NavBar',    label: 'Nav Bar',  icon: 'solar:hamburger-menu-linear' },
  { type: 'Column',    label: 'Column',   icon: null, customIcon: true },
  // Row 5
  { type: 'Section',   label: 'Section',  icon: 'solar:align-vertical-spacing-linear' },
  { type: 'Form',      label: 'Form',     icon: 'solar:document-add-linear', soon: true },
  { type: 'Table',     label: 'Table',    icon: null, customIcon: 'table' },
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
  Social: 'Social',
  NavBar: 'Nav Bar',
  Table: 'Table',
};

const TYPE_ICONS = {
  EmailLayout: 'solar:letter-linear',
  Heading: 'solar:document-text-linear',
  Text: 'solar:text-square-linear',
  Button: 'solar:bolt-circle-linear',
  Image: 'solar:gallery-linear',
  Avatar: 'solar:user-circle-linear',
  Divider: 'solar:minus-square-linear',
  Spacer: 'solar:paragraph-spacing-linear',
  Container: 'solar:layers-linear',
  ColumnsContainer: 'solar:hamburger-menu-linear',
  Social: 'solar:share-circle-linear',
  NavBar: 'solar:hamburger-menu-linear',
  Table: 'solar:widget-2-linear',
};

function ColumnIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.74144L11.9626 1.99237L12 2.74144ZM12 29.2612L11.9626 30.0102L12 29.2612ZM20 2.74144L20.0373 1.99237L20 2.74144ZM20 29.2612L20.0373 30.0102L20 29.2612ZM2.66663 16.0013H1.91663C1.91663 19.1228 1.91503 21.5394 2.16739 23.4164C2.42265 25.315 2.95003 26.7735 4.08892 27.9123L4.61925 27.382L5.14958 26.8517C4.33584 26.0379 3.88691 24.9488 3.65402 23.2165C3.41822 21.4627 3.41663 19.1652 3.41663 16.0013H2.66663ZM29.3333 16.0013H28.5833C28.5833 19.1652 28.5817 21.4627 28.3459 23.2165C28.113 24.9488 27.6641 26.0379 26.8503 26.8517L27.3807 27.382L27.911 27.9123C29.0499 26.7735 29.5773 25.315 29.8325 23.4164C30.0849 21.5394 30.0833 19.1228 30.0833 16.0013H29.3333ZM29.3333 16.0013H30.0833C30.0833 12.8798 30.0849 10.4632 29.8325 8.58622C29.5773 6.68763 29.0499 5.22915 27.911 4.09026L27.3807 4.62059L26.8503 5.15092C27.6641 5.96465 28.113 7.05383 28.3459 8.78609C28.5817 10.5399 28.5833 12.8374 28.5833 16.0013H29.3333ZM2.66663 16.0013H3.41663C3.41663 12.8374 3.41822 10.5399 3.65402 8.78609C3.88691 7.05383 4.33584 5.96465 5.14958 5.15092L4.61925 4.62059L4.08892 4.09026C2.95003 5.22915 2.42265 6.68763 2.16739 8.58622C1.91503 10.4632 1.91663 12.8798 1.91663 16.0013H2.66663ZM16 2.66797V1.91797C13.891 1.91797 13.4558 1.91793 11.9626 1.99237L12 2.74144L12.0373 3.49051C13.4918 3.418 13.8966 3.41797 16 3.41797V2.66797ZM12 2.74144L11.9626 1.99237C10.4829 2.06613 8.91508 2.21406 7.53889 2.51627C6.19302 2.81181 4.89762 3.28156 4.08892 4.09026L4.61925 4.62059L5.14958 5.15092C5.6392 4.6613 6.57185 4.26436 7.86061 3.98136C9.11904 3.70501 10.5924 3.56253 12.0373 3.49051L12 2.74144ZM16 29.3346V28.5846C13.8966 28.5846 13.4918 28.5846 12.0373 28.5121L12 29.2612L11.9626 30.0102C13.4558 30.0847 13.891 30.0846 16 30.0846V29.3346ZM12 29.2612L12.0373 28.5121C10.5924 28.4401 9.11904 28.2976 7.86061 28.0212C6.57185 27.7382 5.6392 27.3413 5.14958 26.8517L4.61925 27.382L4.08892 27.9123C4.89762 28.721 6.19302 29.1908 7.53889 29.4863C8.91508 29.7885 10.4829 29.9365 11.9626 30.0102L12 29.2612ZM12 2.74144H11.25V29.2612H12H12.75V2.74144H12ZM16 2.66797V3.41797C18.1033 3.41797 18.5081 3.418 19.9626 3.49051L20 2.74144L20.0373 1.99237C18.5441 1.91793 18.1089 1.91797 16 1.91797V2.66797ZM20 2.74144L19.9626 3.49051C21.4075 3.56253 22.8809 3.70501 24.1393 3.98136C25.4281 4.26436 26.3607 4.6613 26.8503 5.15092L27.3807 4.62059L27.911 4.09026C27.1023 3.28156 25.8069 2.81181 24.461 2.51627C23.0848 2.21406 21.517 2.06613 20.0373 1.99237L20 2.74144ZM16 29.3346V30.0846C18.1089 30.0846 18.5441 30.0847 20.0373 30.0102L20 29.2612L19.9626 28.5121C18.5081 28.5846 18.1033 28.5846 16 28.5846V29.3346ZM20 29.2612L20.0373 30.0102C21.517 29.9365 23.0848 29.7885 24.461 29.4863C25.8069 29.1908 27.1023 28.721 27.911 27.9123L27.3807 27.382L26.8503 26.8517C26.3607 27.3413 25.4281 27.7382 24.1393 28.0212C22.8809 28.2976 21.4075 28.4401 19.9626 28.5121L20 29.2612ZM20 2.74144L19.25 2.74144L19.25 29.2612H20H20.75L20.75 2.74144L20 2.74144Z" fill={color} />
    </svg>
  );
}

function TableIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.33329 10.742H28.6666M2.66663 19.8902H29.3333M16 11.2235V29.3346M13.3333 29.3346C13.106 29.3346 12.8838 29.3346 12.6666 29.3345C10.3993 29.3328 8.67629 29.3136 7.33329 29.0946C5.95923 28.8704 4.98299 28.437 4.22872 27.599C2.66663 25.8633 2.66663 23.0698 2.66663 17.4828V14.5198C2.66663 8.9328 2.66663 6.1393 4.22872 4.40363C5.79082 2.66797 8.30498 2.66797 13.3333 2.66797H18.6666C23.6949 2.66797 26.2091 2.66797 27.7712 4.40363C29.3333 6.1393 29.3333 8.9328 29.3333 14.5198V17.4828C29.3333 23.0698 29.3333 25.8633 27.7712 27.599C26.793 28.6858 25.4416 29.0921 23.3333 29.244C22.0747 29.3346 20.5463 29.3346 18.6666 29.3346H13.3333Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GroupIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z" stroke={color} strokeLinecap="round" strokeDasharray="2 2" />
    </svg>
  );
}

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
                <DraggableLayoutTile key={l.type} layout={l} onClick={() => addBlock(l.type)} />
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
      {item.customIcon === true && <ColumnIcon size={20} color="var(--neutral-300)" />}
      {item.customIcon === 'table' && <TableIcon size={20} color="var(--neutral-300)" />}
      {item.customIcon === 'group' && <GroupIcon size={20} color="var(--neutral-300)" />}
      {!item.customIcon && <Icon name={item.icon} size={20} color="var(--neutral-300)" />}
      {item.label}
    </button>
  );
}

function DraggableLayoutTile({ layout, onClick }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `__new:${layout.type}`,
  });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={[styles.layoutTile, isDragging ? styles.componentTileDragging : ''].join(' ')}
      onClick={onClick}
      title={`Add ${layout.label} layout`}
    >
      <div className={styles.layoutGlyph}>
        {layout.glyph.map((flex, i) => (
          <div key={i} className={styles.layoutGlyphCol} style={{ flex }} />
        ))}
      </div>
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
