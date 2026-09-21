/** Shared title key for care plan dedupe / template matching. */
export function norm(s) {
  return (s || '').trim().toLowerCase();
}
