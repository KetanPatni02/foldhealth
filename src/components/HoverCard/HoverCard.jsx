import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePatientHoverCard } from '../PatientHoverCard/usePatientHoverCard';
import styles from './HoverCard.module.css';

/**
 * HoverCard — content that opens on hover and stays open while the pointer
 * moves into it, so it can hold links and buttons (a Tooltip closes as soon
 * as the pointer leaves its trigger). Portal-rendered below the trigger.
 *
 * Props:
 *  - trigger   ReactNode — what the user hovers
 *  - children  ReactNode | (close) => ReactNode — the card content
 *  - width     number (px) — card width, default 280
 *  - ariaLabel string — names the card for assistive tech
 *  - openDelay number (ms) — hover time before the card opens, default 150
 *  - flush     boolean — no inner padding, for content that runs edge to edge
 *  - pinOnClick boolean — a click on the trigger opens the card and keeps it
 *               open until the trigger is clicked again, a click lands
 *               outside, or Escape
 */
export function HoverCard({ trigger, children, width = 280, ariaLabel, openDelay = 150, flush = false, pinOnClick = false }) {
  const hover = usePatientHoverCard({ openDelay, closeDelay: 200 });
  const rect = hover.anchorRect;
  const [pinned, setPinned] = useState(false);
  const triggerRef = useRef(null);
  const cardRef = useRef(null);
  const { close } = hover;
  const closeAll = () => { setPinned(false); close(); };

  useEffect(() => {
    if (!pinned) return undefined;
    const onDown = (e) => {
      if (cardRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      setPinned(false); close();
    };
    const onKey = (e) => { if (e.key === 'Escape') { setPinned(false); close(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [pinned, close]);
  // Closing by any route (scroll, resize) drops the pin too.
  if (pinned && !hover.open) setPinned(false);

  const onTriggerClick = (e) => {
    e.stopPropagation();
    if (pinned) { closeAll(); return; }
    hover.openNow(e.currentTarget);
    setPinned(true);
  };
  const triggerProps = pinned ? {} : hover.triggerProps;
  const cardProps = pinned ? {} : hover.cardProps;
  const below = rect && rect.bottom + 240 < window.innerHeight;
  return (
    <>
      <span
        ref={triggerRef}
        className={`${styles.trigger} ${pinOnClick ? styles.clickable : ''}`}
        {...triggerProps}
        {...(pinOnClick ? { onClick: onTriggerClick } : {})}
      >
        {trigger}
      </span>
      {hover.open && createPortal(
        <div
          ref={cardRef}
          role="dialog"
          aria-label={ariaLabel}
          className={`${styles.card} ${flush ? styles.flush : ''}`}
          style={{
            width,
            left: Math.min(rect.left, window.innerWidth - width - 8),
            ...(below ? { top: rect.bottom + 4 } : { bottom: window.innerHeight - rect.top + 4 }),
          }}
          {...cardProps}
        >
          {typeof children === 'function' ? children(closeAll) : children}
        </div>,
        document.body,
      )}
    </>
  );
}
