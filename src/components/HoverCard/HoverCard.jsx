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
 */
export function HoverCard({ trigger, children, width = 280, ariaLabel, openDelay = 150, flush = false }) {
  const hover = usePatientHoverCard({ openDelay, closeDelay: 200 });
  const rect = hover.anchorRect;
  const below = rect && rect.bottom + 240 < window.innerHeight;
  return (
    <>
      <span className={styles.trigger} {...hover.triggerProps}>{trigger}</span>
      {hover.open && createPortal(
        <div
          role="dialog"
          aria-label={ariaLabel}
          className={`${styles.card} ${flush ? styles.flush : ''}`}
          style={{
            width,
            left: Math.min(rect.left, window.innerWidth - width - 8),
            ...(below ? { top: rect.bottom + 4 } : { bottom: window.innerHeight - rect.top + 4 }),
          }}
          {...hover.cardProps}
        >
          {typeof children === 'function' ? children(hover.close) : children}
        </div>,
        document.body,
      )}
    </>
  );
}
