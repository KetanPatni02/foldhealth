/**
 * SDOH icon: a coin, for the Social Determinants of Health section of the
 * Social History drawer. The design's own glyph, supplied directly.
 *
 * A 1px stroke on a 24-unit viewBox with round caps, the same grid and
 * weight as Solar.
 *
 * @param {object}  props
 * @param {number}  [props.size=24]                    – Width & height in px
 * @param {string}  [props.color='var(--neutral-200)'] – Stroke color
 * @param {string}  [props.className]
 */
export function SdohIcon({ size = 24, color = 'var(--neutral-200)', className, ...rest }) {
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
        d="M12 17C13.6569 17 15 15.8807 15 14.5C15 13.1193 13.6569 12 12 12C10.3431 12 9 10.8807 9 9.5C9 8.11929 10.3431 7 12 7M12 17C10.3431 17 9 15.8807 9 14.5M12 17V18M12 6V7M12 7C13.6569 7 15 8.11929 15 9.5M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}
