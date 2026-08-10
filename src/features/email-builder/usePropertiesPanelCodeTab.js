import { useState, useEffect, useRef } from 'react';
import { renderEmailHtml } from './patchEmailHtml';
import { useAppStore } from '../../store/useAppStore';
import {
  parseJsonDraft,
  findBlockIndex,
  scrollEditorToIndex,
  formatHtmlText,
} from './PropertiesPanelCodeTab.utils';

export function usePropertiesPanelCodeTab(doc) {
  const setEmailDocument = useAppStore(s => s.setEmailDocument);
  const htmlPreviewOverride = useAppStore(s => s.htmlPreviewOverride);
  const setHtmlPreviewOverride = useAppStore(s => s.setHtmlPreviewOverride);
  const selectedBlockId = useAppStore(s => s.selectedBlockId);

  const [mode, setMode] = useState('json');
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);
  const drafting = useRef(false);

  useEffect(() => {
    if (drafting.current) return;
    let cancelled = false;
    (async () => {
      if (mode === 'json') {
        const next = JSON.stringify(doc, null, 2);
        if (!cancelled) setText(next);
      } else {
        const seed = htmlPreviewOverride ?? renderEmailHtml(doc);
        if (!cancelled) setText(seed);
        try {
          const next = await formatHtmlText(seed);
          if (!cancelled) setText(next);
        } catch { /* keep the unformatted seed */ }
      }
      if (!cancelled) setError(null);
    })();
    return () => { cancelled = true; };
  }, [mode, doc, htmlPreviewOverride]);

  useEffect(() => {
    const el = textareaRef.current;
    const index = findBlockIndex({ mode, text, selectedBlockId, doc });
    if (index < 0) return;
    scrollEditorToIndex(el, text, index, mode, selectedBlockId, doc);
    drafting.current = false;
  }, [selectedBlockId, mode, text, doc]);

  const handleChange = (e) => {
    const v = e.target.value;
    setText(v);
    drafting.current = true;
    if (mode === 'json') {
      try {
        const parsed = parseJsonDraft(v);
        setError(null);
        setEmailDocument(parsed);
      } catch (err) {
        setError(err.message);
      }
    } else {
      setHtmlPreviewOverride(v);
      setError(null);
    }
  };

  const handleBlur = () => { drafting.current = false; };
  const copy = () => { if (text) navigator.clipboard?.writeText(text); };

  const reformat = async () => {
    drafting.current = false;
    if (mode === 'json') {
      try {
        const parsed = JSON.parse(text);
        setText(JSON.stringify(parsed, null, 2));
        setError(null);
      } catch (e) { setError(e.message); }
    } else {
      try {
        setText(await formatHtmlText(text));
      } catch (e) { setError(e.message); }
    }
  };

  const switchMode = (k) => { setMode(k); drafting.current = false; };

  return {
    mode,
    text,
    error,
    textareaRef,
    htmlPreviewOverride,
    setEmailDocument,
    doc,
    handleChange,
    handleBlur,
    copy,
    reformat,
    switchMode,
    setError,
  };
}
