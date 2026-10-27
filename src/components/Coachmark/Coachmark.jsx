import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon/Icon';
import { CloseButton } from '../CloseButton/CloseButton';
import styles from './Coachmark.module.css';

const GAP = 10;
const EDGE = 8;

/**
 * A first-time hint pointing at a control (FCS-5677 3540:64643): an icon,
 * a line of guidance and a close button, in a card above the anchor with an
 * arrow down to it. Portal-rendered and kept on the anchor as the page
 * scrolls or resizes. Whether it was dismissed is the caller's to remember.
 *
 * @param {{ current: HTMLElement }} props.anchorRef
 * @param {string}   [props.icon]   Solar icon for the tile on the left
 * @param {number}   [props.width=320]
 * @param {() => void} props.onClose
 */
export function Coachmark({ anchorRef, icon = 'solar:info-circle-linear', width = 320, onClose, children }) {
  const cardRef = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect();
      const card = cardRef.current;
      if (!a || !card) return;
      const w = Math.min(width, window.innerWidth - EDGE * 2);
      const center = a.left + a.width / 2;
      const left = Math.max(EDGE, Math.min(center - w / 2, window.innerWidth - w - EDGE));
      setPos({ left, width: w, bottom: window.innerHeight - a.top + GAP, arrow: center - left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchorRef, width]);

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      className={styles.card}
      style={pos ? { left: pos.left, width: pos.width, bottom: pos.bottom } : { visibility: 'hidden' }}
    >
      <span className={styles.tile}><Icon name={icon} size={20} color="var(--primary-300)" /></span>
      <div className={styles.text}>{children}</div>
      <CloseButton size={16} onClick={onClose} label="Dismiss" className={styles.close} />
      {pos && <span className={styles.arrow} style={{ left: pos.arrow }} aria-hidden="true" />}
    </div>,
    document.body,
  );
}
