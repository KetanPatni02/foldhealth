import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hover intent for a PatientHoverCard. Resting on the trigger for
 * `openDelay` shows the banner; `expandDelay` later the details slide out.
 * Leaving the trigger and the card for `closeDelay` hides it, so the pointer
 * can travel from the avatar into the card.
 *
 * @returns {{ open, stage, anchorRect, triggerProps, cardProps, close }}
 */
export function usePatientHoverCard({ openDelay = 800, expandDelay = 500, closeDelay = 150 } = {}) {
  const [anchorRect, setAnchorRect] = useState(null);
  const [stage, setStage] = useState('banner');
  const openT = useRef(null);
  const expandT = useRef(null);
  const closeT = useRef(null);
  const triggerEl = useRef(null);

  const clear = (t) => { if (t.current) { clearTimeout(t.current); t.current = null; } };
  const close = useCallback(() => {
    clear(openT); clear(expandT); clear(closeT);
    setAnchorRect(null);
    setStage('banner');
  }, []);
  useEffect(() => () => { clear(openT); clear(expandT); clear(closeT); }, []);
  // The card is placed from one rect taken on open. Scrolling the trigger's
  // container (a wheel scroll fires no mouseleave) or resizing would leave it
  // floating over other rows, so it closes instead. Scrolling inside the card
  // itself doesn't move the trigger and is ignored.
  useEffect(() => {
    if (!anchorRect) return undefined;
    const onScroll = (e) => {
      const t = e.target;
      if (t === document || t === document.documentElement || t?.contains?.(triggerEl.current)) close();
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [anchorRect, close]);

  const scheduleClose = () => { clear(closeT); closeT.current = setTimeout(close, closeDelay); };
  const cancelClose = () => clear(closeT);

  const onEnter = (e) => {
    cancelClose();
    if (anchorRect || openT.current) return;
    const el = e.currentTarget;
    triggerEl.current = el;
    openT.current = setTimeout(() => {
      openT.current = null;
      setAnchorRect(el.getBoundingClientRect());
      setStage('banner');
      expandT.current = setTimeout(() => setStage('expanded'), expandDelay);
    }, openDelay);
  };
  const onLeave = () => {
    // Left before it opened: never show it.
    if (openT.current) { clear(openT); return; }
    scheduleClose();
  };

  return {
    open: !!anchorRect,
    stage,
    anchorRect,
    close,
    triggerProps: { onMouseEnter: onEnter, onMouseLeave: onLeave },
    cardProps: { onMouseEnter: cancelClose, onMouseLeave: scheduleClose },
  };
}
