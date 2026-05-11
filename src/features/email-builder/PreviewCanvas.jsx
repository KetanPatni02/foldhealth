import { useState, useRef, useCallback } from 'react';
import { Reader } from '@usewaypoint/email-builder';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import { InlineEditable } from './InlineEditable';
import styles from './EmailBuilder.module.css';

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
  Table: 'Table',
};

function blockLabel(block) {
  const role = block.data?.role;
  if (role === 'header') return 'Header';
  if (role === 'body') return 'Body';
  if (role === 'footer') return 'Footer';
  return TYPE_LABELS[block.type] || block.type;
}

function paddingCss(p) {
  if (!p) return undefined;
  return `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;
}

// Six-dot drag handle that matches the Figma toolbar precisely.
function DragHandleDots() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
      <circle cx="3" cy="3" r="1.2" fill="#fff" />
      <circle cx="9" cy="3" r="1.2" fill="#fff" />
      <circle cx="3" cy="7" r="1.2" fill="#fff" />
      <circle cx="9" cy="7" r="1.2" fill="#fff" />
      <circle cx="3" cy="11" r="1.2" fill="#fff" />
      <circle cx="9" cy="11" r="1.2" fill="#fff" />
    </svg>
  );
}

export function PreviewCanvas() {
  const doc = useAppStore(s => s.emailDocument);
  const selectedBlockId = useAppStore(s => s.selectedBlockId);
  const bulkSelectedIds = useAppStore(s => s.bulkSelectedIds);
  const setSelectedBlockId = useAppStore(s => s.setSelectedBlockId);
  const removeBlock = useAppStore(s => s.removeBlock);
  const updateBlock = useAppStore(s => s.updateBlock);
  const duplicateBlock = useAppStore(s => s.duplicateBlock);
  const moveBlockUp = useAppStore(s => s.moveBlockUp);
  const htmlOverride = useAppStore(s => s.htmlPreviewOverride);

  if (!doc) return null;

  // HTML override → bypass the doc and render the user's edited markup.
  if (htmlOverride != null) {
    return (
      <div className={styles.canvasWrap}>
        <iframe className={styles.canvasIframe} title="Email preview" srcDoc={htmlOverride} sandbox="" />
      </div>
    );
  }

  const root = doc.root;
  const childrenIds = root?.data?.childrenIds || [];
  const layoutStyle = {
    background: root?.data?.canvasColor || '#fff',
    color: root?.data?.textColor || '#3A485F',
    fontFamily: 'Inter, sans-serif',
  };

  const commitText = (id, text) => {
    updateBlock(id, prev => ({ ...prev, data: { ...prev.data, props: { ...(prev.data?.props || {}), text } } }));
  };

  const commitTable = (id, { columns, rows }) => {
    updateBlock(id, prev => ({
      ...prev,
      data: { ...prev.data, props: { ...(prev.data?.props || {}), ...(columns !== undefined && { columns }), ...(rows !== undefined && { rows }) } },
    }));
  };

  const handleCanvasClick = (e) => {
    if (e.target === e.currentTarget) setSelectedBlockId('root');
  };

  const bulkSet = new Set(bulkSelectedIds);
  const ctx = {
    doc,
    selectedBlockId,
    bulkSet,
    setSelectedBlockId,
    removeBlock,
    duplicateBlock,
    moveBlockUp,
    commitText,
    commitTable,
  };

  return (
    <div
      className={styles.canvasWrap}
      style={{ background: root?.data?.backdropColor || 'var(--neutral-25)' }}
      onClick={handleCanvasClick}
    >
      <div
        className={styles.canvas}
        style={layoutStyle}
        onClick={(e) => { e.stopPropagation(); setSelectedBlockId('root'); }}
      >
        <SortableList parentId="root" childrenIds={childrenIds} ctx={ctx} />
      </div>
    </div>
  );
}

// ── A sortable list of blocks belonging to a single parent slot. ────────────
function SortableList({ parentId, columnIdx, childrenIds, ctx }) {
  // If empty, render a droppable placeholder so the user has somewhere to drop.
  if (!childrenIds || childrenIds.length === 0) {
    return <EmptyDropzone parentId={parentId} columnIdx={columnIdx} />;
  }
  return (
    <SortableContext items={childrenIds} strategy={verticalListSortingStrategy}>
      {childrenIds.map(id => (
        <SortableBlock key={id} id={id} ctx={ctx} />
      ))}
    </SortableContext>
  );
}

function EmptyDropzone({ parentId, columnIdx }) {
  const dropId = columnIdx == null ? `__empty:${parentId}` : `__empty:${parentId}:${columnIdx}`;
  const { setNodeRef, isOver } = useDroppable({ id: dropId });
  return (
    <div ref={setNodeRef} className={[styles.emptyDrop, isOver ? styles.emptyDropOver : ''].join(' ')}>
      Drop here
    </div>
  );
}

// ── One sortable wrapper around a block of any type. ────────────────────────
function SortableBlock({ id, ctx }) {
  const sortable = useSortable({ id });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const block = ctx.doc[id];
  if (!block) return null;
  const isSelected = ctx.selectedBlockId === id;
  const isBulkSelected = ctx.bulkSet.has(id);
  const isBody = block.data?.role === 'body';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        styles.blockWrap,
        isSelected && !isBody ? styles.blockWrapSelected : '',
        isBulkSelected ? styles.blockWrapBulk : '',
      ].join(' ')}
      onClick={(e) => { e.stopPropagation(); ctx.setSelectedBlockId(id); }}
    >
      {isSelected && !isBody && (
        <div className={styles.blockToolbar}>
          <button
            {...attributes}
            {...listeners}
            className={styles.blockToolbarBtn}
            aria-label="Drag"
            onClick={(e) => e.stopPropagation()}
          >
            <DragHandleDots />
          </button>
          <span className={styles.blockToolbarDivider} />
          <span className={styles.blockToolbarLabel}>{blockLabel(block)}</span>
          <span className={styles.blockToolbarDivider} />
          <button
            className={styles.blockToolbarBtn}
            onClick={(e) => { e.stopPropagation(); ctx.moveBlockUp(id); }}
            aria-label="Move up"
            title="Move up"
          >
            <Icon name="solar:undo-left-round-linear" size={14} color="#fff" />
          </button>
          <span className={styles.blockToolbarDivider} />
          <button
            className={styles.blockToolbarBtn}
            onClick={(e) => { e.stopPropagation(); ctx.duplicateBlock(id); }}
            aria-label="Duplicate"
            title="Duplicate"
          >
            <Icon name="solar:copy-linear" size={14} color="#fff" />
          </button>
          <span className={styles.blockToolbarDivider} />
          <button
            className={styles.blockToolbarBtn}
            onClick={(e) => { e.stopPropagation(); ctx.removeBlock(id); }}
            aria-label="Delete"
            title="Delete"
          >
            <Icon name="solar:trash-bin-trash-linear" size={14} color="#fff" />
          </button>
        </div>
      )}
      <BlockBody id={id} block={block} ctx={ctx} dragAttributes={attributes} dragListeners={listeners} />
    </div>
  );
}

// ── Per-type rendering. Container / ColumnsContainer recurse so their children
// are also draggable. Heading / Text use the contentEditable surface. Other
// primitives fall back to Reader. ───────────────────────────────────────────
function BlockBody({ id, block, ctx, dragAttributes, dragListeners }) {
  const { type, data } = block;
  const props = data?.props || {};
  const style = data?.style || {};

  if (type === 'Heading' || type === 'Text') {
    return (
      <InlineEditable
        blockId={id}
        type={type}
        level={props.level}
        text={props.text || ''}
        style={style}
        onCommit={ctx.commitText}
      />
    );
  }

  if (type === 'Container') {
    return (
      <div
        style={{
          backgroundColor: style.backgroundColor,
          backgroundImage: style.backgroundImage ? `url(${style.backgroundImage})` : undefined,
          backgroundSize: style.backgroundSize || 'cover',
          backgroundPosition: style.backgroundPosition || 'center',
          backgroundRepeat: style.backgroundRepeat || 'no-repeat',
          padding: paddingCss(style.padding),
          color: style.color,
          borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined,
        }}
      >
        <SortableList parentId={id} childrenIds={props.childrenIds || []} ctx={ctx} />
      </div>
    );
  }

  if (type === 'ColumnsContainer') {
    const cols = props.columns || [];
    const count = props.columnsCount || cols.length || 2;
    const hGap = props.columnsGap ?? 16;
    const vGap = props.rowGap ?? 0;
    const align = props.contentAlignment || 'top';
    const direction = props.direction || 'row';
    const wrap = props.flexWrap || 'nowrap';
    const visible = cols.slice(0, count);
    const fixedWidths = props.fixedWidths || [];
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: direction,
          flexWrap: wrap,
          alignItems: align === 'top' ? 'flex-start' : align === 'middle' ? 'center' : 'flex-end',
          columnGap: `${hGap}px`,
          rowGap: `${vGap}px`,
          padding: paddingCss(style.padding),
          backgroundColor: style.backgroundColor,
          backgroundImage: style.backgroundImage ? `url(${style.backgroundImage})` : undefined,
          backgroundSize: style.backgroundSize || 'cover',
          backgroundPosition: style.backgroundPosition || 'center',
          backgroundRepeat: style.backgroundRepeat || 'no-repeat',
          borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined,
        }}
      >
        {visible.map((col, idx) => (
          <div
            key={idx}
            style={{
              flex: fixedWidths[idx] ? `0 0 ${fixedWidths[idx]}px` : '1 1 0',
              minWidth: 0,
            }}
          >
            <SortableList parentId={id} columnIdx={idx} childrenIds={col?.childrenIds || []} ctx={ctx} />
          </div>
        ))}
      </div>
    );
  }

  // Image — render manually so we don't depend on Reader's strict schema
  // validation and so uploaded data-URLs render reliably.
  if (type === 'Image') {
    return (
      <div style={{ padding: paddingCss(style.padding), textAlign: style.textAlign || 'center', backgroundColor: style.backgroundColor }}>
        {props.url ? (
          <img src={props.url} alt={props.alt || ''} style={{ maxWidth: '100%', height: 'auto', display: 'inline-block', borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined }} />
        ) : (
          <div style={{ padding: 24, border: '1px dashed #CED4DD', borderRadius: 8, color: '#9CA3AF', fontSize: 12 }}>
            No image
          </div>
        )}
      </div>
    );
  }

  // Avatar
  if (type === 'Avatar') {
    const size = props.size || 64;
    const radius = props.shape === 'circle' ? '50%' : props.shape === 'rounded' ? 8 : 0;
    return (
      <div style={{ padding: paddingCss(style.padding), textAlign: style.textAlign || 'center' }}>
        {props.imageUrl && <img src={props.imageUrl} alt={props.alt || ''} style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover' }} />}
      </div>
    );
  }

  // Divider
  if (type === 'Divider') {
    return (
      <div style={{ padding: paddingCss(style.padding) }}>
        <hr style={{ width: '100%', border: 'none', borderTop: `${props.lineHeight || 1}px solid ${props.lineColor || '#E1E4EA'}`, margin: 0 }} />
      </div>
    );
  }

  // Spacer
  if (type === 'Spacer') {
    return <div style={{ height: props.height || 16 }} />;
  }

  if (type === 'Button') {
    const sizeStyles = { 'x-small': { padding: '6px 12px', fontSize: 12 }, small: { padding: '8px 16px', fontSize: 13 }, medium: { padding: '12px 20px', fontSize: 14 }, large: { padding: '14px 28px', fontSize: 16 } };
    const presetRadius = { rectangle: 0, rounded: 6, pill: 9999 };
    const sz = sizeStyles[props.size || 'medium'] || sizeStyles.medium;
    const radius = style.borderRadius ?? presetRadius[props.buttonStyle || 'rectangle'] ?? 0;
    return (
      <div style={{ padding: paddingCss(style.padding), textAlign: style.textAlign || 'center' }}>
        <a
          href={props.url || '#'}
          onClick={e => e.preventDefault()}
          style={{
            display: 'inline-block',
            padding: sz.padding,
            backgroundColor: props.buttonBackgroundColor || '#7C5CFA',
            color: props.buttonTextColor || '#fff',
            borderRadius: `${radius}px`,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: sz.fontSize,
            fontFamily: 'inherit',
          }}
        >
          {props.text || 'Button'}
        </a>
      </div>
    );
  }

  if (type === 'Table') {
    return <InlineTable id={id} props={props} style={style} commitTable={ctx.commitTable} />;
  }

  // Other primitives — delegate to Reader.
  return <Reader document={ctx.doc} rootBlockId={id} />;
}

function InlineTable({ id, props, style, commitTable }) {
  const cols = props.columns || [];
  const rows = props.rows || [];
  const borderColor = props.borderColor || '#E1E4EA';
  const headerBg = props.headerBg || '#7C5CFA';
  const headerColor = props.headerColor || '#fff';
  const stripedRows = props.stripedRows;
  const stripedColor = props.stripedColor || '#F6F4FF';

  const commitHeader = useCallback((ci, value) => {
    const next = cols.map((c, i) => i === ci ? { ...c, header: value } : c);
    commitTable(id, { columns: next });
  }, [id, cols, commitTable]);

  const commitCell = useCallback((ri, key, value) => {
    const next = rows.map((r, i) => i === ri ? { ...r, [key]: value } : r);
    commitTable(id, { rows: next });
  }, [id, rows, commitTable]);

  return (
    <div style={{ padding: paddingCss(style.padding), overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: style.fontSize || 13, fontFamily: 'inherit', minWidth: cols.length > 3 ? cols.length * 120 : undefined }}>
        <thead>
          <tr>
            {cols.map((col, ci) => (
              <th key={ci} style={{ padding: 0, textAlign: 'left', backgroundColor: headerBg, color: headerColor, fontWeight: 600, border: `1px solid ${borderColor}` }}>
                <EditableCell
                  value={col.header}
                  onCommit={v => commitHeader(ci, v)}
                  style={{ color: headerColor, fontWeight: 600 }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {cols.map((col, ci) => (
                <td key={ci} style={{ padding: 0, border: `1px solid ${borderColor}`, backgroundColor: stripedRows && ri % 2 === 1 ? stripedColor : 'transparent' }}>
                  <EditableCell
                    value={row[col.key] || ''}
                    onCommit={v => commitCell(ri, col.key, v)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditableCell({ value, onCommit, style: extraStyle }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft(value);
    setEditing(true);
    requestAnimationFrame(() => ref.current?.focus());
  };

  const finish = () => {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  };

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={finish}
        onKeyDown={e => { if (e.key === 'Enter') finish(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: 'none',
          background: 'var(--primary-25, #FAFAFF)',
          outline: '2px solid var(--primary-300)',
          outlineOffset: -2,
          fontSize: 'inherit',
          fontFamily: 'inherit',
          ...extraStyle,
        }}
      />
    );
  }

  return (
    <div
      onDoubleClick={startEdit}
      style={{ padding: '8px 12px', cursor: 'text', minHeight: 20, ...extraStyle }}
    >
      {value || ' '}
    </div>
  );
}
