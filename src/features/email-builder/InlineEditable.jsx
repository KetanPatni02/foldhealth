import { useEffect, useRef } from 'react';

// In-place text editor for Heading/Text blocks. Renders a contentEditable
// element so users can click-and-type directly on the canvas, **and** select
// portions of the text for inline formatting (bold/italic/link/etc. applied
// via the floating SelectionToolbar). On blur we commit the new HTML back
// into the document.
//
// Text storage model: props.text is an HTML string. Inline tags like
// <strong>/<em>/<u>/<s>/<code>/<a> are preserved across edits so per-range
// formatting works. Plain text without HTML still works — it's valid HTML.
// Newlines (\n) and <br> are both supported; we normalize to <br> on save.

const FONT_FAMILY_MAP = {
  MODERN_SANS:    `'Helvetica Neue', 'Arial Nova', 'Nimbus Sans', Arial, sans-serif`,
  BOOK_SANS:      `'Ubuntu', 'Segoe UI', sans-serif`,
  ORGANIC_SANS:   `'Verdana', sans-serif`,
  GEOMETRIC_SANS: `'Tahoma', sans-serif`,
  HEAVY_SANS:     `'Arial Black', sans-serif`,
  ROUNDED_SANS:   `'Comic Sans MS', cursive`,
  MODERN_SERIF:   `'Garamond', serif`,
  BOOK_SERIF:     `'Georgia', serif`,
  MONOSPACE:      `'Consolas', monospace`,
};

function paddingCss(padding) {
  if (!padding) return undefined;
  return `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;
}

function buildStyle(style) {
  return {
    margin: 0,
    color: style.color,
    fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    textDecoration: style.textDecoration,
    textAlign: style.textAlign,
    textTransform: style.textTransform,
    lineHeight: style.lineHeight ?? 1.5,
    letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
    padding: paddingCss(style.padding),
    backgroundColor: style.backgroundColor,
    fontFamily: FONT_FAMILY_MAP[style.fontFamily] || FONT_FAMILY_MAP.MODERN_SANS,
    outline: 'none',
    whiteSpace: 'pre-wrap',
  };
}

// Convert stored text into the HTML the editable element holds in the DOM.
// - For lists, split on newline and wrap each non-empty line in <li>.
// - For non-lists, normalize raw newlines to <br/> so they show as line breaks.
// Empty content renders one <li><br></li> or nothing so the caret has a home.
function textToInnerHtml(text, listStyle) {
  const safe = text || '';
  if (listStyle === 'bullet' || listStyle === 'number') {
    const lines = safe.split(/\n/);
    const items = lines.length ? lines : [''];
    return items.map(l => `<li>${l || '<br>'}</li>`).join('');
  }
  // Preserve existing inline HTML; only convert bare newlines.
  return safe.replace(/\n/g, '<br>');
}

// Read the current DOM back into the stored text format. For lists we walk
// the <li> children; otherwise we read innerHTML and normalize <br> → \n.
function innerHtmlToText(el, listStyle) {
  if (!el) return '';
  if (listStyle === 'bullet' || listStyle === 'number') {
    const items = [...el.querySelectorAll('li')].map(li => li.innerHTML.trim().replace(/<br\s*\/?>$/i, ''));
    return items.join('\n');
  }
  return el.innerHTML.replace(/<br\s*\/?>/gi, '\n');
}

export function InlineEditable({ blockId, type, level, text, style, listStyle, onCommit }) {
  const ref = useRef(null);
  const isList = listStyle === 'bullet' || listStyle === 'number';
  const Tag = isList
    ? (listStyle === 'number' ? 'ol' : 'ul')
    : (type === 'Heading' ? (level || 'h2') : 'p');

  // Sync external text → DOM only when the element is not focused, so typing
  // never races with a re-render and the caret position is preserved.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const next = textToInnerHtml(text, listStyle);
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [text, listStyle]);

  const handleBlur = () => {
    const next = innerHtmlToText(ref.current, listStyle);
    if (next !== text) onCommit(blockId, next);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); ref.current?.blur(); }
  };

  return (
    <Tag
      ref={ref}
      data-eb-editable={type}
      data-eb-block-id={blockId}
      style={buildStyle(style)}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      spellCheck={false}
    />
  );
}
