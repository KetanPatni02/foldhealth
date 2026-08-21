/**
 * Member-consent glyph — signed document + medal/ribbon with a pen stroke.
 * Figma source is a 1px outline; this is a stroke reconstruction so the
 * palette can inherit `color` instead of a 50 KB expanded-fill dump.
 *
 * Usage: <Icon name="custom:member-consent" size={20} color="var(--primary-300)" />
 */
export function MemberConsentIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2.5 12.95v8.67c0 .07.06.13.13.13H6.34c.41 0 .75-.31.79-.72L7.75 13.56c.05-.57.28-1.13.72-1.5l1.12-.95c.51-.44.95-.87 1.22-1.38.2-.37.36-.77.47-1.18l.37-1.41c.11-.42.4-.77.8-.96.35-.17.76-.2 1.14-.08.24.08.43.28.49.52.15.56.17 1.15.08 1.73L10.5 12.29c-.01.08.05.16.15.16h4.01c1.11 0 1.95.99 1.76 2.09l-.55 3.14C15.39 20.47 12.87 22.5 9.94 22.5H2.38c-.48 0-.88-.39-.88-.87V12.95"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.81 2.5c.48 0 .93.16 1.63.4.36.12.68.24.95.37.25.12.45.23.58.34.21.18.3.38.37.61.06.22.1.45.13.75.04.5.03 1.18.03 2.14 0 2.91-2.22 4.3-3.51 4.86-.17.07-.33.15-.51.2-.2.05-.4.07-.67.07s-.47-.02-.66-.07c-.19-.05-.35-.13-.52-.2C15.35 10.91 13.13 9.52 13.13 6.61c0-.96 0-1.64.03-2.14.03-.3.07-.53.13-.75.07-.23.16-.43.37-.61.13-.11.33-.22.58-.34.27-.13.59-.25.95-.37.7-.24 1.15-.4 1.62-.4Z"
        stroke={color}
        strokeLinejoin="round"
      />
      <path
        d="M16.4 6.84 19.47 5.73"
        stroke={color}
        strokeLinecap="round"
      />
    </svg>
  );
}
