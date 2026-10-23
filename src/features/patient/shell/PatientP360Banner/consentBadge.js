const POPOVER_WIDTH = 320;

/** "1/2" for the banner, or "N/A" when no open program needs consent. */
export const consentSummaryLabel = (summary) => (summary?.total ? `${summary.given}/${summary.total}` : 'N/A');

/** Below the anchor, kept 8px inside the viewport's right edge. */
export function consentPopoverPos(anchor) {
  const rect = anchor?.getBoundingClientRect();
  if (!rect) return null;
  return { top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8) };
}
