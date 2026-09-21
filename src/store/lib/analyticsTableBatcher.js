import { supabase } from '../../lib/supabase';

// Coalesce same-tick analytics_tables lookups into ONE request. Views fire
// up to a dozen fetchViewTable calls on mount (FinancialView alone has 12);
// one GET per table_key tripped Sentry's N+1-API-call detector (FOLDHEALTH-2).
const _analyticsTableBatches = new Map();

export function fetchAnalyticsTableBatched(tenant, period, tableKey) {
  const batchId = `${tenant}|${period}`;
  let batch = _analyticsTableBatches.get(batchId);
  if (!batch) {
    batch = { keys: new Set() };
    batch.promise = new Promise((resolve, reject) => {
      setTimeout(() => {
        _analyticsTableBatches.delete(batchId);
        supabase
          .from('analytics_tables').select('*')
          .eq('tenant_id', tenant).eq('period', period)
          .in('table_key', [...batch.keys])
          .then(({ data, error }) => {
            if (error) return reject(new Error(error.message));
            resolve(new Map((data || []).map(r => [r.table_key, r])));
          });
      }, 10);
    });
    _analyticsTableBatches.set(batchId, batch);
  }
  batch.keys.add(tableKey);
  return batch.promise.then(rowsByKey => rowsByKey.get(tableKey) || null);
}
