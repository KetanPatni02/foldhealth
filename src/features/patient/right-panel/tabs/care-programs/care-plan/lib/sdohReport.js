/* UDS-style social-risk KPIs from care plan SDOH data: per domain, how many
   patients have a need, how many needs were referred to a community partner,
   how many referrals closed the loop, and how many needs were resolved.
   Inputs are the raw rows the store reads (patient_care_plan_barriers with an
   sdoh_domain, 'sdoh-referral' interventions, and the plans' patient ids). */

import { SDOH_DOMAINS } from './sdohTaxonomy';
import { isAchievedStatus } from './gbiStatus';

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

/**
 * @param {{ barriers: object[], referrals: object[], planPatient: Map<string,string> }} input
 *   barriers:  { id, plan_id, title, sdoh_domain, status }
 *   referrals: { id, plan_id, config: { barrierId, barrierTitle, referralStatus } }
 *   planPatient: plan id → patient id
 * @returns {{ totals, domains }} totals and one row per domain, in taxonomy order.
 */
export function sdohSocialRisk({ barriers = [], referrals = [], planPatient = new Map() }) {
  // A referral names its need by id, or (applied from a template) by title
  // on the same plan.
  const barrierByTitle = new Map(barriers.map(b => [`${b.plan_id}::${(b.title || '').trim().toLowerCase()}`, b.id]));
  const referralsByBarrier = new Map();
  for (const r of referrals) {
    const id = r?.config?.barrierId
      || barrierByTitle.get(`${r?.plan_id}::${(r?.config?.barrierTitle || '').trim().toLowerCase()}`);
    if (!id) continue;
    referralsByBarrier.set(id, [...(referralsByBarrier.get(id) || []), r]);
  }

  const blank = () => ({ patients: new Set(), needs: 0, referred: 0, referrals: 0, closedLoop: 0, resolved: 0 });
  const byDomain = new Map(SDOH_DOMAINS.map(d => [d.key, blank()]));
  const all = blank();
  for (const b of barriers) {
    const row = byDomain.get(b?.sdoh_domain);
    if (!row) continue;
    const patient = planPatient.get(b.plan_id);
    const refs = referralsByBarrier.get(b.id) || [];
    const completed = refs.filter(r => r.config?.referralStatus === 'Completed').length;
    for (const agg of [row, all]) {
      if (patient) agg.patients.add(patient);
      agg.needs += 1;
      if (refs.length) agg.referred += 1;
      agg.referrals += refs.length;
      agg.closedLoop += completed;
      if (isAchievedStatus(b.status)) agg.resolved += 1;
    }
  }

  const shape = (agg) => ({
    patients: agg.patients.size,
    needs: agg.needs,
    referred: agg.referred,
    referredPct: pct(agg.referred, agg.needs),
    referrals: agg.referrals,
    closedLoop: agg.closedLoop,
    closedLoopPct: pct(agg.closedLoop, agg.referrals),
    resolved: agg.resolved,
    resolvedPct: pct(agg.resolved, agg.needs),
  });
  return {
    totals: shape(all),
    domains: SDOH_DOMAINS.map(d => ({ key: d.key, label: d.label, icon: d.icon, ...shape(byDomain.get(d.key)) })),
  };
}
