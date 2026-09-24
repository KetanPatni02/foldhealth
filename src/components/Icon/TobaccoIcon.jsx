/**
 * Tobacco icon: a lit cigarette, for the Tobacco section of the Social
 * History drawer. Solar has no cigarette, so this is Lucide's `cigarette`
 * (ISC license), chosen over the Huge Icons and Myna UI versions because its
 * curled smoke matches the soft curves of the Solar icons around it.
 *
 * Drawn at the app's 1px stroke on Solar's 24-unit grid, with Solar's round
 * caps and joins; Lucide ships it at 2px.
 *
 * @param {object}  props
 * @param {number}  [props.size=24]                    – Width & height in px
 * @param {string}  [props.color='var(--neutral-200)'] – Stroke color
 * @param {string}  [props.className]
 */
export function TobaccoIcon({ size = 24, color = 'var(--neutral-200)', className, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <path
        d="M17 12H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h14m1-8c0-2.5-2-2.5-2-5m5 13a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1m1-4c0-2.5-2-2.5-2-5M7 12v4"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
