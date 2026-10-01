import { useLayoutEffect, useRef, useState } from 'react';
import { Tooltip } from '../Tooltip/Tooltip';
import styles from './TruncatedText.module.css';

/**
 * One line of text that ends in "…" when it doesn't fit, with the full text
 * in a tooltip on hover (only when it's actually cut off). Re-checks as its
 * container resizes.
 *
 * @param {object} props
 * @param {string} props.text
 * @param {string} [props.className]  – Typography / colour for the text
 * @param {number} [props.maxWidth=280] – Tooltip wrap width
 */
export function TruncatedText({ text, className, maxWidth = 280 }) {
  const ref = useRef(null);
  const [cut, setCut] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const check = () => setCut(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [text]);
  return (
    <Tooltip label={cut ? text : ''} maxWidth={maxWidth} followCursor className={styles.wrap}>
      <span ref={ref} className={[styles.text, className].filter(Boolean).join(' ')}>{text}</span>
    </Tooltip>
  );
}
