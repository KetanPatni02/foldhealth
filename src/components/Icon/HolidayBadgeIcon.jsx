/**
 * Holiday mark: a filled rounded square with a star in it, the holiday
 * counterpart of OooIcon (square + arrow), for the calendar's small strips
 * and lines where the outlined HolidayIcon is too fine to read. The star's
 * edge keeps a 1px stroke at any size (non-scaling), so it stays crisp at 12px.
 */
export function HolidayBadgeIcon({ size = 14, color = 'var(--accent-green)', starColor = 'var(--neutral-0)', className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="16" height="16" rx="3.5" fill={color} />
      <path
        d="M8 4L9.12 6.86L12.18 7.04L9.81 8.99L10.59 11.96L8 10.3L5.41 11.96L6.19 8.99L3.82 7.04L6.88 6.86Z"
        fill={starColor}
        stroke={starColor}
        strokeWidth="1"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
