import { supabase } from '../../lib/supabase';
import { CARE_PATHWAY_CONTENT } from '../../features/settings/care-plan-library/data/carePathwayContent';
import { pathwayToTemplate, rowToPathway } from '../../features/settings/care-plan-library/lib/carePathways';

/*
 * Fold Pathway Library (care_pathways migration + seed). Fold's read-only
 * care pathways; a care manager adapts one into a care plan template. Before
 * the migration, or if the read fails, the bundled content stands in so the
 * library still shows what Fold ships.
 */

const MISSING = new Set(['42P01', 'PGRST205']);
const BUNDLED = CARE_PATHWAY_CONTENT.map((p, i) => ({ ...p, sortOrder: i, publishedAt: null, updatedAt: null }));

export function createCarePathwaysSlice(set, get) {
  return {
    carePathways: [],
    carePathwaysLoaded: false,
    carePathwaysBundled: false,

    fetchCarePathways: async () => {
      const { data, error } = await supabase.from('care_pathways').select('*').order('sort_order');
      if (error || !data?.length) {
        if (error && !MISSING.has(error.code)) console.warn('fetchCarePathways:', error.message);
        set({ carePathways: BUNDLED, carePathwaysLoaded: true, carePathwaysBundled: true });
        return;
      }
      set({ carePathways: data.map(rowToPathway), carePathwaysLoaded: true, carePathwaysBundled: false });
    },

    // A care plan template from a pathway, linked to the live library. Drafts
    // go through approval like any other; supervisors can publish directly.
    adaptCarePathway: async (pathway, { publish = false } = {}) => {
      if (!get().carePlanLibraryDidFetch) await get().fetchCarePlanLibrary();
      const s = get();
      const values = pathwayToTemplate(pathway, {
        goals: s.carePlanGoals,
        interventions: s.carePlanInterventionTemplates,
        barriers: s.carePlanBarriers,
      });
      return get().saveCarePlanTemplate({ ...values, status: publish ? 'published' : 'draft' });
    },
  };
}
