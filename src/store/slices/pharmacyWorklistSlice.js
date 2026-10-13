import { supabase } from '../../lib/supabase';
import { applyPendingPickup, applyPickup } from '../../features/pharmacy-worklist/fillEvents';
import { enrichPharmacyMember, parseMdy } from '../../features/pharmacy-worklist/pharmacyWorklist.utils';

function rowToMember(r) {
  return {
    id: r.id,
    initials: r.initials,
    name: r.name,
    gender: r.gender,
    age: r.age,
    dob: r.dob,
    memberId: r.member_id,
    language: r.language,
    healthPlan: r.health_plan,
    ipa: r.ipa,
    bookOfBusiness: r.book_of_business,
    status: r.status,
    statusManual: !!r.status_manual,
    assigneeId: r.assignee_id,
    assigneeName: r.assignee_name,
    assigneeInitials: r.assignee_initials,
    leadNote: r.lead_note,
    followUpDue: r.follow_up_due,
    barrier: r.barrier,
    daysInQueue: r.days_in_queue,
    prescriber: r.prescriber,
    pharmacy: r.pharmacy,
    phones: r.phones || [],
    callHistory: r.call_history || [],
    interventionLog: r.intervention_log || [],
    activityLog: r.activity_log || [],
    measures: r.measures || [],
    patientId: r.patient_id,
  };
}

const COLUMN_TO_FIELD = {
  status: 'status', status_manual: 'statusManual', assignee_id: 'assigneeId', assignee_name: 'assigneeName', assignee_initials: 'assigneeInitials',
  measures: 'measures', call_history: 'callHistory', intervention_log: 'interventionLog', barrier: 'barrier',
};

const MED_FIELD_LABEL = {
  status: 'Status', sig: 'SIG', conditions: 'Conditions', nonAdherenceReason: 'Reason for non-adherence',
  notesToMd: 'Notes to MD', internalNotes: 'Internal notes',
};

async function persist(id, patch) {
  const { error } = await supabase.from('pharmacy_worklist_members').update(patch).eq('id', id);
  if (error) console.warn('[store] pharmacy_worklist_members update failed:', error.message);
}

// A profile can be opened by worklist row id, member id, or linked patient id.
export function findPharmacyMember(members, patientId) {
  if (!patientId) return null;
  const pid = String(patientId);
  return (members || []).find(m => m.id === pid || String(m.memberId) === pid || m.patientId === pid) || null;
}

/** Pharmacy (Med Adherence) worklist — one row per member. Backed by pharmacy_worklist_members. */
export function createPharmacyWorklistSlice(set, get) {
  // Apply `fn` to one member, append an activity-log entry, and persist the
  // listed columns (activity_log always). `fn` may return `_changes` (fill
  // updates it made); `activity` may be a function of those changes.
  const update = (memberRowId, fn, columns, activity) => {
    let next = null;
    set(s => ({
      pharmacyWorklistMembers: s.pharmacyWorklistMembers.map(m => {
        if (m.id !== memberRowId) return m;
        const { _changes, ...changed } = fn(m);
        const a = typeof activity === 'function' ? activity(_changes || []) : activity;
        next = {
          ...changed,
          activityLog: [{ at: new Date().toISOString(), actor: get().currentUserProfile?.name || 'You', ...a }, ...(m.activityLog || [])],
        };
        return next;
      }),
    }));
    if (!next) return;
    const patch = { activity_log: next.activityLog };
    for (const col of columns) patch[col] = next[COLUMN_TO_FIELD[col]];
    persist(memberRowId, patch);
  };

  return {
    pharmacyWorklistMembers: [],
    pharmacyWorklistLoading: false,
    pharmacyWorklistDidFetch: false,
    fetchPharmacyWorklistMembers: async () => {
      if (get().pharmacyWorklistDidFetch) return;
      set({ pharmacyWorklistDidFetch: true, pharmacyWorklistLoading: true });

      const { data, error } = await supabase
        .from('pharmacy_worklist_members')
        .select('*')
        .order('id', { ascending: true });

      if (error || !data?.length) {
        // A retry after a failed fetch must not reseed the mock over rows the
        // user has already edited this session (status, assignee, outreach).
        if (get().pharmacyWorklistMembers.length) {
          set({ pharmacyWorklistLoading: false, ...(error ? { pharmacyWorklistDidFetch: false } : {}) });
          return;
        }
        console.warn('fetchPharmacyWorklistMembers error or empty — falling back to local mock:', error?.message);
        const { PHARMACY_WORKLIST_MEMBERS } = await import('../../features/pharmacy-worklist/data/mock');
        set({
          pharmacyWorklistMembers: PHARMACY_WORKLIST_MEMBERS,
          pharmacyWorklistLoading: false,
          ...(error ? { pharmacyWorklistDidFetch: false } : {}),
        });
        return;
      }
      set({ pharmacyWorklistMembers: data.map(rowToMember), pharmacyWorklistLoading: false });
    },

    setPharmacyStatus: (id, status) => {
      const row = get().pharmacyWorklistMembers.find(m => m.id === id);
      const prev = row ? enrichPharmacyMember(row).status : null;
      if (prev === status) return;
      // A hand-picked status overrides the roll-up from the measures.
      update(id, m => ({ ...m, status, statusManual: true }), ['status', 'status_manual'], { t: 'status_change', title: 'Status changed', from: prev, to: status });
    },

    // Accepts AssigneeChange's { id, name, initials } shape; null unassigns.
    setPharmacyAssignee: (id, user) => {
      const prev = get().pharmacyWorklistMembers.find(m => m.id === id)?.assigneeName || 'Unassigned';
      update(id, m => ({
        ...m,
        assigneeId: user?.id || null,
        assigneeName: user?.name || null,
        assigneeInitials: user?.initials || null,
      }), ['assignee_id', 'assignee_name', 'assignee_initials'], {
        t: 'assignee_change', title: 'Assignee changed', note: `${prev} → ${user?.name || 'Unassigned'}`,
      });
    },

    // Medication Review edits (status, SIG, condition, non-adherence reason,
    // notes) live on the medication inside the member's measures jsonb.
    updatePharmacyMedication: (memberRowId, medId, patch) => {
      const med = get().pharmacyWorklistMembers.find(m => m.id === memberRowId)
        ?.measures.flatMap(x => x.medications).find(d => d.id === medId);
      update(memberRowId, m => ({
        ...m,
        measures: m.measures.map(x => ({
          ...x,
          medications: x.medications.map(d => (d.id === medId ? { ...d, ...patch } : d)),
        })),
      }), ['measures'], {
        t: 'note', title: `Medication updated · ${med?.name || ''}`,
        note: Object.entries(patch).map(([k, v]) => `${MED_FIELD_LABEL[k] || k}: ${Array.isArray(v) ? v.join(', ') : (v || '—')}`).join(' · '),
      });
    },

    // Outreach logged from the program's Outreach step — one call-history row
    // per outreach. Pickup outcomes ripple into the record: the measure turns
    // pickup-confirmed and each medication's fill dates move (applyPickup);
    // "Pending — Pick up" marks the measure pending pickup.
    logPharmacyOutreach: (memberRowId, entry, { pickupCodes = [], pendingCodes = [] } = {}) => {
      update(memberRowId, m => {
        let measures = m.measures;
        let changes = [];
        if (pickupCodes.length) ({ measures, changes } = applyPickup({ ...m, measures }, pickupCodes, entry.date, 'Pickup confirmed by call'));
        if (pendingCodes.length) measures = applyPendingPickup({ ...m, measures }, pendingCodes, entry.date);
        // Same rule as a verification call: every open measure picked up →
        // Completed; any outreach on an Open gap moves it to In Progress.
        const allPickedUp = pickupCodes.length > 0 && measures
          .filter(x => !x.excluded)
          .every(x => x.pickupConfirmed && !(x.pendingPickupSince && parseMdy(x.pendingPickupSince) > parseMdy(x.pickupConfirmed)));
        const status = allPickedUp ? 'Completed' : (m.status === 'Open' ? 'In Progress' : m.status);
        if (status !== m.status) changes.push(`Status ${m.status} → ${status}`);
        return { ...m, status, measures, callHistory: [entry, ...(m.callHistory || [])], _changes: changes };
      }, ['status', 'call_history', 'measures'], (changes) => ({
        t: 'outreach', title: `Outreach · ${entry.contact} (${(entry.measures || []).join(', ')})`,
        outcome: entry.outcome, outcomeColor: entry.result === 'failed' ? 'var(--status-error)' : 'var(--status-success)',
        note: [entry.note, ...changes].filter(Boolean).join('\n'),
      }));
    },

    // Pharmacy verification call, locked: one call-history entry for every
    // medication and measure covered by the call (one locked action = one
    // outreach in the KPI report). Pickups run the same fill update as an
    // Outreach pickup; fills left on the shelf mark the measure pending.
    lockPharmacyVerification: (memberRowId, entry, { pickedUpCodes, pendingCodes, refillsByMed, status }) => {
      const prevStatus = get().pharmacyWorklistMembers.find(m => m.id === memberRowId)?.status;
      update(memberRowId, m => {
        let measures = m.measures;
        let changes = [];
        if (pickedUpCodes.length) ({ measures, changes } = applyPickup({ ...m, measures }, pickedUpCodes, entry.date, 'Pickup confirmed by pharmacy'));
        if (pendingCodes.length) measures = applyPendingPickup({ ...m, measures }, pendingCodes, entry.date);
        measures = measures.map(x => ({
          ...x,
          medications: x.medications.map(d => (refillsByMed[d.id] == null ? d : { ...d, refillsRemaining: refillsByMed[d.id] })),
        }));
        return { ...m, status: status || m.status, measures, callHistory: [entry, ...(m.callHistory || [])], _changes: changes };
      }, ['status', 'call_history', 'measures'], (changes) => ({
        t: 'call', title: `Pharmacy verification · ${entry.contact} (locked)`,
        outcome: entry.outcome, outcomeColor: entry.result === 'failed' ? 'var(--status-warning)' : 'var(--status-success)',
        note: [entry.note, ...changes, status && status !== prevStatus ? `Status ${prevStatus} → ${status}` : null].filter(Boolean).join('\n'),
      }));
    },

    // Barrier & Intervention log: one entry per call, recorded per measure
    // (barriers, interventions and result kept apart). The newest barrier
    // feeds the worklist's Barrier column.
    logPharmacyInterventions: (memberRowId, entry) => {
      update(memberRowId, m => {
        const firstBarrier = Object.values(entry.measures).flatMap(r => r.barriers)[0];
        // A measure's barrier is also each of its active medications' Reason
        // for Non-Adherence (Medication Review).
        const measures = m.measures.map(x => {
          const barrier = entry.measures[x.code]?.barriers?.[0];
          if (!barrier) return x;
          return {
            ...x,
            medications: x.medications.map(d => (d.status === 'Discontinued' ? d : { ...d, nonAdherenceReason: barrier })),
          };
        });
        return { ...m, measures, interventionLog: [entry, ...(m.interventionLog || [])], barrier: firstBarrier || m.barrier };
      }, ['intervention_log', 'barrier', 'measures'], {
        t: 'note', title: `Barriers & interventions (${Object.keys(entry.measures).join(', ')})`,
        note: Object.entries(entry.measures)
          .map(([code, r]) => `${code}: ${[...r.barriers, ...r.interventions, r.result].filter(Boolean).join(', ')}`)
          .join('\n'),
      });
    },

    pharmacyFilters: {},
    setPharmacyFilter: (k, vals) => set(s => {
      const next = { ...s.pharmacyFilters };
      if (!vals?.length) delete next[k];
      else next[k] = vals;
      return { pharmacyFilters: next };
    }),
    clearPharmacyFilters: () => set({ pharmacyFilters: {} }),
  };
}
