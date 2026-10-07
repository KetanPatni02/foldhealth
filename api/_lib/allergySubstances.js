/**
 * SNOMED CT substance lookup, server-side.
 *
 * The UMLS terminology service needs a personal API key, so this never runs
 * in the browser: the key would ship inside the bundle. The drug half of the
 * allergen picker (RxNorm via clinicaltables.nlm.nih.gov) is public and
 * keyless, so it stays a direct client call.
 */

const UMLS_URL = 'https://uts-ws.nlm.nih.gov/rest/search/current';
const SNOMED_CONTENT_URL = 'https://uts-ws.nlm.nih.gov/rest/content/current/source/SNOMEDCT_US';

// What an allergen can be. SNOMED tags every concept's fully specified name
// with its hierarchy ("Peanut (substance)", "Peanut specific IgE antibody
// measurement (procedure)"), so the tag is how lab tests, procedures and
// unrelated disorders are told apart from allergens.
const ALLERGEN_TAGS = new Set(['substance', 'organism', 'physical object', 'product', 'medicinal product']);
// Findings and disorders only when they name an allergy itself ("Allergy to
// peanut (finding)"), not anything else that matched the typed prefix.
const ALLERGY_FINDING_TAGS = new Set(['finding', 'disorder']);
const ALLERGY_WORDS = /allerg|intoleran|hypersensitiv|anaphyla/i;
// SNOMED also files antibodies and test reagents as substances ("Peanut
// specific immunoglobulin E", "Cat dander IgG4", "… diagnostic allergen
// extract"); they're what a lab measures, not what a patient reacts to.
const LAB_SUBSTANCE_WORDS = /immunoglobulin|\bIg[AEGM]\d?\b|antibod|antigen|agglutinin|diagnostic allergen extract/i;

// Candidates checked per search: each costs one UTS call (UTS allows about
// 20 a second), so a typeahead keystroke stays well inside that.
const MAX_CANDIDATES = 12;

// SNOMED code → semantic tag. Tags never change for a code, so they're kept
// for the life of the server process.
const tagCache = new Map();

async function semanticTag(code, apiKey) {
  if (tagCache.has(code)) return tagCache.get(code);
  const params = new URLSearchParams({ ttys: 'FN', apiKey });
  const res = await fetch(`${SNOMED_CONTENT_URL}/${encodeURIComponent(code)}/atoms?${params}`);
  if (!res.ok) throw new Error(`UMLS atoms failed: ${res.status}`);
  const data = await res.json();
  const fsn = data?.result?.[0]?.name || '';
  const tag = /\(([^()]+)\)\s*$/.exec(fsn)?.[1]?.toLowerCase() || null;
  tagCache.set(code, tag);
  return tag;
}

/** Whether a concept is something a patient can be allergic to. */
export function isAllergen(name, tag) {
  if (LAB_SUBSTANCE_WORDS.test(name)) return false;
  if (!tag) return true; // unknown: keep rather than hide a real allergen
  if (ALLERGEN_TAGS.has(tag)) return true;
  return ALLERGY_FINDING_TAGS.has(tag) && ALLERGY_WORDS.test(name);
}

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

  // UTS matches whole words by default, so a half-typed "pean" finds
  // nothing. Whole-word hits are the most relevant, so they lead; prefix
  // matches (`rightTruncation`, "pean" → "Peanut …") fill the rest of the
  // list, which is what makes the picker work as a typeahead.
  const search = async (searchType) => {
    const params = new URLSearchParams({
      string: term,
      sabs: 'SNOMEDCT_US',
      returnIdType: 'code',
      pageSize: String(MAX_CANDIDATES),
      searchType,
      apiKey,
    });
    const res = await fetch(`${UMLS_URL}?${params}`);
    if (!res.ok) throw new Error(`UMLS search failed: ${res.status}`);
    const data = await res.json();
    return (data?.result?.results || [])
      // UTS returns a single "NO RESULTS" placeholder rather than an empty list.
      .filter(r => r?.ui && r.ui !== 'NONE' && r?.name);
  };

  const [words, prefix] = await Promise.all([search('words'), search('rightTruncation')]);
  const seen = new Set();
  const candidates = [...words, ...prefix]
    .filter((r) => (seen.has(r.ui) ? false : seen.add(r.ui)))
    .slice(0, MAX_CANDIDATES);

  // A tag lookup that fails (rate limit, timeout) keeps its concept: better a
  // little noise than a missing allergen.
  const tags = await Promise.all(candidates.map(r => semanticTag(r.ui, apiKey).catch(() => null)));
  // Closest first: the exact name, then names starting with what was typed,
  // shorter before longer ("Peanut" before "Peanut-induced anaphylaxis").
  // One entry per name: SNOMED has a few same-named concepts.
  const typed = term.toLowerCase();
  const rank = (name) => {
    const n = name.toLowerCase();
    return n === typed ? 0 : n.startsWith(typed) ? 1 : 2;
  };
  const names = new Set();
  const results = candidates
    .filter((r, i) => isAllergen(r.name, tags[i]))
    .filter((r) => { const n = r.name.toLowerCase(); return names.has(n) ? false : names.add(n); })
    .sort((a, b) => rank(a.name) - rank(b.name) || a.name.length - b.name.length)
    .slice(0, limit)
    .map(r => ({ system: SNOMED_SYSTEM, code: r.ui, display: r.name, kind: 'non-drug' }));

  return { results, source: 'umls' };
}
