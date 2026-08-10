import { useAppStore } from '../../store/useAppStore';
import { getFontStack } from './googleFonts';
import styles from './EmailBuilder.module.css';
import { EditableHtmlIframe } from './PreviewCanvasEditableHtml';
import { SortableList } from './PreviewCanvasSortable';

export function PreviewCanvas({ dropIndicator }) {
  const doc = useAppStore(s => s.emailDocument);
  const selectedBlockId = useAppStore(s => s.selectedBlockId);
  const selectedColumnIdx = useAppStore(s => s.selectedColumnIdx);
  const bulkSelectedIds = useAppStore(s => s.bulkSelectedIds);
  const setSelectedBlockId = useAppStore(s => s.setSelectedBlockId);
  const selectColumn = useAppStore(s => s.selectColumn);
  const removeBlock = useAppStore(s => s.removeBlock);
  const updateBlock = useAppStore(s => s.updateBlock);
  const duplicateBlock = useAppStore(s => s.duplicateBlock);
  const selectParentBlock = useAppStore(s => s.selectParentBlock);
  const htmlOverride = useAppStore(s => s.htmlPreviewOverride);

  if (!doc) return null;

  const customHtml = doc.root?.data?.customHtml;
  const hasBlocks = (doc.root?.data?.childrenIds?.length ?? 0) > 0;
  if (htmlOverride != null) {
    return (
      <div className={styles.canvasWrap}>
        <iframe className={styles.canvasIframe} title="Email preview" srcDoc={htmlOverride} sandbox="allow-same-origin" />
      </div>
    );
  }
  if (customHtml != null && !hasBlocks) {
    return (
      <div className={styles.canvasWrap}>
        <EditableHtmlIframe html={customHtml} doc={doc} />
      </div>
    );
  }

  const root = doc.root;
  const childrenIds = root?.data?.childrenIds || [];
  const layoutStyle = {
    background: root?.data?.canvasColor || '#fff',
    color: root?.data?.textColor || '#3A485F',
    fontFamily: getFontStack(root?.data?.fontFamily),
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

  const toggleBulkSelected = useAppStore.getState().toggleBulkSelected;
  const bulkSet = new Set(bulkSelectedIds);
  const ctx = {
    doc,
    selectedBlockId,
    selectedColumnIdx,
    bulkSet,
    setSelectedBlockId,
    selectColumn,
    toggleBulkSelected,
    removeBlock,
    updateBlock,
    duplicateBlock,
    selectParentBlock,
    commitText,
    commitTable,
    dropIndicator,
    renderChildList: (parentId, columnIdx, childIds, gap) => (
      <SortableList parentId={parentId} columnIdx={columnIdx} childrenIds={childIds} ctx={ctx} gap={gap} />
    ),
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
        <SortableList parentId="root" childrenIds={childrenIds} ctx={ctx} gap={root?.data?.gap} />
      </div>
    </div>
  );
}
