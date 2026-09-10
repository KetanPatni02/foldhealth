import { useCallback, useRef, useState } from 'react';
import styles from './SplitDrawerLayout.module.css';

const MIN_RHS_PX = 320;

/**
 * Two-pane body for `<Drawer bodyClassName={styles.splitBody}>`.
 * Left pane scrolls the editor; right pane is typically a live preview.
 */
export function SplitDrawerLayout({ left, right, defaultRightWidth }) {
  const rowRef = useRef(null);
  const [rhsWidth, setRhsWidth] = useState(defaultRightWidth ?? null);

  const startResize = useCallback((e) => {
    const row = rowRef.current;
    if (!row) return;
    const rowRect = row.getBoundingClientRect();
    const handle = e.currentTarget;
    const { pointerId } = e;
    try { handle.setPointerCapture(pointerId); } catch { /* ignore */ }

    const maxWidth = Math.floor(rowRect.width * 0.62);
    const onMove = (moveEvt) => {
      if (moveEvt.pointerId !== pointerId) return;
      const rawWidth = rowRect.right - moveEvt.clientX;
      setRhsWidth(Math.max(MIN_RHS_PX, Math.min(rawWidth, maxWidth)));
    };
    const onUp = (upEvt) => {
      if (upEvt.pointerId !== pointerId) return;
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      try { handle.releasePointerCapture(pointerId); } catch { /* ignore */ }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  }, []);

  return (
    <div ref={rowRef} className={styles.splitRow}>
      <div className={styles.leftPane}>{left}</div>
      <div
        className={styles.resizeHandle}
        onPointerDown={startResize}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panes"
      />
      <div
        className={styles.rightPane}
        style={rhsWidth != null ? { flex: `0 0 ${rhsWidth}px` } : undefined}
      >
        {right}
      </div>
    </div>
  );
}

SplitDrawerLayout.bodyClassName = styles.splitBody;
