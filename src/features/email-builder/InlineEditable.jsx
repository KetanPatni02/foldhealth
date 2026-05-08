import { useEffect, useRef } from 'react';

// In-place text editor for Heading/Text blocks. We render an HTML element with
// contentEditable so users can click-and-type directly on the canvas; on blur
// we push the new text up to the document. Crucially we never set the element's
// innerText while it has focus — that would clobber the caret.

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
    lineHeight: style.lineHeight ?? 1.5,
    letterSpacing: style.letterSpacing ? `${style.letterSpacing / 100}em` : undefined,
    padding: paddingCss(style.padding),
    backgroundColor: style.backgroundColor,
    fontFamily: FONT_FAMILY_MAP[style.fontFamily] || FONT_FAMILY_MAP.MODERN_SANS,
    outline: 'none',
    whiteSpace: 'pre-wrap',
  };
}

export function InlineEditable({ blockId, type, level, text, style, onCommit }) {
  const ref = useRef(null);
  const Tag = type === 'Heading' ? (level || 'h2') : 'p';

  // Sync external `text` updates to DOM only when the element is not focused —
  // otherwise typing would race with React re-renders and reset the caret.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerText !== text) el.innerText = text;
  }, [text]);

  const handleBlur = () => {
    const next = ref.current?.innerText ?? '';
    if (next !== text) onCommit(blockId, next);
  };

  const handleKeyDown = (e) => {
    // Esc → blur (commits and exits edit mode)
    if (e.key === 'Escape') { e.preventDefault(); ref.current?.blur(); }
  };

  return (
    <Tag
      ref={ref}
      style={buildStyle(style)}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      spellCheck={false}
    >
      {text}
    </Tag>
  );
}
