/**
 * Care-program completion indicator.
 *
 * Fills a green pie clockwise from 12 o'clock in proportion to `progress`
 * (0–100). At 100% it becomes the green-check "complete" badge.
 * Figma: 375-133000 (in-progress) / 8056-290012 (complete).
 */
export function ProgramStatusRing({ progress = 0, size = 16 }) {
  const pct = Math.max(0, Math.min(100, progress));
  const c = 8;
  const r = 7;

  if (pct >= 100) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ flexShrink: 0 }}>
        <circle cx={c} cy={c} r={r} fill="var(--status-success-light)" stroke="var(--status-success)" strokeWidth="1" />
        <path
          d="M4.8 8.3 L6.9 10.4 L11.3 5.7"
          fill="none"
          stroke="var(--status-success)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const theta = (pct / 100) * 2 * Math.PI;
  const x = c + r * Math.sin(theta);
  const y = c - r * Math.cos(theta);
  const largeArc = theta > Math.PI ? 1 : 0;
  const pie = pct > 0 ? `M${c} ${c} L${c} ${c - r} A${r} ${r} 0 ${largeArc} 1 ${x} ${y} Z` : '';

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill="var(--neutral-0)" stroke="var(--status-success)" strokeWidth="1" />
      {pie && <path d={pie} fill="var(--status-success)" />}
    </svg>
  );
}
