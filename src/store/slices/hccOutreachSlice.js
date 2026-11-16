import { supabase } from '../../lib/supabase';
import { reportPersistFailure } from '../lib/reportPersistFailure';
import { HCC_OUTREACH_MOCK } from '../../features/hcc/data/hccOutreachMock';
import { hccOutreachToRow, rowToHccOutreach } from '../../features/hcc/data/hccOutreachRows';

/**
 * HCC Outreach log (Astrana): outreach to the Member and PCP about HCC gaps,
 * from the HCC chart's Outreach tab (hcc_outreach_logs). Falls back to the
 * local mock while the table is missing or empty.
 */
export function createHccOutreachSlice(set, get) {
  return {
    hccOutreachLogs: [],
    hccOutreachLoading: false,
    hccOutreachDidFetch: false,
    // Set by the chart toolbar's More > Log Outreach: the Outreach tab opens
    // with the form already open, then clears it.
    hccOutreachLogRequested: false,
    // Bumped per request so an Outreach tab that is already open remounts.
    hccOutreachLogNonce: 0,
    requestHccOutreachLog: () => set(s => ({ hccOutreachLogRequested: true, hccOutreachLogNonce: s.hccOutreachLogNonce + 1 })),
    clearHccOutreachLogRequest: () => set({ hccOutreachLogRequested: false }),

    fetchHccOutreachLogs: async () => {
      if (get().hccOutreachDidFetch) return;
      set({ hccOutreachDidFetch: true, hccOutreachLoading: true });
      try {
        const { data, error } = await supabase
          .from('hcc_outreach_logs')
          .select('*')
          .order('log_date', { ascending: false });
        if (error) throw error;
        set({ hccOutreachLogs: data?.length ? data.map(rowToHccOutreach) : HCC_OUTREACH_MOCK });
      } catch (err) {
        console.warn('fetchHccOutreachLogs: falling back to local mock:', err?.message || err);
        set({ hccOutreachLogs: HCC_OUTREACH_MOCK });
      } finally {
        set({ hccOutreachLoading: false });
      }
    },

    // Saved from the Outreach tab: one log per HCC gap picked (or one Member
    // Outreach), so each lands under its HCC in the feed.
    addHccOutreachLogs: (logs) => {
      if (!logs?.length) return;
      set(s => ({ hccOutreachLogs: [...logs, ...s.hccOutreachLogs] }));
      supabase.from('hcc_outreach_logs').insert(logs.map(hccOutreachToRow))
        .then(({ error }) => { if (error) reportPersistFailure('addHccOutreachLogs', error); });
    },

    updateHccOutreachLog: (id, patch) => {
      const before = get().hccOutreachLogs.find(l => String(l.id) === String(id));
      if (!before) return;
      const next = { ...before, ...patch, id: before.id };
      set(s => ({ hccOutreachLogs: s.hccOutreachLogs.map(l => (l.id === before.id ? next : l)) }));
      supabase.from('hcc_outreach_logs').update(hccOutreachToRow(next)).eq('id', String(before.id))
        .then(({ error }) => { if (error) reportPersistFailure('updateHccOutreachLog', error); });
    },

    deleteHccOutreachLog: (id) => {
      set(s => ({ hccOutreachLogs: s.hccOutreachLogs.filter(l => String(l.id) !== String(id)) }));
      supabase.from('hcc_outreach_logs').delete().eq('id', String(id))
        .then(({ error }) => { if (error) reportPersistFailure('deleteHccOutreachLog', error); });
    },
  };
}
