import { convertMjmlToFold } from './PropertiesPanel.utils.jsx';

export function parseJsonDraft(v) {
  let sanitized = v.replace(/[\x00-\x1F\x7F]/g, (ch) => {
    if (ch === '\n' || ch === '\r' || ch === '\t') return ch;
    return '';
  });
  sanitized = sanitized.replace(/"(?:[^"\\]|\\.)*"/g, (match) =>
    match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t'),
  );
  let parsed = JSON.parse(sanitized);
  if (parsed && parsed.type === 'page' && Array.isArray(parsed.children)) {
    parsed = convertMjmlToFold(parsed);
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.root) {
    throw new Error('Document must contain a "root" block');
  }
  return parsed;
}

export function findBlockIndex({ mode, text, selectedBlockId, doc }) {
  if (!selectedBlockId || selectedBlockId === 'root' || !text) return -1;
  if (mode === 'json') {
    return text.indexOf(`"${selectedBlockId}"`);
  }
  const block = doc?.[selectedBlockId];
  const t = block?.data?.props?.text;
  if (typeof t === 'string' && t.length > 4) {
    const plain = t.replace(/<[^>]+>/g, '').trim().slice(0, 80);
    if (plain) return text.indexOf(plain);
  }
  return -1;
}

export function scrollEditorToIndex(el, text, index, mode, selectedBlockId, doc) {
  if (!el || index < 0) return;
  el.focus({ preventScroll: true });
  el.setSelectionRange(index, index);
  const lineHeight = 18;
  const lineNo = text.slice(0, index).split('\n').length - 1;
  const viewport = el.closest?.('[class*="overlayScrollInner"]') || el.parentElement;
  if (viewport) {
    const targetTop = Math.max(0, lineNo * lineHeight - viewport.clientHeight / 2);
    viewport.scrollTop = targetTop;
  }
  if (mode === 'json') {
    el.setSelectionRange(index, index + selectedBlockId.length + 2);
  } else {
    const block = doc?.[selectedBlockId];
    const t = block?.data?.props?.text;
    const plain = typeof t === 'string' ? t.replace(/<[^>]+>/g, '').trim().slice(0, 80) : '';
    el.setSelectionRange(index, index + plain.length);
  }
}

export async function formatHtmlText(text) {
  const [{ format }, htmlPlugin] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/html'),
  ]);
  return format(text, {
    parser: 'html',
    plugins: [htmlPlugin.default || htmlPlugin],
    printWidth: 80,
    htmlWhitespaceSensitivity: 'ignore',
  });
}
