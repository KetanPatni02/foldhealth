import { lazy, Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/useAppStore';

// The review box (and its capture libraries) loads only once someone starts
// a review, so nobody else pays for it in the main bundle.
const FoldReviewDock = lazy(() => import('./FoldReviewDock').then(m => ({ default: m.FoldReviewDock })));

// Events from the box stop at its own container, so the page's "click
// outside closes it" and keyboard-shortcut listeners never see them: an open
// drawer, menu or popover stays open while you comment on it or pick an
// element inside it. Capture-phase listeners (Popover, Select) skip presses
// inside [data-outside-press-ignore] themselves.
const CONTAINED_EVENTS = ['pointerdown', 'mousedown', 'touchstart', 'click', 'keydown'];
const stop = (e) => e.stopPropagation();

function createBoxContainer() {
  const el = document.createElement('div');
  el.setAttribute('data-outside-press-ignore', '');
  CONTAINED_EVENTS.forEach(type => el.addEventListener(type, stop));
  return el;
}

// In <body> only while a review is active.
function useBoxContainer(active) {
  const [host] = useState(createBoxContainer);
  useEffect(() => {
    if (!active) return undefined;
    document.body.appendChild(host);
    return () => host.remove();
  }, [active, host]);
  return host;
}

/** Mounted once in AppLayout; shows the review box while a review is active.
 *  It renders last in <body>, above every drawer and popover. */
export function DesignReviewHost() {
  const activeReview = useAppStore(s => s.activeReview);
  const host = useBoxContainer(!!activeReview);
  if (!activeReview) return null;
  return createPortal(
    <Suspense fallback={null}>
      <FoldReviewDock review={activeReview} />
    </Suspense>,
    host,
  );
}
