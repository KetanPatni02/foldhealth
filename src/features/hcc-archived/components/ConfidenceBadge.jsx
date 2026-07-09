import { getConfidence, getScoreStyle } from '../data/confidence';

/**
 * Small star-tagged confidence chip. Renders as `★ {score}` with the
 * tier color from `getScoreStyle`. Used in the HCC upload review
 * table next to each ICD code, and (eventually) anywhere else we
 * need a compact AI-confidence affordance.
 *
 * Pass `score` directly for arbitrary values, or `code` to look up
 * the ICD's confidence from the static CONFIDENCE_DATA table.
 */
export function ConfidenceBadge({ code, score: scoreProp, size = 's', title }) {
  const score = typeof scoreProp === 'number'
    ? scoreProp
    : (code ? getConfidence(code).score : null);
  if (score == null) return null;
  const sty = getScoreStyle(score);
  const isXs = size === 'xs';
  return (
    <span
      title={title || `${score}/100 · ${sty.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: isXs ? '1px 4px' : '2px 5px',
        borderRadius: 999,
        background: sty.bg,
        color: sty.color,
        fontFamily: 'Inter, sans-serif',
        fontSize: isXs ? 9 : 10,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <svg width={isXs ? 7 : 8} height={isXs ? 7 : 8} viewBox="0 0 10 10" fill="currentColor" aria-hidden>
        <path d="M5 0.5l1.2 3 3.2 0.2-2.5 2 0.9 3.1L5 7.2 2.2 8.8l0.9-3.1-2.5-2 3.2-0.2L5 0.5z" />
      </svg>
      {score}
    </span>
  );
}
