import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Tooltip.module.css';

/**
 * Tooltip — lightweight portaled hover/focus tooltip.
 *
 * Wraps a single trigger element (usually a button) and renders a small
 * dark bubble above it on hover / keyboard focus, with a 120ms open delay
 * and instant close. Escapes overflow via a portal.
 *
 * Props:
 *  - label   (string | ReactNode)  Tooltip content. Empty → renders nothing.
 *  - children (ReactNode)  The trigger element.
 *  - placement ('top' | 'bottom')  Vertical placement. Defaults to 'top'.
 *  - className (string)  Optional class on the inline wrapper span.
 *  - maxWidth (number)  Wrap long content at this pixel width (default is a
 *             single nowrap line — pass this for sentence-length tooltips).
 *  - align   ('center' | 'left' | 'right')  Horizontal anchoring. Defaults to
 *             centring on the trigger; 'right' pins the bubble's right edge to
 *             the trigger's, for triggers near the right edge of a panel where
 *             a centred bubble would be clipped.
 */
export function Tooltip({ label, children, placement = 'top', className, maxWidth, align = 'center' }) {
  const triggerRef = useRef(null);
  const openTimer = useRef(null);
  const [rect, setRect] = useState(null);

  const open = () => {
    if (!label) return;
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (r) setRect(r);
    }, 120);
  };
  const close = () => {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
    setRect(null);
  };
  useEffect(() => () => clearTimeout(openTimer.current), []);

  const anchorX = rect
    ? align === 'right' ? rect.right
      : align === 'left' ? rect.left
        : rect.left + rect.width / 2
    : 0;
  const style = rect
    ? placement === 'bottom'
      ? { top: rect.bottom + 6, left: anchorX }
      : { top: rect.top - 6,     left: anchorX }
    : null;
  if (style && maxWidth) {
    style.maxWidth = maxWidth;
    style.whiteSpace = 'normal';
    style.textAlign = 'left';
  }

  return (
    <span
      ref={triggerRef}
      className={[styles.wrap, className || ''].filter(Boolean).join(' ')}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
    >
      {children}
      {rect && label && createPortal(
        <span
          role="tooltip"
          className={[
            styles.bubble,
            placement === 'bottom' ? styles.bubbleBottom : styles.bubbleTop,
            align === 'right' ? styles.bubbleAlignRight : '',
            align === 'left' ? styles.bubbleAlignLeft : '',
          ].filter(Boolean).join(' ')}
          style={style}
        >
          {label}
        </span>,
        document.body,
      )}
    </span>
  );
}
