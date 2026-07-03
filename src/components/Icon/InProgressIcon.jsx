/**
 * In Progress status icon — pie chart at 50%, half-filled with the
 * status-warning amber. Used by `statusSpec.js` for the "In Progress"
 * row across worklist cells, the DiagPanel status pill, and the legend.
 *
 * Provided verbatim from Figma (Jan-Feb 2026 file). The colour comes
 * through as a prop so it can stay in lockstep with the spec's `color`
 * field — both the half-fill and the surrounding ring use the same tone.
 *
 * @param {object}  props
 * @param {number}  [props.size=12]            — Width & height in px
 * @param {string}  [props.color='#D9A50B']    — Fill + stroke (warning amber)
 * @param {string}  [props.className]
 */
export function InProgressIcon({ size = 12, color = '#D9A50B', className, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-1 -1 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {/* Base white disc */}
      <path
        d="M0 6C0 2.68629 2.68629 0 6 0C9.31371 0 12 2.68629 12 6C12 9.31371 9.31371 12 6 12C2.68629 12 0 9.31371 0 6Z"
        fill="white"
      />
      {/* Right-half progress fill */}
      <path
        d="M6 0C6.84983 1.01342e-08 7.68997 0.180532 8.46479 0.529643C9.23961 0.878753 9.93142 1.38848 10.4944 2.02506C11.0574 2.66165 11.4788 3.41058 11.7306 4.22225C11.9824 5.03393 12.0589 5.88983 11.955 6.73329C11.8512 7.57676 11.5693 8.38854 11.1281 9.11488C10.6869 9.84122 10.0965 10.4656 9.39585 10.9465C8.69523 11.4275 7.90042 11.7542 7.06405 11.9049C6.22769 12.0556 5.36885 12.0269 4.54441 11.8208L6 6V0Z"
        fill={color}
      />
      {/* Outer ring */}
      <path
        d="M6 0.375C9.1066 0.375 11.625 2.8934 11.625 6C11.625 9.1066 9.1066 11.625 6 11.625C2.8934 11.625 0.375 9.1066 0.375 6C0.375 2.8934 2.8934 0.375 6 0.375Z"
        stroke={color}
        strokeWidth="1"
      />
    </svg>
  );
}
