import { useMemo } from 'react';
import {
  SDOH_REFERRAL_KIND, isSdohBarrier, referralPartner, sdohBarrierFields,
} from '../../../patient/right-panel/tabs/care-programs/care-plan/lib/sdohTaxonomy';

/**
 * SDOH on a template being authored (New Template and the template editor
 * keep the same barriers / interventions lists). A need is a barrier entry
 * with sdohDomain / sdohNeed; a suggested referral is an 'sdoh-referral'
 * intervention entry naming the need by title, which becomes a Draft
 * referral when the template is applied. Returns the SDOH barriers, the rest,
 * and the props for <CarePlanSections sdoh={…}>.
 */
export function useTemplateSdoh({ barriers, setBarriers, interventions, setInterventions }) {
  const sdohBarriers = useMemo(() => barriers.filter(isSdohBarrier), [barriers]);
  const plainBarriers = useMemo(() => barriers.filter(b => !isSdohBarrier(b)), [barriers]);

  const sdoh = {
    barriers: sdohBarriers,
    interventions,
    onAddNeed: (needKey) => {
      const fields = sdohBarrierFields(needKey);
      if (!fields) return;
      setBarriers(prev => (prev.some(b => b.sdohNeed === needKey) ? prev : [...prev, { id: `sdoh-${needKey}`, ...fields }]));
    },
    onRemoveNeed: (need) => {
      setBarriers(prev => prev.filter(b => b.id !== need.id));
      setInterventions(prev => prev.filter(i => !(i.kind === SDOH_REFERRAL_KIND && i.config?.barrierTitle === need.title)));
    },
    onRefer: (need, partner) => {
      const p = referralPartner(partner);
      setInterventions(prev => (prev.some(i => i.kind === SDOH_REFERRAL_KIND && i.config?.partner === partner && i.config?.barrierTitle === need.title)
        ? prev
        : [...prev, {
          id: `ref-${partner}-${need.sdohNeed}`,
          title: `${p?.label || 'Community'} referral: ${need.title}`,
          kind: SDOH_REFERRAL_KIND,
          config: { partner, barrierTitle: need.title, sdohDomain: need.sdohDomain, referralStatus: 'Draft' },
        }]));
    },
    onRemoveReferral: (referral) => setInterventions(prev => prev.filter(i => i.id !== referral.id)),
  };
  return { sdohBarriers, plainBarriers, sdoh };
}
