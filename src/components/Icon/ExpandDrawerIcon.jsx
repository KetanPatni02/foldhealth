export function ExpandDrawerIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip_expand_drawer)">
        <mask id="mask_expand_drawer" style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
          <path d="M8 14.67C11.68 14.67 14.67 11.68 14.67 8C14.67 4.32 11.68 1.33 8 1.33C4.32 1.33 1.33 4.32 1.33 8C1.33 11.68 4.32 14.67 8 14.67Z" fill="white" stroke="white" strokeWidth="1" strokeLinejoin="round"/>
          <path d="M11 7L8 10L5 7" stroke="black" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
        </mask>
        <g mask="url(#mask_expand_drawer)">
          <path d="M0 0L16 0L16 16L0 16L0 0Z" fill="#8C5AE2"/>
        </g>
      </g>
      <defs>
        <clipPath id="clip_expand_drawer">
          <rect width="16" height="16" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
}
