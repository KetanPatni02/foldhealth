export function AssessmentCompletedIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path
        d="M2.2 5.4L3.7 7C4 7.3 4.4 7.3 4.7 7.1L8.2 3.6"
        stroke="var(--status-success)"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AssessmentNotStartedIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path
        d="M5.3 1.3V2.7M9.3 5.3H8M5.3 9.3V8M1.3 5.3H2.7M2.5 2.5L3.4 3.4M8.2 2.5L7.2 3.4M8.2 8.2L7.2 7.2M2.5 8.2L3.4 7.2"
        stroke="var(--neutral-300)"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AssessmentPartialIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="5.5" r="4.5" fill="var(--neutral-0)" stroke="var(--status-success)" />
      <path d="M5.5 1A4.5 4.5 0 0 1 10 5.5A4.5 4.5 0 0 1 5.5 10V1Z" fill="var(--status-success)" />
    </svg>
  );
}
