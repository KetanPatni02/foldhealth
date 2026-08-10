import { TableSkeleton } from '../../components/TableSkeleton/TableSkeleton';
import { useHccWorklistTable } from './useHccWorklistTable';
import { HccWorklistTableView } from './HccWorklistTableView';

export function HccWorklistTable() {
  const table = useHccWorklistTable();
  if (table.hccMembersLoading) return <TableSkeleton rows={table.perPage} />;
  return <HccWorklistTableView {...table} />;
}
