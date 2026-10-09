/**
 * In Progress status glyph: an outer ring with the right half of the inner
 * disc filled. Provided from design for In Progress status entries (Care Plan
 * History). Registered as `custom:in-progress` in Icon.
 *
 * @param {object} props
 * @param {number} [props.size=14]
 * @param {string} [props.color='var(--status-warning)'] Fill colour
 */
export function InProgressRingIcon({ size = 14, color = 'var(--status-warning)', className, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <path
        d="M1 7C1 10.3138 3.6862 13 7 13C10.3138 13 13 10.3138 13 7C13 3.6862 10.3138 1 7 1C3.6862 1 1 3.6862 1 7ZM11.8 7C11.8 8.27304 11.2943 9.49394 10.3941 10.3941C9.49394 11.2943 8.27304 11.8 7 11.8C5.72696 11.8 4.50606 11.2943 3.60589 10.3941C2.70571 9.49394 2.2 8.27304 2.2 7C2.2 5.72696 2.70571 4.50606 3.60589 3.60589C4.50606 2.70571 5.72696 2.2 7 2.2C8.27304 2.2 9.49394 2.70571 10.3941 3.60589C11.2943 4.50606 11.8 5.72696 11.8 7ZM10.6 7C10.6 7.95478 10.2207 8.87045 9.54559 9.54559C8.87045 10.2207 7.95478 10.6 7 10.6V3.4C7.95478 3.4 8.87045 3.77928 9.54559 4.45442C10.2207 5.12955 10.6 6.04522 10.6 7Z"
        fill={color}
      />
    </svg>
  );
}
