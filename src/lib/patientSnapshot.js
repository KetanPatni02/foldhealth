// Patient snapshot shown in the PatientHoverCard (Figma Q3 Sprint 3,
// 853:3077). Rows live in `patient_snapshots` (supabase/
// patient_snapshots_migration.sql). `buildPatientSnapshot` produces the same
// deterministic values the seed writes, so the card looks identical before
// and after the migration runs.

const HIE = ['ER Visit', 'Inpatient Admission', 'Urgent Care Visit', 'Observation Stay'];
const CONDITIONS = ['Hypertension', 'Diabetes', 'CHF', 'COPD', 'CKD Stage 3', 'Hyperlipidemia', 'Depression'];
const PROGRAMS = ['CCM', 'ECM', 'RPM', 'TCM', 'BHI'];
const EHRS = ['Athena', 'Epic', 'eCW'];
const CLINICIANS = ['Jane Doe, MD', 'Rahul Mehta, MD', 'Emily Carter, DO', 'Omar Haddad, NP'];
const SOURCES = ['Assessments', 'Claims', 'EHR Problem List', 'HIE'];

// CMS-HCC (V24) community coefficients for the conditions the snapshot can
// carry. Hypertension and hyperlipidemia don't map to an HCC.
const HCC_BY_CONDITION = {
  Diabetes: { label: 'Diabetes w/ complications', hcc: 18, weight: 0.3, icd: 'E11.65', icdText: 'Type 2 diabetes mellitus with hyperglycemia' },
  CHF: { label: 'Heart failure', hcc: 85, weight: 0.33, icd: 'I50.22', icdText: 'Chronic systolic (congestive) heart failure' },
  COPD: { label: 'COPD', hcc: 111, weight: 0.34, icd: 'J44.9', icdText: 'Chronic obstructive pulmonary disease, unspecified' },
  'CKD Stage 3': { label: 'CKD stage 3', hcc: 138, weight: 0.07, icd: 'N18.30', icdText: 'Chronic kidney disease, stage 3 unspecified' },
  Depression: { label: 'Major depression', hcc: 59, weight: 0.31, icd: 'F33.1', icdText: 'Major depressive disorder, recurrent, moderate' },
};
const INTERACTIONS = [
  { needs: ['Diabetes', 'CHF'], label: 'Diabetes + CHF', weight: 0.12 },
  { needs: ['CHF', 'COPD'], label: 'CHF + COPD', weight: 0.16 },
];
// Demographic factor by age band; female members score slightly lower.
const demographicWeight = (age, female) => {
  const base = age >= 85 ? 0.62 : age >= 80 ? 0.53 : age >= 75 ? 0.45 : age >= 70 ? 0.37 : age >= 65 ? 0.3 : 0.25;
  return Number((female ? base - 0.03 : base).toFixed(2));
};

// Small stable hash so a member always gets the same snapshot.
function seedOf(key) {
  let h = 2166136261;
  for (const ch of String(key)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}
const pad = (n) => String(n).padStart(2, '0');

// One snapshot per patient, keyed by Fold member id so the same patient shows
// the same card on every worklist (row ids differ per worklist).
export const patientSnapshotKey = (p) => String(p?.memberId || p?.id || p?.name || '');

export function buildPatientSnapshot(member) {
  const key = patientSnapshotKey(member);
  const r = seedOf(key || 'x');
  const pick = (list) => list[Math.floor(r() * list.length)];
  const hieCount = Math.floor(r() * 3);
  const hieEvents = Array.from({ length: hieCount }, () => {
    const d = new Date(2026, Math.floor(r() * 8), 1 + Math.floor(r() * 27));
    return { label: pick(HIE), date: `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()}` };
  });
  const condCount = 1 + Math.floor(r() * 3);
  const chronicConditions = [...new Set(Array.from({ length: condCount }, () => pick(CONDITIONS)))].map(name => {
    const months = 3 + Math.floor(r() * 60);
    return { name, duration: months >= 12 ? `${Math.floor(months / 12)}y${months % 12 ? ` ${months % 12}m` : ''}` : `${months}m` };
  });
  const age = parseInt(member?.age, 10) || 65;
  const female = /^f/i.test(member?.gender || member?.g || '');
  const recorded = () => {
    const d = new Date(2025, Math.floor(r() * 12), 1 + Math.floor(r() * 27));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const condNames = chronicConditions.map(c => c.name);
  const rafBreakdown = {
    hccs: condNames.filter(n => HCC_BY_CONDITION[n]).map(n => {
      const h = HCC_BY_CONDITION[n];
      return {
        label: `${h.label} (HCC ${h.hcc})`, weight: h.weight, icd: h.icd, icdText: h.icdText,
        recordedOn: recorded(), recordedBy: pick(CLINICIANS), source: pick(SOURCES),
        note: `Condition documented and assessed during the most recent visit.`,
      };
    }),
    demographics: [
      { label: `${female ? 'Female' : 'Male'}, age ${age}`, weight: demographicWeight(age, female) },
      ...(r() < 0.35 ? [{ label: 'Medicaid eligibility', weight: 0.2 }] : []),
    ],
    interactions: INTERACTIONS.filter(i => i.needs.every(n => condNames.includes(n))).map(({ label, weight }) => ({ label, weight })),
  };
  const rafScore = Number([...rafBreakdown.hccs, ...rafBreakdown.demographics, ...rafBreakdown.interactions]
    .reduce((sum, x) => sum + x.weight, 0).toFixed(2));
  const awvRoll = r();
  const awvDate = new Date(2026, 9 + Math.floor(r() * 3), 1 + Math.floor(r() * 27));
  return {
    patientId: key,
    ehrName: pick(EHRS),
    ehrId: String(10000 + Math.floor(r() * 89999)),
    foldScore: 10 + Math.floor(r() * 80),
    rafScore,
    rafBreakdown,
    rafDelta: Number(((r() - 0.3) * 0.8).toFixed(2)),
    goalProgress: 20 + Math.floor(r() * 80),
    hieEvents,
    awvStatus: awvRoll < 0.4 ? 'Not Scheduled' : awvRoll < 0.75 ? 'Scheduled' : 'Completed',
    awvDate: awvRoll < 0.4 ? null : `${pad(awvDate.getMonth() + 1)}-${pad(awvDate.getDate())}-${awvDate.getFullYear()}`,
    chronicConditions,
    programEligibility: [...new Set([pick(PROGRAMS), pick(PROGRAMS)])],
    lastEngagedDays: Math.floor(r() * 120),
    activeMedications: Math.floor(r() * 12),
    taskAdherence: 30 + Math.floor(r() * 70),
    alertsHigh: Math.floor(r() * 3),
    alertsMedium: Math.floor(r() * 3),
  };
}

export const snapshotToRow = (s) => ({
  patient_id: s.patientId,
  ehr_name: s.ehrName,
  ehr_id: s.ehrId,
  fold_score: s.foldScore,
  raf_score: s.rafScore,
  raf_delta: s.rafDelta,
  raf_breakdown: s.rafBreakdown,
  goal_progress: s.goalProgress,
  hie_events: s.hieEvents,
  awv_status: s.awvStatus,
  awv_date: s.awvDate,
  chronic_conditions: s.chronicConditions,
  program_eligibility: s.programEligibility,
  last_engaged_days: s.lastEngagedDays,
  active_medications: s.activeMedications,
  task_adherence: s.taskAdherence,
  alerts_high: s.alertsHigh,
  alerts_medium: s.alertsMedium,
});

export const snapshotFromRow = (r) => ({
  patientId: r.patient_id,
  ehrName: r.ehr_name || '',
  ehrId: r.ehr_id || '',
  foldScore: r.fold_score,
  rafScore: r.raf_score == null ? null : Number(r.raf_score),
  rafDelta: r.raf_delta == null ? null : Number(r.raf_delta),
  rafBreakdown: r.raf_breakdown || { hccs: [], demographics: [], interactions: [] },
  goalProgress: r.goal_progress,
  hieEvents: Array.isArray(r.hie_events) ? r.hie_events : [],
  awvStatus: r.awv_status || 'Not Scheduled',
  awvDate: r.awv_date || null,
  chronicConditions: Array.isArray(r.chronic_conditions) ? r.chronic_conditions : [],
  programEligibility: Array.isArray(r.program_eligibility) ? r.program_eligibility : [],
  lastEngagedDays: r.last_engaged_days,
  activeMedications: r.active_medications,
  taskAdherence: r.task_adherence,
  alertsHigh: r.alerts_high || 0,
  alertsMedium: r.alerts_medium || 0,
});
