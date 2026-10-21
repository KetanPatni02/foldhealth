/**
 * Enter / return key glyph (↵): a line down from the top right that turns
 * left into an arrowhead. Solar has no corner-down-left arrow.
 *
 * @param {object}  props
 * @param {number}  [props.size=16]              – Width & height in px
 * @param {string}  [props.color='currentColor'] – Stroke color
 * @param {string}  [props.className]
 */
export function EnterIcon({ size = 16, color = 'currentColor', className, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <path
        d="M13 3V7.5C13 8.88 11.88 10 10.5 10H3M6 7L3 10L6 13"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
