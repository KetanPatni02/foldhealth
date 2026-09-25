import { useState } from 'react';

/**
 * State for <DocumentUploadForm>. Lives in the host so the host can put the
 * Upload action in its own header (drawer / pane) and gate it on `canSave`.
 *
 * Caption auto-fills from the picked file's name (extension stripped) until
 * the user types their own, matching the HCC Upload Document drawer.
 */
export function useDocumentUploadForm() {
  const [file, setFileState] = useState(null);
  const [caption, setCaptionState] = useState('');
  const [captionTouched, setCaptionTouched] = useState(false);
  const [docType, setDocType] = useState('');
  // Bumped on reset to remount UploadDropField, which owns its own state.
  const [uploadKey, setUploadKey] = useState(0);
  // Set while editing an existing document's metadata; no file is needed then.
  const [editingId, setEditingId] = useState(null);

  const setFile = (next) => {
    setFileState(next);
    if (next && !captionTouched) setCaptionState(next.name.replace(/\.[a-z0-9]+$/i, ''));
  };
  const setCaption = (next) => {
    setCaptionState(next);
    setCaptionTouched(true);
  };
  const reset = () => {
    setFileState(null);
    setCaptionState('');
    setCaptionTouched(false);
    setDocType('');
    setEditingId(null);
    setUploadKey(k => k + 1);
  };
  const startEdit = (doc) => {
    reset();
    setEditingId(doc.id);
    setCaptionState(doc.caption || '');
    setCaptionTouched(true);
    setDocType(doc.docType || '');
  };

  return {
    file, setFile,
    caption, setCaption,
    docType, setDocType,
    uploadKey,
    editingId,
    reset,
    startEdit,
    canSave: !!((editingId || file) && caption.trim() && docType),
  };
}
