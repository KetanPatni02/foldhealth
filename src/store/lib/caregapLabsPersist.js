import { supabase } from '../../lib/supabase';
import { reportPersistFailure } from './reportPersistFailure';

// Supabase I/O for supabase/caregap_lab_orders_migration.sql.

const MISSING_RE = /caregap_lab|does not exist|schema cache/i;

export const labOrderFromRow = (r) => ({
  id: r.id,
  memberId: r.hedis_member_id,
  gapCode: r.gap_code,
  measurementYear: r.measurement_year,
  tests: Array.isArray(r.tests) ? r.tests : [],
  testName: (Array.isArray(r.tests) ? r.tests : []).join(', '),
  diagnoses: Array.isArray(r.diagnoses) ? r.diagnoses : [],
  priority: r.priority || 'Routine',
  performingLab: r.performing_lab || '',
  orderingProvider: r.ordering_provider || '',
  status: r.status,
  orderedAt: r.ordered_at,
  collectedAt: r.collected_at,
  cancelledAt: r.cancelled_at,
  cancelReason: r.cancel_reason || '',
  createdBy: r.created_by || '',
});
const labOrderToRow = (o) => ({
  id: o.id,
  hedis_member_id: o.memberId,
  gap_code: o.gapCode,
  measurement_year: o.measurementYear ?? null,
  tests: o.tests || [],
  diagnoses: o.diagnoses || [],
  priority: o.priority || 'Routine',
  performing_lab: o.performingLab || null,
  ordering_provider: o.orderingProvider || null,
  status: o.status,
  ordered_at: o.orderedAt,
  collected_at: o.collectedAt || null,
  cancelled_at: o.cancelledAt || null,
  cancel_reason: o.cancelReason || null,
  created_by: o.createdBy || null,
});

export const labResultFromRow = (r) => ({
  id: r.id,
  labOrderId: r.lab_order_id || null,
  memberId: r.hedis_member_id,
  gapCode: r.gap_code,
  testName: r.test_name,
  value: r.value,
  unit: r.unit || '',
  referenceRange: r.reference_range || '',
  flag: r.flag || '',
  note: r.note || '',
  collectedAt: r.collected_at,
  resultedAt: r.resulted_at,
  source: r.source || '',
  evidenceStatus: r.evidence_status || '',
  reviewedBy: r.reviewed_by || null,
  reviewedAt: r.reviewed_at || null,
});
const labResultToRow = (r) => ({
  id: r.id,
  lab_order_id: r.labOrderId || null,
  hedis_member_id: r.memberId,
  gap_code: r.gapCode,
  test_name: r.testName,
  value: r.value ?? null,
  unit: r.unit || null,
  reference_range: r.referenceRange || null,
  flag: r.flag || null,
  note: r.note || null,
  collected_at: r.collectedAt || null,
  resulted_at: r.resultedAt || null,
  source: r.source || null,
  evidence_status: r.evidenceStatus || null,
  reviewed_by: r.reviewedBy || null,
  reviewed_at: r.reviewedAt || null,
});

/** @returns {Promise<{ orders: object[], results: object[], missing: boolean }>} */
export async function fetchCaregapLabRows() {
  const [o, r] = await Promise.all([
    supabase.from('caregap_lab_orders').select('*').order('ordered_at', { ascending: false }),
    supabase.from('caregap_lab_results').select('*').order('resulted_at', { ascending: false }),
  ]);
  const err = o.error || r.error;
  if (err) {
    const missing = MISSING_RE.test(err.message || '');
    if (!missing) console.warn('fetchCaregapLabs failed:', err.message);
    return { orders: [], results: [], missing };
  }
  return { orders: (o.data || []).map(labOrderFromRow), results: (r.data || []).map(labResultFromRow), missing: false };
}

const upsert = async (table, row, label) => {
  const { error } = await supabase.from(table).upsert(row, { onConflict: 'id' });
  if (!error) return { missing: false };
  if (MISSING_RE.test(error.message || '')) return { missing: true };
  reportPersistFailure(label, error);
  return { missing: false };
};

export const persistLabOrder = (o) => upsert('caregap_lab_orders', { ...labOrderToRow(o), updated_at: new Date().toISOString() }, `persistLabOrder(${o.id})`);
export const persistLabResult = (r) => upsert('caregap_lab_results', labResultToRow(r), `persistLabResult(${r.id})`);
