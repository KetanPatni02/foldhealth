import { describe, expect, it } from 'vitest';
import {
  SDOH_DOMAINS, isSdohBarrier, referralInterventionFields, referralUrl, referralsFor, sdohBarrierFields,
} from './sdohTaxonomy';
import { sdohSocialRisk } from './sdohReport';

describe('SDOH taxonomy', () => {
  it('has the six domains, each with needs', () => {
    expect(SDOH_DOMAINS.map(d => d.key)).toEqual(['housing', 'food', 'transportation', 'finance', 'social', 'safety']);
    for (const d of SDOH_DOMAINS) expect(d.needs.length).toBeGreaterThan(0);
  });

  it('turns a need into barrier fields, with its Z-code', () => {
    expect(sdohBarrierFields('food_insecurity')).toEqual({
      title: 'Food insecurity', sdohDomain: 'food', sdohNeed: 'food_insecurity', zCode: 'Z59.41',
    });
    expect(sdohBarrierFields('nope')).toBeNull();
    expect(isSdohBarrier({ sdohDomain: 'food' })).toBe(true);
    expect(isSdohBarrier({ title: 'Transportation' })).toBe(false);
  });
});

describe('referrals', () => {
  const barrier = { id: 'b1', title: 'Food insecurity', sdohDomain: 'food' };

  it('records the partner, program and status on the need', () => {
    const r = referralInterventionFields({ partner: 'findhelp', barrier, program: 'Eastside Food Bank', status: 'Sent' });
    expect(r.kind).toBe('sdoh-referral');
    expect(r.title).toBe('Findhelp referral: Eastside Food Bank');
    expect(r.config).toMatchObject({ partner: 'findhelp', barrierId: 'b1', sdohDomain: 'food', referralStatus: 'Sent' });
    expect(referralInterventionFields({ partner: 'uniteus', barrier, status: 'Draft' }).config.sentOn).toBeNull();
  });

  it('finds a need’s referrals by id, or by title from a template', () => {
    const list = [
      { kind: 'sdoh-referral', config: { barrierId: 'b1' } },
      { kind: 'sdoh-referral', config: { barrierTitle: 'Food insecurity' } },
      { kind: 'sdoh-referral', config: { barrierId: 'other' } },
      { kind: 'internal-task', config: { barrierId: 'b1' } },
    ];
    expect(referralsFor(barrier, list)).toHaveLength(2);
  });

  it('links Findhelp search by domain and ZIP', () => {
    expect(referralUrl('findhelp', { domain: 'food', zip: '94110' })).toBe('https://www.findhelp.org/search_results/94110?terms=food');
    expect(referralUrl('uniteus')).toBe('https://app.uniteus.io/');
  });
});

describe('sdohSocialRisk', () => {
  const barriers = [
    { id: 'b1', plan_id: 'p1', title: 'Food insecurity', sdoh_domain: 'food', status: 'Resolved' },
    { id: 'b2', plan_id: 'p2', title: 'Food insecurity', sdoh_domain: 'food', status: 'In Progress' },
    { id: 'b3', plan_id: 'p1', title: 'No transportation to care', sdoh_domain: 'transportation', status: 'Not Started' },
  ];
  const referrals = [
    { id: 'r1', plan_id: 'p1', config: { barrierId: 'b1', referralStatus: 'Completed' } },
    { id: 'r2', plan_id: 'p2', config: { barrierTitle: 'Food insecurity', referralStatus: 'Sent' } },
  ];
  const planPatient = new Map([['p1', 'pt1'], ['p2', 'pt2']]);
  const { totals, domains } = sdohSocialRisk({ barriers, referrals, planPatient });

  it('counts patients, referrals, closed loops and resolution per domain', () => {
    const food = domains.find(d => d.key === 'food');
    expect(food).toMatchObject({ patients: 2, needs: 2, referred: 2, referredPct: 100, referrals: 2, closedLoop: 1, closedLoopPct: 50, resolved: 1, resolvedPct: 50 });
    expect(domains.find(d => d.key === 'housing').needs).toBe(0);
  });

  it('totals distinct patients across domains', () => {
    expect(totals).toMatchObject({ patients: 2, needs: 3, referred: 2, resolved: 1 });
  });
});
