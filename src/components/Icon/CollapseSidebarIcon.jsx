export function CollapseSidebarIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M10 4V19.5M5 10L7 12L5 14M12 22C7.29 22 4.93 22 3.46 20.54C2 19.07 2 16.714 2 12C2 7.29 2 4.93 3.46 3.46C4.93 2 7.29 2 12 2C16.714 2 19.07 2 20.54 3.46C22 4.93 22 7.29 22 12C22 16.714 22 19.07 20.54 20.54C19.07 22 16.714 22 12 22Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
