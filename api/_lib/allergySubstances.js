/**
 * SNOMED CT substance lookup, server-side.
 *
 * The UMLS terminology service needs a personal API key, so this never runs
 * in the browser: the key would ship inside the bundle. The drug half of the
 * allergen picker (RxNorm via clinicaltables.nlm.nih.gov) is public and
 * keyless, so it stays a direct client call.
 */

const UMLS_URL = 'https://uts-ws.nlm.nih.gov/rest/search/current';

export const SNOMED_SYSTEM = 'http://snomed.info/sct';

/**
 * @param {object} opts
 * @param {string} opts.q      – search term
 * @param {number} opts.limit  – max concepts
 * @param {object} opts.env    – process.env, injected so this stays testable
 * @returns {Promise<{ results: Array<{system,code,display,kind}>, source: string }>}
 */
export async function searchSubstances({ q, limit = 10, env = {} }) {
  const term = String(q || '').trim();
  if (term.length < 2) return { results: [], source: 'empty' };

  const apiKey = env.UMLS_API_KEY;
  // Unconfigured is a state, not a failure: the caller keeps its drug results
  // and simply shows no non-drug matches.
  if (!apiKey) return { results: [], source: 'unconfigured' };

  const params = new URLSearchParams({
    string: term,
    sabs: 'SNOMEDCT_US',
    returnIdType: 'code',
    pageSize: String(limit),
    apiKey,
  });

  const res = await fetch(`${UMLS_URL}?${params}`);
  if (!res.ok) throw new Error(`UMLS search failed: ${res.status}`);
  const data = await res.json();

  const results = (data?.result?.results || [])
    // UTS returns a single "NO RESULTS" placeholder rather than an empty list.
    .filter(r => r?.ui && r.ui !== 'NONE' && r?.name)
    .map(r => ({ system: SNOMED_SYSTEM, code: r.ui, display: r.name, kind: 'non-drug' }));

  return { results, source: 'umls' };
}
