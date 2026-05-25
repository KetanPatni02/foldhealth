export function ExpandDrawerIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip_expand_drawer)">
        <mask id="mask_expand_drawer" style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
          <path d="M7.99967 14.6673C11.6817 14.6673 14.6663 11.6827 14.6663 8.00065C14.6663 4.31865 11.6817 1.33398 7.99967 1.33398C4.31767 1.33398 1.33301 4.31865 1.33301 8.00065C1.33301 11.6827 4.31767 14.6673 7.99967 14.6673Z" fill="white" stroke="white" strokeWidth="1" strokeLinejoin="round"/>
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
