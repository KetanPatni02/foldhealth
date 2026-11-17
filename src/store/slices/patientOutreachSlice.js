import { supabase } from '../../lib/supabase';
import { reportPersistFailure } from '../lib/reportPersistFailure';
import { PATIENT_OUTREACH_MOCK } from '../../features/hcc/outreach/patientOutreachMock';
import { patientOutreachToRow, rowToPatientOutreach } from '../../features/hcc/outreach/patientOutreachRows';
import { LAUNCH_OUTCOMES, lastOutreachOf, isCounted } from '../../features/hcc/outreach/outreachModel';

const rowToOutcome = (r) => ({ id: r.id, program: r.program, category: r.category, label: r.label, recipients: r.recipients || [], active: r.active !== false, sortOrder: r.sort_order });

/**
 * Patient-level outreach (HCC Patient Outreach tab, patient_outreach): saved
 * once per patient (Member ID) and read per patient. Entries are never
 * edited or deleted; a correction is a new Note linked to the original.
 * Falls back to the local mock while the table is missing or empty.
 */
export function createPatientOutreachSlice(set, get) {
  return {
    // patientKey → entries
    patientOutreachByKey: {},
    // patientKey → 'loading' | 'ready'
    patientOutreachStatus: {},
    // Toolbar / worklist-row Log Outreach: the tab opens with a blank form.
    patientOutreachLogRequested: false,
    patientOutreachLogNonce: 0,
    requestPatientOutreachLog: () => set(s => ({ patientOutreachLogRequested: true, patientOutreachLogNonce: s.patientOutreachLogNonce + 1 })),
    clearPatientOutreachLogRequest: () => set({ patientOutreachLogRequested: false }),

    fetchPatientOutreach: async ({ patientKey, patientName }) => {
      if (!patientKey || get().patientOutreachStatus[patientKey]) return;
      set(s => ({ patientOutreachStatus: { ...s.patientOutreachStatus, [patientKey]: 'loading' } }));
      const fallback = () => PATIENT_OUTREACH_MOCK
        .filter(m => m.patientName === patientName)
        .map(m => ({ ...m, patientKey, program: 'RA' }));
      let entries;
      try {
        const { data, error } = await supabase
          .from('patient_outreach')
          .select('*')
          .eq('patient_key', patientKey)
          .order('logged_at', { ascending: false });
        if (error) throw error;
        entries = data?.length ? data.map(rowToPatientOutreach) : fallback();
      } catch (err) {
        console.warn('fetchPatientOutreach: falling back to local mock:', err?.message || err);
        entries = fallback();
      }
      set(s => ({
        // Entries saved this session before the load finished stay on top.
        patientOutreachByKey: {
          ...s.patientOutreachByKey,
          [patientKey]: [
            ...(s.patientOutreachByKey[patientKey] || []).filter(e => !entries.some(x => x.id === e.id)),
            ...entries,
          ],
        },
        patientOutreachStatus: { ...s.patientOutreachStatus, [patientKey]: 'ready' },
      }));
    },

    // Last Outreach Date / Outcome per patient for the worklist (Successful
    // and Unsuccessful only): by Member ID, and by name for the mock rows.
    patientOutreachLast: { byKey: {}, byName: {} },
    patientOutreachLastDidFetch: false,
    fetchPatientOutreachLast: async () => {
      if (get().patientOutreachLastDidFetch) return;
      set({ patientOutreachLastDidFetch: true });
      const byKey = {};
      const byName = {};
      const { data, error } = await supabase
        .from('patient_outreach')
        .select('patient_key, patient_name, logged_at, category, outcome')
        .in('category', ['Successful', 'Unsuccessful'])
        // The HCC worklist counts RA outreach only.
        .eq('program', 'RA')
        .order('logged_at', { ascending: false });
      if (!error && data?.length) {
        for (const r of data) {
          if (byKey[r.patient_key]) continue;
          byKey[r.patient_key] = { loggedAt: r.logged_at, category: r.category, outcome: r.outcome };
        }
      } else {
        const names = [...new Set(PATIENT_OUTREACH_MOCK.map(m => m.patientName))];
        for (const n of names) {
          const last = lastOutreachOf(PATIENT_OUTREACH_MOCK.filter(m => m.patientName === n));
          if (last) byName[n] = last;
        }
      }
      // Keep anything saved this session while the load ran: it is newer.
      set(s => ({
        patientOutreachLast: {
          byKey: { ...byKey, ...s.patientOutreachLast.byKey },
          byName: { ...byName, ...s.patientOutreachLast.byName },
        },
      }));
    },

    // Outcome list (outreach_outcomes, per tenant and program): the launch
    // list until the table loads. Deactivate, never delete.
    outreachOutcomes: LAUNCH_OUTCOMES,
    outreachOutcomesDidFetch: false,
    fetchOutreachOutcomes: async () => {
      if (get().outreachOutcomesDidFetch) return;
      set({ outreachOutcomesDidFetch: true });
      const { data, error } = await supabase
        .from('outreach_outcomes')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) { console.warn('fetchOutreachOutcomes: using the launch list:', error.message); return; }
      if (data?.length) set({ outreachOutcomes: data.map(rowToOutcome) });
    },
    addOutreachOutcome: ({ program = 'RA', category, label, recipients }) => {
      const outcome = { id: `oo-${Date.now()}`, program, category, label: label.trim(), recipients, active: true, sortOrder: get().outreachOutcomes.length + 1 };
      set(s => ({ outreachOutcomes: [...s.outreachOutcomes, outcome] }));
      supabase.from('outreach_outcomes').insert({
        id: outcome.id, program, category, label: outcome.label, recipients, active: true, sort_order: outcome.sortOrder,
      }).then(({ error }) => { if (error) reportPersistFailure('addOutreachOutcome', error); });
    },
    setOutreachOutcomeActive: (id, active) => {
      set(s => ({ outreachOutcomes: s.outreachOutcomes.map(o => (o.id === id ? { ...o, active } : o)) }));
      // upsert: a launch-list row may not be in the table yet.
      const o = get().outreachOutcomes.find(x => x.id === id);
      supabase.from('outreach_outcomes').upsert({
        id, program: o.program || 'RA', category: o.category, label: o.label, recipients: o.recipients, active, sort_order: o.sortOrder ?? 0,
      }, { onConflict: 'id' }).then(({ error }) => { if (error) reportPersistFailure('setOutreachOutcomeActive', error); });
    },

    // The AI summary arrives after the save: set it on the entry, and store
    // each mentioned record in outreach_record_links.
    setPatientOutreachAi: (patientKey, id, ai) => {
      set(s => ({
        patientOutreachByKey: {
          ...s.patientOutreachByKey,
          [patientKey]: (s.patientOutreachByKey[patientKey] || []).map(e => (e.id === id ? { ...e, ...ai } : e)),
        },
      }));
      supabase.from('patient_outreach').update({
        ai_status: ai.aiStatus, ai_call_summary: ai.aiCallSummary ?? null, ai_patient_actions: ai.aiPatientActions ?? null,
      }).eq('id', id).then(({ error }) => { if (error) reportPersistFailure('setPatientOutreachAi', error); });
      const links = (ai.aiPatientActions || []).flatMap(a => a.refs.map(r => ({
        outreach_id: id, record_type: r.type, record_id: r.id, matched: !!r.matched,
      })));
      if (links.length) {
        supabase.from('outreach_record_links').insert(links)
          .then(({ error }) => { if (error) console.warn('outreach_record_links:', error.message); });
      }
    },

    // PCP Outreach: the parent record (with any Unresolved content) and one
    // locked entry per patient, each pointing to the parent. A patient's
    // entry carries only that patient's part.
    savePcpOutreach: (parent, entries) => {
      set(s => {
        const byKey = { ...s.patientOutreachByKey };
        const lastByKey = { ...s.patientOutreachLast.byKey };
        for (const e of entries) {
          byKey[e.patientKey] = [e, ...(byKey[e.patientKey] || [])];
          if (isCounted(e)) lastByKey[e.patientKey] = { loggedAt: e.loggedAt, category: e.category, outcome: e.outcome };
        }
        return { patientOutreachByKey: byKey, patientOutreachLast: { ...s.patientOutreachLast, byKey: lastByKey } };
      });
      supabase.from('pcp_outreach').insert({
        id: parent.id,
        pcp_name: parent.pcpName,
        mode: parent.mode,
        direction: parent.direction ?? null,
        call_via: parent.callVia ?? null,
        called_to: parent.calledTo ?? null,
        duration_sec: parent.durationSec ?? null,
        transcript: parent.transcript || null,
        email_to: parent.emailTo || null,
        email_subject: parent.emailSubject || null,
        email_body: parent.emailBody || null,
        notes: parent.notes || '',
        category: parent.category,
        outcome: parent.outcome ?? null,
        unresolved: parent.unresolved || [],
        logged_by: parent.loggedBy || '',
        logged_by_role: parent.loggedByRole ?? null,
        logged_at: parent.loggedAt,
      }).then(({ error }) => {
        if (error) { reportPersistFailure('savePcpOutreach', error); return; }
        supabase.from('patient_outreach').insert(entries.map(patientOutreachToRow))
          .then(({ error: e2 }) => { if (e2) reportPersistFailure('savePcpOutreach', e2); });
      });
    },

    addPatientOutreach: (entry) => {
      if (!entry?.patientKey) return;
      set(s => ({
        patientOutreachByKey: {
          ...s.patientOutreachByKey,
          [entry.patientKey]: [entry, ...(s.patientOutreachByKey[entry.patientKey] || [])],
        },
        // An RA contact attempt becomes the patient's Last Outreach on every HCC row.
        ...(isCounted(entry) && (entry.program || 'RA') === 'RA' ? {
          patientOutreachLast: {
            ...s.patientOutreachLast,
            byKey: { ...s.patientOutreachLast.byKey, [entry.patientKey]: { loggedAt: entry.loggedAt, category: entry.category, outcome: entry.outcome } },
          },
        } : {}),
      }));
      supabase.from('patient_outreach').insert(patientOutreachToRow(entry))
        .then(({ error }) => { if (error) reportPersistFailure('addPatientOutreach', error); });
    },
  };
}
