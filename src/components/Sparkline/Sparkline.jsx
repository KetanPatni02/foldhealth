import styles from './Sparkline.module.css';

const VIEW_WIDTH = 100;

/**
 * Sparkline: a tiny trend line with no axes, scaled to its own min/max and
 * stretched to the container's width. For a value's recent direction next to
 * the value itself (vitals tiles), not for reading exact numbers.
 *
 * @param {object} props
 * @param {number[]} props.values             Oldest first; needs at least two
 * @param {string} [props.color='var(--primary-300)']
 * @param {number} [props.height=24]
 * @param {string} [props.label]              Accessible description; decorative when omitted
 */
export function Sparkline({ values, color = 'var(--primary-300)', height = 24, label }) {
  if (!Array.isArray(values) || values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => `${((i * VIEW_WIDTH) / (values.length - 1)).toFixed(2)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(2)}`)
    .join(' ');
  return (
    <svg
      className={styles.sparkline}
      viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      preserveAspectRatio="none"
      height={height}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
