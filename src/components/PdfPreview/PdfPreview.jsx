import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../Icon/Icon';
import styles from './PdfPreview.module.css';

const CROSSFADE_MS = 220;
const DEBOUNCE_MS = 120;

const emptySlot = () => ({ url: null, ready: false });

/**
 * Fold Health PdfPreview: a live, in-browser PDF preview. Regenerates when
 * `generate` changes (debounced), and crossfades between two iframes so an
 * edit never flashes the viewer blank. Pair with a split drawer, the PDF on
 * one side and its options on the other.
 *
 * Same behaviour as the care plan's preview, taking any generator.
 *
 * @param {object}   props
 * @param {function} props.generate     – () => Blob (a PDF). Memoize it: a new
 *                                         function means "the document changed".
 * @param {boolean}  [props.empty=false] – Nothing to render; shows `emptyLabel`
 * @param {string}   [props.emptyLabel='Select items to generate a preview.']
 * @param {string}   [props.title='PDF preview'] – Accessible name of the viewer
 */
export function PdfPreview({ generate, empty = false, emptyLabel = 'Select items to generate a preview.', title = 'PDF preview' }) {
  const [slotA, setSlotA] = useState(emptySlot);
  const [slotB, setSlotB] = useState(emptySlot);
  const [front, setFront] = useState('A');
  const [crossfading, setCrossfading] = useState(false);

  const slotARef = useRef(slotA);
  const slotBRef = useRef(slotB);
  const frontRef = useRef(front);
  const fadeTimerRef = useRef(null);

  useLayoutEffect(() => {
    slotARef.current = slotA;
    slotBRef.current = slotB;
    frontRef.current = front;
  }, [slotA, slotB, front]);

  const revoke = (url) => { if (url) URL.revokeObjectURL(url); };
  const setSlot = (key, next) => (key === 'A' ? setSlotA(next) : setSlotB(next));
  const getSlot = (key) => (key === 'A' ? slotARef.current : slotBRef.current);

  useEffect(() => {
    if (fadeTimerRef.current) { clearTimeout(fadeTimerRef.current); fadeTimerRef.current = null; }
    // Generation runs in the timer (not the effect body), so a burst of edits
    // builds one PDF, and state is only set from that callback.
    const timer = window.setTimeout(() => {
      if (empty) {
        revoke(slotARef.current.url);
        revoke(slotBRef.current.url);
        setSlotA(emptySlot());
        setSlotB(emptySlot());
        setFront('A');
        setCrossfading(false);
        return;
      }
      const url = URL.createObjectURL(generate());
      if (!slotARef.current.url && !slotBRef.current.url) {
        setSlotA({ url, ready: false });
        setFront('A');
        return;
      }
      setCrossfading(false);
      const back = frontRef.current === 'A' ? 'B' : 'A';
      revoke(getSlot(back).url);
      setSlot(back, { url, ready: false });
    }, empty ? 0 : DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [generate, empty]);

  useEffect(() => () => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    revoke(slotARef.current.url);
    revoke(slotBRef.current.url);
  }, []);

  const finishCrossfade = (back) => {
    const oldFront = back === 'A' ? 'B' : 'A';
    revoke(getSlot(oldFront).url);
    setSlot(oldFront, emptySlot());
    setFront(back);
    setCrossfading(false);
  };

  const handleSlotLoad = (key) => {
    setSlot(key, { ...getSlot(key), ready: true });
    if (key === frontRef.current) return;
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setCrossfading(true);
    fadeTimerRef.current = window.setTimeout(() => finishCrossfade(key), CROSSFADE_MS);
  };

  const renderSlot = (key) => {
    const slot = key === 'A' ? slotA : slotB;
    if (!slot.url) return null;
    const isFront = front === key;
    const isBack = !isFront;
    const visible = isFront || (crossfading && isBack);
    const className = [
      styles.frame,
      isBack ? styles.frameLayer : '',
      visible ? '' : styles.frameHidden,
      crossfading && isFront ? styles.frameHidden : '',
    ].filter(Boolean).join(' ');
    return (
      <iframe
        key={key}
        className={className}
        src={slot.url}
        title={isFront ? title : `${title} (updating)`}
        aria-hidden={!isFront}
        tabIndex={isFront ? 0 : -1}
        onLoad={() => handleSlotLoad(key)}
      />
    );
  };

  const hasPreview = slotA.url || slotB.url;
  const frontSlot = front === 'A' ? slotA : slotB;

  if (!hasPreview) {
    return (
      <div className={styles.empty}>
        <Icon name="custom:pdf-file" size={32} color="var(--neutral-200)" />
        <span>{empty ? emptyLabel : 'Generating preview…'}</span>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      {renderSlot('A')}
      {renderSlot('B')}
      {!frontSlot.ready && !crossfading && (
        <div className={styles.loading} aria-hidden="true">
          <span className={styles.spinner} />
        </div>
      )}
    </div>
  );
}
