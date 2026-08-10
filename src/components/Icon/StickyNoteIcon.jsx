export function StickyNoteIcon({ size = 20, color = 'var(--neutral-300)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12.5 18.33H10C6.07 18.33 4.11 18.33 2.89 17.113C1.67 15.89 1.67 13.93 1.67 10C1.67 6.07 1.67 4.11 2.89 2.89C4.11 1.67 6.07 1.67 10 1.67C13.93 1.67 15.89 1.67 17.11 2.89C18.33 4.11 18.33 6.07 18.33 10V12.5M12.5 18.33C15.722 18.33 18.33 15.72 18.33 12.5M12.5 18.33C12.5 16.78 12.5 16.01 12.7 15.38C13.12 14.11 14.11 13.12 15.38 12.704C16.01 12.5 16.78 12.5 18.33 12.5" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
