/**
 * Drag handle: a 2 × 3 grid of dots, marking a row that can be dragged to
 * reorder. Solar has no six-dot grip, so this is drawn to its 24-unit grid.
 *
 * @param {object}  props
 * @param {number}  [props.size=16]                    – Width & height in px
 * @param {string}  [props.color='var(--neutral-300)'] – Dot color
 * @param {string}  [props.className]
 */
export function DragHandleIcon({ size = 16, color = 'var(--neutral-300)', className, ...rest }) {
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
      {[6, 12, 18].map(y => [9, 15].map(x => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill={color} />
      )))}
    </svg>
  );
}
