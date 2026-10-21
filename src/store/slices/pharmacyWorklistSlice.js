import { supabase } from '../../lib/supabase';
import { applyPendingPickup, applyPickup } from '../../features/pharmacy-worklist/fillEvents';
import { CLAIM_LAG_DAYS, enrichPharmacyMember, parseMdy, reconcileMeasure, todayMdy } from '../../features/pharmacy-worklist/pharmacyWorklist.utils';

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
    sourcePriority: r.source_priority ?? null,
    otherCareGaps: r.other_care_gaps || [],
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
  // Keys already tried this session (in flight, or failed), so a re-render
  // can't start a second create or retry a failing insert on every update.
  const claimTasksTried = new Set();
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
          // A null activity records the change without a log entry.
          activityLog: a ? [{ at: new Date().toISOString(), actor: get().currentUserProfile?.name || 'You', ...a }, ...(m.activityLog || [])] : (m.activityLog || []),
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
    pharmacyWorklistError: null,
    // True while the rows are the local dev mock, not Supabase data.
    pharmacyWorklistIsMock: false,
    pharmacyWorklistDidFetch: false,
    fetchPharmacyWorklistMembers: async () => {
      if (get().pharmacyWorklistDidFetch) return;
      set({ pharmacyWorklistDidFetch: true, pharmacyWorklistLoading: true, pharmacyWorklistError: null });

      const { data, error } = await supabase
        .from('pharmacy_worklist_members')
        .select('*')
        .order('id', { ascending: true });

      // A failed fetch is shown as an error with Retry, never papered over
      // with mock patients: staff must not act on rows that are not real.
      // Rows already loaded this session are kept as they are.
      if (error) {
        console.warn('fetchPharmacyWorklistMembers failed:', error.message);
        set({ pharmacyWorklistLoading: false, pharmacyWorklistDidFetch: false, pharmacyWorklistError: error.message });
        return;
      }
      // The local mock only stands in for an empty table during development.
      if (!data?.length) {
        if (import.meta.env.DEV && !get().pharmacyWorklistMembers.length) {
          const { PHARMACY_WORKLIST_MEMBERS } = await import('../../features/pharmacy-worklist/data/mock');
          set({ pharmacyWorklistMembers: PHARMACY_WORKLIST_MEMBERS, pharmacyWorklistLoading: false, pharmacyWorklistIsMock: true });
          return;
        }
        set({ pharmacyWorklistLoading: false });
        return;
      }
      set({ pharmacyWorklistMembers: data.map(rowToMember), pharmacyWorklistLoading: false, pharmacyWorklistIsMock: false });
    },

    // Click-to-dial on a prescriber or pharmacy number (Snapshot).
    logPharmacyDial: (id, who, number) => {
      update(id, m => m, [], { t: 'call', title: `Dialed ${who}`, note: number });
    },

    // Per-gap status. A hand-picked status overrides the one derived from
    // fills and claims; null hands it back to the data.
    setPharmacyGapStatus: (id, code, status) => {
      const row = get().pharmacyWorklistMembers.find(m => m.id === id);
      const prev = row && enrichPharmacyMember(row).measureStatuses[code]?.gap;
      const to = status ?? (row && enrichPharmacyMember({
        ...row, measures: row.measures.map(x => (x.code === code ? { ...x, statusManual: false } : x)),
      }).measureStatuses[code]?.gap);
      update(id, m => ({
        ...m,
        measures: m.measures.map(x => (x.code !== code ? x
          : status ? { ...x, status, statusManual: true } : { ...x, statusManual: false })),
      }), ['measures'], {
        t: 'status_change', title: status ? `${code} status changed` : `${code} status set from data`, from: prev, to,
      });
    },

    // A confirmed pickup with no claim past the claim lag needs a call to the
    // pharmacy. Create that follow-up task once per pickup; the marker on the
    // measure keeps it from being created again.
    // Runs when the worklist loads, in each viewer's browser; the tasks
    // table's unique source_key keeps it to one task per pickup. Never for
    // mock rows: those patients don't exist, but the tasks would.
    ensureClaimFollowUpTasks: async () => {
      if (get().pharmacyWorklistIsMock) return;
      for (const row of get().pharmacyWorklistMembers) {
        for (const x of row.measures || []) {
          if (reconcileMeasure(x)?.status !== 'Claim overdue') continue;
          const key = `pharm-claim-overdue-${row.id}-${x.code}-${x.pickupConfirmed}`;
          if (x.claimFollowUpTask?.key === key || claimTasksTried.has(key)) continue;
          claimTasksTried.add(key);
          // Another viewer may have created it already; reuse theirs instead
          // of racing the unique index.
          const { data: existing } = await supabase.from('tasks').select('id').eq('source_key', key).maybeSingle();
          const created = existing || await get().createTask({
            name: `Follow up with pharmacy: ${x.code} claim overdue`,
            status: 'pending', priority: 'high', due_date: todayMdy(),
            assigned_to: row.assigneeName || null, assigned_to_id: row.assigneeId || null, member: row.name,
            labels: [], meta: '', pool: null, mentions: [], attachments: 0, comments: 0,
            description: `Pickup confirmed ${x.pickupConfirmed}, no paid claim after ${CLAIM_LAG_DAYS} days. Call ${row.pharmacy?.name || 'the pharmacy'}${row.pharmacy?.phone ? ` at ${row.pharmacy.phone}` : ''} to confirm the claim was submitted.`,
            is_subtask: false, parent_task: null, parent_task_id: null,
            program_code: 'PHARM', patient_id: String(row.patientId || row.id), source_key: key,
          }, { auditUserName: 'Fold Automation' });
          if (!created) continue;
          update(row.id, m => ({
            ...m,
            measures: m.measures.map(y => (y.code === x.code ? { ...y, claimFollowUpTask: { key, taskId: created.id, createdAt: new Date().toISOString() } } : y)),
          }), ['measures'], existing ? null : { t: 'system', title: `Pharmacy follow-up task created (${x.code})`, note: 'Claim overdue after a confirmed pickup' });
        }
      }
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

    // The gap a user opened from the worklist; the program's Medication
    // Review puts it first. { memberId, code }
    pharmacyFocusGap: null,

    // Pharmacy Gap Details drawer (worklist): which member and gap it shows.
    pharmacyGapDrawer: null,
    openPharmacyGapDrawer: (memberId, code) => set({
      pharmacyGapDrawer: { memberId, code },
      pharmacyFocusGap: { memberId, code },
    }),
    closePharmacyGapDrawer: () => set({ pharmacyGapDrawer: null }),

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
