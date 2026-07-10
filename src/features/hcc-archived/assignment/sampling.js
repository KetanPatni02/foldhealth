// Deterministic sampling helpers for the HCC assignment engine.
//
// AC-4 (R1 → R2) requires a 10% sample. AC-5 (R2 → R3) requires a 5% sample.
// Both rates must be **configurable per client** (story implementation note #3).
//
// We pick "deterministic" sampling rather than `Math.random()` so that:
//   - the same DOS always yields the same sampling decision across reloads,
//   - tests are reproducible,
//   - the activity log doesn't show ghost flips.
//
// Hashing strategy: a tiny FNV-1a 32-bit hash over `${patientId}::${dosDate}`,
// modulo 10_000 → a stable integer in [0, 10000). The integer is compared
// against `rate * 10_000`. Using 10_000 gives us 0.01% resolution which is
// plenty for the 5–10% rates the story calls for.

// Default sampling rates from the story (AC-4 and AC-5). These are the
// fall-back values used if the client config doesn't override.
export const DEFAULT_SAMPLING_RATES = {
  r2: 0.10, // 10% of R1-completed DOSs go to R2
  r3: 0.05, // 5% of R2-completed DOSs go to R3
};

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    // 32-bit multiply by 16777619, kept inside int32 with Math.imul
    h = Math.imul(h, 0x01000193);
  }
  // Force unsigned
  return h >>> 0;
}

// Public — returns true if the given (patient, dos) should be promoted to the
// next sample tier. Pass either `'r2'` / `'r3'` (uses default rate) or a
// numeric rate to override.
export function isSampled(patientId, dosDate, rateOrTier) {
  const rate = typeof rateOrTier === 'number'
    ? rateOrTier
    : DEFAULT_SAMPLING_RATES[rateOrTier] ?? 0;
  if (!rate || rate <= 0) return false;
  if (rate >= 1) return true;
  const bucket = fnv1a(`${patientId}::${dosDate}`) % 10_000;
  return bucket < Math.round(rate * 10_000);
}

// Convenience wrappers — easier to read at call sites in lifecycle.js.
export function sampledForR2(patientId, dosDate, rates = DEFAULT_SAMPLING_RATES) {
  return isSampled(patientId, dosDate, rates.r2);
}

export function sampledForR3(patientId, dosDate, rates = DEFAULT_SAMPLING_RATES) {
  return isSampled(patientId, dosDate, rates.r3);
}
