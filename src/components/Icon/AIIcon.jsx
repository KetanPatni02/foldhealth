import { useId } from 'react';

/**
 * Custom AI/magic sparkle icon — two gradient stars, teal→purple. Used for
 * AI-generated or AI-assisted content and actions (e.g. discharge-summary
 * extraction in Medication Reconciliation) in place of the plain Solar
 * "magic-stick" glyph.
 *
 * @param {object}  props
 * @param {number}  [props.size=16]  — Width & height in px
 * @param {string}  [props.className]
 */
export function AIIcon({ size = 16, className, ...rest }) {
  const uid = useId();
  const gradA = `ai-icon-a-${uid}`;
  const gradB = `ai-icon-b-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <path
        d="M5.35559 2.43856C5.58622 1.85381 6.41378 1.85381 6.64441 2.43856L7.35909 4.25066C7.4295 4.42919 7.57081 4.5705 7.74934 4.64091L9.56144 5.35559C10.1462 5.58622 10.1462 6.41378 9.56144 6.64441L7.74934 7.35909C7.57081 7.4295 7.4295 7.57081 7.35909 7.74934L6.64441 9.56144C6.41378 10.1462 5.58622 10.1462 5.35559 9.56144L4.64091 7.74934C4.5705 7.57081 4.42919 7.4295 4.25066 7.35909L2.43856 6.64441C1.85381 6.41378 1.85381 5.58622 2.43856 5.35559L4.25066 4.64091C4.42919 4.5705 4.5705 4.42919 4.64091 4.25066L5.35559 2.43856Z"
        fill={`url(#${gradA})`}
      />
      <path
        d="M10.9923 8.89875C11.1144 8.5893 11.5523 8.5893 11.6744 8.89875L12.2081 10.2521C12.2453 10.3465 12.3201 10.4213 12.4146 10.4586L13.7679 10.9923C14.0774 11.1144 14.0774 11.5523 13.7679 11.6744L12.4146 12.2081C12.3201 12.2453 12.2453 12.3201 12.2081 12.4146L11.6744 13.7679C11.5523 14.0774 11.1144 14.0774 10.9923 13.7679L10.4586 12.4146C10.4213 12.3201 10.3465 12.2453 10.2521 12.2081L8.89875 11.6744C8.5893 11.5523 8.5893 11.1144 8.89875 10.9923L10.2521 10.4586C10.3465 10.4213 10.4213 10.3465 10.4586 10.2521L10.9923 8.89875Z"
        fill={`url(#${gradB})`}
      />
      <defs>
        <linearGradient id={gradA} x1="8" y1="-7.42" x2="-6.3009" y2="1.60898" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E9DAE" />
          <stop offset="1" stopColor="#D478FF" />
        </linearGradient>
        <linearGradient id={gradB} x1="8" y1="-7.42" x2="-6.3009" y2="1.60898" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E9DAE" />
          <stop offset="1" stopColor="#D478FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
