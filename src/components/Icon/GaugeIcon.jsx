/**
 * Gauge Icon: a half dial with a needle, for a score or confidence (e.g.
 * the AI confidence badge in Suggested Members). Stroke 0.8 on its 10px
 * grid, as designed; colour follows `color`.
 */
export function GaugeIcon({ size = 10, color = 'currentColor', className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M5.00004 5.54173L6.66671 3.87506M1.39171 7.62506C1.02596 6.99165 0.833402 6.27312 0.833374 5.5417C0.833346 4.81028 1.02585 4.09174 1.39155 3.4583C1.75724 2.82486 2.28324 2.29885 2.91666 1.93313C3.55009 1.56741 4.26862 1.37488 5.00004 1.37488C5.73146 1.37488 6.45 1.56741 7.08342 1.93313C7.71684 2.29885 8.24284 2.82486 8.60853 3.4583C8.97423 4.09174 9.16674 4.81028 9.16671 5.5417C9.16668 6.27312 8.97412 6.99165 8.60837 7.62506"
        stroke={color}
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
