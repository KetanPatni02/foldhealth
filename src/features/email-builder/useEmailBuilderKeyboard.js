import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getFirstChild, getParentId } from './EmailBuilder.utils';

export function useEmailBuilderKeyboard() {
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
      const s = useAppStore.getState();
      const doc = s.emailDocument;
      const id = s.selectedBlockId;
      if (!doc) return;

      const isMeta = e.metaKey || e.ctrlKey;

      if (isMeta && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) s.redoEmailEdit();
        else s.undoEmailEdit();
        return;
      }

      if (!id) return;

      if (isMeta && e.key === 'd') {
        e.preventDefault();
        if (id !== 'root') s.duplicateBlock(id);
        return;
      }

      if (isMeta && e.key === 'r') {
        e.preventDefault();
        if (id !== 'root') {
          window.dispatchEvent(new CustomEvent('eb:rename', { detail: { id } }));
        }
        return;
      }

      if (isEditable) return;

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

      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        const parent = getParentId(doc, id);
        if (parent) s.setSelectedBlockId(parent);
        return;
      }

      if (e.key === 'Escape') {
        if (s.bulkSelectedIds.length > 0) {
          e.preventDefault();
          s.setBulkSelectedIds([]);
          return;
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (id !== 'root') s.removeBlock(id);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}
