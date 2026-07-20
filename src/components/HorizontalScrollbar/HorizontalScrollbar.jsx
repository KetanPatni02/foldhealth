import { useEffect, useRef, useState } from 'react';
import styles from './HorizontalScrollbar.module.css';

// Custom always-visible horizontal scrollbar. macOS Chromium respects the
// OS "Show scrollbars > When scrolling" preference and hides overlay bars
// no matter what ::-webkit-scrollbar CSS you throw at it. For tables where
// off-screen columns aren't obvious (HCC worklist has ~26 columns), we
// need a persistent affordance regardless of the user's OS setting.
//
// Attach via a ref to the scroll container: renders a sticky strip inside
// the container's own layout, so no absolute-positioning maths against
// the viewport. Reads scrollLeft / scrollWidth / clientWidth on scroll
// and window resize; supports thumb drag + track click.
export function HorizontalScrollbar({ targetRef }) {
  const [metrics, setMetrics] = useState({ thumb: 0, offset: 0, needed: false });
  const trackRef = useRef(null);
  const dragState = useRef(null);

  useEffect(() => {
    const el = targetRef?.current;
    if (!el) return;

    const measure = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      if (scrollWidth <= clientWidth + 1) {
        setMetrics({ thumb: 0, offset: 0, needed: false });
        return;
      }
      const ratio = clientWidth / scrollWidth;
      const thumb = Math.max(24, ratio * clientWidth);
      const trackable = clientWidth - thumb;
      const scrollable = scrollWidth - clientWidth;
      const offset = scrollable > 0 ? (scrollLeft / scrollable) * trackable : 0;
      setMetrics({ thumb, offset, needed: true });
    };

    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Column widths can change as data loads; also watch the direct table
    // child so late-arriving rows re-trigger a measurement.
    const child = el.firstElementChild;
    if (child) ro.observe(child);
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [targetRef]);

  const onThumbPointerDown = (e) => {
    const el = targetRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    e.preventDefault();
    dragState.current = {
      startClientX: e.clientX,
      startScrollLeft: el.scrollLeft,
      trackWidth: track.clientWidth,
      thumb: metrics.thumb,
      scrollable: el.scrollWidth - el.clientWidth,
    };
    const onMove = (mv) => {
      const s = dragState.current;
      if (!s) return;
      const dx = mv.clientX - s.startClientX;
      const trackable = s.trackWidth - s.thumb;
      if (trackable <= 0) return;
      const nextScroll = s.startScrollLeft + (dx / trackable) * s.scrollable;
      el.scrollLeft = Math.max(0, Math.min(s.scrollable, nextScroll));
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onTrackPointerDown = (e) => {
    // Clicking the track pages the container toward the click point.
    const el = targetRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    if (e.target !== track) return; // ignore clicks on the thumb
    const rect = track.getBoundingClientRect();
    const clickRatio = (e.clientX - rect.left - metrics.thumb / 2) / (rect.width - metrics.thumb);
    const scrollable = el.scrollWidth - el.clientWidth;
    el.scrollLeft = Math.max(0, Math.min(scrollable, clickRatio * scrollable));
  };

  if (!metrics.needed) return null;

  return (
    <div className={styles.container}>
      <div
        ref={trackRef}
        className={styles.track}
        onPointerDown={onTrackPointerDown}
      >
        <div
          className={styles.thumb}
          style={{ width: metrics.thumb, transform: `translateX(${metrics.offset}px)` }}
          onPointerDown={onThumbPointerDown}
        />
      </div>
    </div>
  );
}
