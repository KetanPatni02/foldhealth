/**
 * Out of Office mark: a filled rounded square with a white arrow pointing
 * right (Figma Eventus 17436:107488). Solar has only the outlined square,
 * which drew a square inside the badge's own square. The arrow keeps a 1px
 * stroke at any size (non-scaling), so it stays visible at 8px.
 */
export function OooIcon({ size = 14, color = 'var(--primary-300)', arrowColor = 'var(--neutral-0)', className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="16" height="16" rx="3.5" fill={color} />
      <path d="M4.5 8H11.5M9 5.5L11.5 8L9 10.5" stroke={arrowColor} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
