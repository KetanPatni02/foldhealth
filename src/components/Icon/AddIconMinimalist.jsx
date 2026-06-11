/**
 * Add Icon (Minimalist) — a simple plus (+) in a 16×16 viewBox.
 * Designed for use on colored backgrounds (default fill: white).
 */
export function AddIconMinimalist({ size = 16, color = 'white', className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M12 8.50003C12.2761 8.50003 12.5 8.27618 12.5 8.00003C12.5 7.72389 12.2761 7.50003 12 7.50003V8.00003V8.50003ZM4 7.50003C3.72386 7.50003 3.5 7.72389 3.5 8.00003C3.5 8.27618 3.72386 8.50003 4 8.50003V8.00003V7.50003ZM8.5 4C8.5 3.72386 8.27614 3.5 8 3.5C7.72386 3.5 7.5 3.72386 7.5 4L8 4L8.5 4ZM7.5 12C7.5 12.2761 7.72386 12.5 8 12.5C8.27614 12.5 8.5 12.2761 8.5 12H8H7.5ZM12 8.00003V7.50003H8V8.00003V8.50003H12V8.00003ZM8 8.00003V7.50003H4V8.00003V8.50003H8V8.00003ZM8 4L7.5 4L7.5 8.00003L8 8.00003H8.5L8.5 4L8 4ZM8 8.00003H7.5V12H8H8.5V8.00003H8Z"
        fill={color}
      />
    </svg>
  );
}
