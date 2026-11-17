/* Social determinants of health (SDOH) as a barrier type: six domains, each
   with the specific needs a care manager records. A barrier with an
   sdohDomain + sdohNeed is an SDOH barrier (care_plan_sdoh migration); it
   lives in the plan's Social Needs section, takes community referrals
   (Findhelp, Unite Us) as interventions, and feeds the UDS social-risk
   report. Z-codes are the ICD-10-CM social-determinant codes for each need,
   left blank where no single code fits. Plain JS, shared by the store,
   reports and tests. */

export const SDOH_DOMAINS = [
  {
    key: 'housing', label: 'Housing', icon: 'solar:home-2-linear',
    needs: [
      { key: 'homelessness', label: 'Homelessness', zCode: 'Z59.00' },
      { key: 'housing_instability', label: 'Housing instability / risk of eviction', zCode: 'Z59.811' },
      { key: 'inadequate_housing', label: 'Inadequate housing (utilities, repairs, mold)', zCode: 'Z59.1' },
    ],
  },
  {
    key: 'food', label: 'Food', icon: 'solar:cup-hot-linear',
    needs: [
      { key: 'food_insecurity', label: 'Food insecurity', zCode: 'Z59.41' },
      { key: 'healthy_food_access', label: 'No access to healthy food', zCode: 'Z59.48' },
    ],
  },
  {
    key: 'transportation', label: 'Transportation', icon: 'solar:bus-linear',
    needs: [
      { key: 'transportation_insecurity', label: 'No transportation to care', zCode: 'Z59.82' },
      { key: 'medication_pickup', label: 'Can’t get to the pharmacy', zCode: 'Z59.82' },
    ],
  },
  {
    key: 'finance', label: 'Finance', icon: 'solar:wallet-linear',
    needs: [
      { key: 'financial_insecurity', label: 'Financial insecurity', zCode: 'Z59.86' },
      { key: 'cost_of_medication', label: 'Can’t afford medications', zCode: 'Z59.86' },
      { key: 'material_hardship', label: 'Can’t pay utilities or essentials', zCode: 'Z59.87' },
    ],
  },
  {
    key: 'social', label: 'Social', icon: 'solar:users-group-rounded-linear',
    needs: [
      { key: 'social_isolation', label: 'Social isolation', zCode: 'Z60.4' },
      { key: 'lives_alone', label: 'Lives alone without support', zCode: 'Z60.2' },
      { key: 'caregiver_strain', label: 'Caregiver strain', zCode: 'Z63.6' },
    ],
  },
  {
    key: 'safety', label: 'Safety', icon: 'solar:shield-warning-linear',
    needs: [
      { key: 'interpersonal_violence', label: 'Interpersonal violence', zCode: '' },
      { key: 'unsafe_neighborhood', label: 'Unsafe neighborhood', zCode: '' },
      { key: 'victim_of_crime', label: 'Victim of crime', zCode: 'Z65.4' },
    ],
  },
];

const DOMAIN_BY_KEY = new Map(SDOH_DOMAINS.map(d => [d.key, d]));
const NEED_BY_KEY = new Map(SDOH_DOMAINS.flatMap(d => d.needs.map(n => [n.key, { ...n, domain: d.key }])));

export const sdohDomain = (key) => DOMAIN_BY_KEY.get(key) || null;
export const sdohNeed = (key) => NEED_BY_KEY.get(key) || null;
/** True for a barrier recorded as an SDOH need. */
export const isSdohBarrier = (b) => !!b?.sdohDomain && DOMAIN_BY_KEY.has(b.sdohDomain);

/** The barrier fields for an SDOH need, ready to save or put on a template. */
export function sdohBarrierFields(needKey) {
  const need = sdohNeed(needKey);
  if (!need) return null;
  return { title: need.label, sdohDomain: need.domain, sdohNeed: need.key, zCode: need.zCode || '' };
}

// ── Community referrals ──
// Recorded as interventions of kind 'sdoh-referral' on the barrier they
// address (config.barrierId, or config.barrierTitle on a template). No
// partner API: the referral is tracked here and the partner's site opens in
// a new tab to find or send it.
export const SDOH_REFERRAL_KIND = 'sdoh-referral';
export const REFERRAL_PARTNERS = [
  { key: 'findhelp', label: 'Findhelp', icon: 'solar:map-point-search-linear' },
  { key: 'uniteus', label: 'Unite Us', icon: 'solar:users-group-two-rounded-linear' },
];
export const REFERRAL_STATUSES = ['Draft', 'Sent', 'Accepted', 'Completed', 'Declined'];
export const referralPartner = (key) => REFERRAL_PARTNERS.find(p => p.key === key) || null;

// Findhelp takes a ZIP and search terms; Unite Us has no public search, so
// its link opens the platform for the signed-in partner user.
const SEARCH_TERMS = {
  housing: 'housing', food: 'food', transportation: 'transportation', finance: 'money help',
  social: 'support network', safety: 'safety',
};
export function referralUrl(partnerKey, { domain, zip } = {}) {
  if (partnerKey === 'findhelp') {
    const terms = encodeURIComponent(SEARCH_TERMS[domain] || 'help');
    return zip
      ? `https://www.findhelp.org/search_results/${encodeURIComponent(zip)}?terms=${terms}`
      : `https://www.findhelp.org/search?terms=${terms}`;
  }
  if (partnerKey === 'uniteus') return 'https://app.uniteus.io/';
  return null;
}

/** An SDOH referral intervention for a barrier, as the store saves it. */
export function referralInterventionFields({ partner, barrier, program = '', note = '', status = 'Sent' }) {
  const p = referralPartner(partner);
  return {
    kind: SDOH_REFERRAL_KIND,
    title: `${p?.label || 'Community'} referral: ${program || barrier?.title || 'social need'}`.slice(0, 150),
    status: 'In Progress',
    config: {
      partner,
      program: program.trim(),
      note: note.trim(),
      referralStatus: oneOf(status, REFERRAL_STATUSES, 'Sent'),
      barrierId: barrier?.id || null,
      barrierTitle: barrier?.title || '',
      sdohDomain: barrier?.sdohDomain || null,
      sentOn: status === 'Draft' ? null : new Date().toISOString().slice(0, 10),
    },
  };
}
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);

/** Referrals that address a barrier (by id on a plan, by title on a template). */
export function referralsFor(barrier, interventions = []) {
  return interventions.filter(i => i?.kind === SDOH_REFERRAL_KIND && (
    (barrier.id && i.config?.barrierId === barrier.id)
    || (!i.config?.barrierId && i.config?.barrierTitle && i.config.barrierTitle === barrier.title)
  ));
}
