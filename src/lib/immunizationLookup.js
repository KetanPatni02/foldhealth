// CVX vaccine lookup for the Add Immunizations drawer.
//
// Unlike the allergy lookup, there is only one source and no third party in
// the request path: /api/reference/immunizations answers from a CVX snapshot
// the weekly sync job refreshes (scripts/sync-cvx.mjs). So there is no key to
// protect, no partial-failure case to report, and a result either arrives or
// the request itself failed.
//
// Results are cached per query so a typeahead does not re-ask for a term the
// user has already typed through.

const IMMUNIZATIONS_URL = '/api/reference/immunizations';

export const CVX_SYSTEM = 'http://hl7.org/fhir/sid/cvx';

const MIN_CHARS = 2;
const CACHE_MAX = 100;
const cache = new Map();

const cacheKey = q => q.trim().toLowerCase();

function writeCache(key, value) {
  cache.set(key, value);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

/**
 * Search CVX by short description or full vaccine name.
 *
 * @returns {Promise<Array<{system: string, code: string, display: string,
 *   fullName: string, status: string}>>}
 */
export async function searchImmunizations(query, { signal, limit = 10 } = {}) {
  const term = String(query || '').trim();
  if (term.length < MIN_CHARS) return [];

  const key = cacheKey(term);
  const hit = cache.get(key);
  if (hit) return hit;

  const params = new URLSearchParams({ q: term, limit: String(limit) });
  const res = await fetch(`${IMMUNIZATIONS_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Immunization lookup failed: ${res.status}`);
  const data = await res.json();

  const results = data?.results || [];
  writeCache(key, results);
  return results;
}
