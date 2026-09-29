import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

/** Everyone's Out of Office records, loaded once; `loading` until they are. */
export function useOooRecords() {
  const records = useAppStore(s => s.oooRecords);
  const fetched = useAppStore(s => s.oooRecordsFetched);
  const fetchOooRecords = useAppStore(s => s.fetchOooRecords);
  useEffect(() => { fetchOooRecords(); }, [fetchOooRecords]);
  return { records, loading: !fetched };
}
