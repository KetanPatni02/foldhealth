/**
 * Rating icon: a gauge, for the Form Builder's Rating component in the
 * Basic palette. The design's own glyph, supplied directly.
 *
 * A 1px stroke on a 24-unit viewBox with round caps and joins, the same grid
 * and weight as Solar.
 *
 * @param {object}  props
 * @param {number}  [props.size=24]                    – Width & height in px
 * @param {string}  [props.color='var(--neutral-200)'] – Stroke color
 * @param {string}  [props.className]
 */
export function RatingIcon({ size = 24, color = 'var(--neutral-200)', className, ...rest }) {
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
        d="M12 14.0001L16 10.0003M3.34 19C2.46222 17.4799 2.00007 15.7554 2 14.0001C1.99993 12.2447 2.46195 10.5203 3.33962 9.00007C4.21729 7.47987 5.47967 6.21747 6.99989 5.33977C8.52011 4.46207 10.2446 4 12 4C13.7554 4 15.4799 4.46207 17.0001 5.33977C18.5203 6.21747 19.7827 7.47987 20.6604 9.00007C21.538 10.5203 22.0001 12.2447 22 14.0001C21.9999 15.7554 21.5378 17.4799 20.66 19"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
