import { useRef, useState } from 'react';
import { Icon } from '../Icon/Icon';
import styles from './RatingInput.module.css';

/**
 * RatingInput: picks one point on a scale, drawn one of three ways:
 *
 *   slider: a track filled up to the chosen point, with `thumb` (a filled
 *            icon: star, heart, user, thumbs-up) riding the end of the fill
 *   dots  : a row of dots, filled up to the chosen point
 *   tiles : numbered tiles; the chosen one is coloured by `toneOf`
 *
 * Slider and dots are one ARIA slider: click or drag anywhere along the row,
 * or use the arrow keys, Home and End. Tiles are a radio group of real radio
 * inputs, so arrow keys move between them natively.
 *
 * `fillColor` is the author's chosen colour (data, not chrome), so it is
 * applied inline. Tiles ignore it and use the status tones instead.
 *
 * @param {object}   props
 * @param {'slider'|'dots'|'tiles'} props.look
 * @param {Array<{value: string, label?: string}>} props.points – In scale order
 * @param {string}   [props.value]        – The chosen point's value
 * @param {function} [props.onChange]     – Called with a point's value
 * @param {string}   [props.thumb]        – Icon name for the slider's thumb
 * @param {string}   [props.fillColor]
 * @param {boolean}  [props.showScale=true] – Numbers (slider, dots) or the
 *   agreement anchors (tiles) under the row
 * @param {function} [props.toneOf]       – (index, count) → 'low'|'mid'|'high'
 * @param {string}   props.name           – Groups the tiles' radios
 * @param {string}   [props.ariaLabel]
 * @param {boolean}  [props.disabled]     – Inert, e.g. on a builder canvas
 */
export function RatingInput({
  look,
  points = [],
  value,
  onChange,
  thumb,
  fillColor,
  showScale = true,
  toneOf,
  name,
  ariaLabel,
  disabled = false,
}) {
  if (look === 'tiles') {
    return (
      <TileRating
        points={points}
        value={value}
        onChange={onChange}
        showScale={showScale}
        toneOf={toneOf}
        name={name}
        ariaLabel={ariaLabel}
        disabled={disabled}
      />
    );
  }
  return (
    <SliderRating
      look={look}
      points={points}
      value={value}
      onChange={onChange}
      thumb={thumb}
      fillColor={fillColor}
      showScale={showScale}
      ariaLabel={ariaLabel}
      disabled={disabled}
    />
  );
}

function SliderRating({ look, points, value, onChange, thumb, fillColor, showScale, ariaLabel, disabled }) {
  const rowRef = useRef(null);
  const dragging = useRef(false);
  // Dots preview on hover: the row fills to the dot under the pointer, so it
  // shows exactly what a click there would give. Leaving restores the answer.
  const [hoverIdx, setHoverIdx] = useState(null);
  const n = points.length;
  const index = points.findIndex(p => p.value === value); // -1 when unanswered
  const chosen = index + 1;
  const shownDots = hoverIdx != null ? hoverIdx + 1 : chosen;

  const pick = (i) => {
    if (disabled || i < 0 || i >= n) return;
    if (points[i].value !== value) onChange?.(points[i].value);
  };

  // The row is n equal columns; a pointer anywhere in a column is that point.
  const columnAt = (clientX) => {
    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    const col = Math.floor(((clientX - rect.left) / rect.width) * n);
    return Math.min(n - 1, Math.max(0, col));
  };
  const pickAt = (clientX) => {
    const col = columnAt(clientX);
    if (col != null) pick(col);
  };

  const onPointerDown = (e) => {
    if (disabled) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pickAt(e.clientX);
  };
  const onPointerMove = (e) => {
    if (dragging.current) { pickAt(e.clientX); return; }
    // Hover is a mouse idea; a touch has no hover to preview.
    if (look === 'dots' && !disabled && e.pointerType === 'mouse') setHoverIdx(columnAt(e.clientX));
  };
  const onPointerUp = () => { dragging.current = false; };
  const onPointerLeave = () => setHoverIdx(null);

  const onKeyDown = (e) => {
    if (disabled) return;
    const at = index < 0 ? -1 : index;
    const moves = {
      ArrowRight: at + 1, ArrowUp: at + 1, ArrowLeft: at - 1, ArrowDown: at - 1,
      Home: 0, End: n - 1,
    };
    if (!(e.key in moves)) return;
    // Handled here: a paged form listening for arrows to change question must
    // not also see them.
    e.preventDefault();
    e.stopPropagation();
    pick(Math.min(n - 1, Math.max(0, moves[e.key])));
  };

  // The thumb and the end of the fill sit on the centre of the chosen column,
  // directly over its number. Unanswered, the thumb still shows: a slider
  // needs its handle to invite a drag: resting at the very start of the
  // track (half its 24px width in, so it doesn't hang off the edge) with no
  // fill behind it.
  const centre = chosen ? `${((chosen - 0.5) / n) * 100}%` : '0%';
  const thumbAt = chosen ? centre : 'var(--space-3)';
  const current = chosen ? (points[index].label || points[index].value) : undefined;

  return (
    <div
      ref={rowRef}
      className={[styles.slider, disabled ? styles.disabled : ''].filter(Boolean).join(' ')}
      style={{ '--rating-fill': fillColor, '--rating-count': n }}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-valuemin={1}
      aria-valuemax={n}
      aria-valuenow={chosen || undefined}
      aria-valuetext={current ?? 'Not answered'}
      aria-disabled={disabled || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerLeave}
      onKeyDown={onKeyDown}
    >
      {look === 'dots' ? (
        <div className={styles.dots}>
          {points.map((p, i) => (
            <span key={p.value} className={styles.dotCell}>
              <span className={[styles.dot, i < shownDots ? styles.dotOn : ''].filter(Boolean).join(' ')} />
            </span>
          ))}
        </div>
      ) : (
        <div className={styles.track}>
          {chosen > 0 && <span className={styles.fill} style={{ width: centre }} />}
          {thumb && (
            <span className={styles.thumb} style={{ left: thumbAt }}>
              <Icon name={thumb} size={24} color={fillColor} />
            </span>
          )}
        </div>
      )}
      {showScale && (
        <div className={styles.numbers} aria-hidden="true">
          {points.map(p => <span key={p.value} className={styles.number}>{p.label || p.value}</span>)}
        </div>
      )}
    </div>
  );
}

const TILE_TONE_CLASS = { low: 'toneLow', mid: 'toneMid', high: 'toneHigh' };
const NAV_KEYS = new Set(['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End']);

function TileRating({ points, value, onChange, showScale, toneOf, name, ariaLabel, disabled }) {
  const n = points.length;
  // Like the dots, tiles fill cumulatively: every tile up to the point is
  // coloured, all in that point's tone, so the run reads as the score's
  // sentiment. Hover previews exactly the fill a click there would give.
  const [hoverIdx, setHoverIdx] = useState(null);
  const chosenIdx = points.findIndex(p => p.value === value);
  const shownIdx = hoverIdx != null ? hoverIdx : chosenIdx;
  const shownTone = shownIdx >= 0 && toneOf ? styles[TILE_TONE_CLASS[toneOf(shownIdx, n)]] : '';
  return (
    <div className={[styles.tileRating, disabled ? styles.disabled : ''].filter(Boolean).join(' ')}>
      {/* Arrow keys move between the radios natively; keep them from also
          reaching a paged form's question navigation. */}
      <div
        className={styles.tiles}
        role="radiogroup"
        aria-label={ariaLabel}
        onKeyDown={(e) => { if (NAV_KEYS.has(e.key)) e.stopPropagation(); }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {points.map((p, i) => {
          const checked = value === p.value;
          const filled = shownIdx >= 0 && i <= shownIdx;
          return (
            <label
              key={p.value}
              className={[styles.tile, filled ? styles.tileOn : '', filled ? shownTone : ''].filter(Boolean).join(' ')}
              onMouseEnter={() => setHoverIdx(i)}
            >
              <input
                type="radio"
                className={styles.tileInput}
                name={name}
                value={p.value}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange?.(p.value)}
              />
              {p.label || p.value}
            </label>
          );
        })}
      </div>
      {showScale && (
        <div className={styles.anchors} aria-hidden="true">
          <span>Strongly Disagree</span>
          <span className={styles.anchorMid}>Neutral</span>
          <span className={styles.anchorEnd}>Strongly Agree</span>
        </div>
      )}
    </div>
  );
}
