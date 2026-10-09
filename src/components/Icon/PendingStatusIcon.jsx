/**
 * Pending / In Progress status glyph: eight short rays around a centre, from
 * the design system's Status icon (Figma ICD-Import 7118:161817, "🔆/Pending").
 * Registered as `custom:pending` in Icon.
 *
 * @param {object} props
 * @param {number} [props.size=14]
 * @param {string} [props.color='var(--status-warning)'] Stroke colour
 */
export function PendingStatusIcon({ size = 14, color = 'var(--status-warning)', className, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10.6667 10.6667"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <path
        d="M5.33333 1.33333V2.66667M9.33333 5.33333H8M5.33333 9.33333V8M1.33333 5.33333H2.66667M2.50484 2.5049L3.44765 3.44771M8.1617 2.5049L7.21889 3.44771M8.16182 8.16175L7.21902 7.21894M2.50496 8.16175L3.44777 7.21894"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
