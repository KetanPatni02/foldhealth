import { Icon } from '../../components/Icon/Icon';
import { Pagination } from '../../components/Pagination/Pagination';
import { TableSkeleton } from '../../components/TableSkeleton/TableSkeleton';
import { ApcmBillingRow } from './ApcmBillingRow';
import { AttestationModal } from './AttestationModal';
import { ApcmBillingFilterBar } from './ApcmBillingFilterBar';
import { ApcmBillingBulkBar } from './ApcmBillingBulkBar';
import { ApcmBillingTableHead } from './ApcmBillingTableHead';
import { useApcmBillingTable } from './useApcmBillingTable';
import styles from './ApcmBillingTable.module.css';

export function ApcmBillingTable({ searchQuery = '', filtersOpen = false }) {
  const table = useApcmBillingTable(searchQuery);

  return (
    <>
      <div className={styles.wrap}>
        {filtersOpen && (
          <ApcmBillingFilterBar
            icdFilter={table.icdFilter}
            icdOptions={table.icdOptions}
            providerFilter={table.providerFilter}
            anyFilterActive={table.anyFilterActive}
            bulkTarget={table.bulkTarget}
            onIcdFilterSet={v => { table.setIcdFilter(v); table.resetPage(); }}
            onIcdFilterClear={() => { table.setIcdFilter(''); table.resetPage(); }}
            onProviderFilterSet={v => { table.setProviderFilter(v); table.resetPage(); }}
            onProviderFilterClear={() => { table.setProviderFilter(''); table.resetPage(); }}
            onClearAll={() => { table.setIcdFilter(''); table.setProviderFilter(''); table.resetPage(); }}
            onBulkMarkChronic={table.handleBulkMarkChronic}
          />
        )}

        <div className={styles.scrollWrap}>
          <table className={styles.table}>
            <ApcmBillingTableHead
              someSelected={table.someSelected}
              allSelected={table.allSelected}
              onSelectAll={table.handleSelectAll}
            />
            <tbody>
              {table.isLoading ? (
                <tr>
                  <td colSpan={12} className={styles.loadingCell}>
                    <TableSkeleton rows={table.perPage} />
                  </td>
                </tr>
              ) : table.paginated.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    <div className={styles.empty}>
                      <Icon name="solar:clipboard-text-linear" size={40} color="var(--neutral-200)" />
                      <p className={styles.emptyTitle}>No patients found</p>
                      <p className={styles.emptyMsg}>
                        {searchQuery
                          ? 'No APCM patients match your search.'
                          : 'No patients require manual review for this billing period.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.paginated.map(patient => (
                  <ApcmBillingRow
                    key={patient.id}
                    patient={patient}
                    isSelected={table.selectedIdSet.has(patient.id)}
                    isActive={table.attestationForSet?.has(patient.id) ?? false}
                    onSelect={table.toggleSelect}
                    onTriggerBill={table.handleTriggerBill}
                    onCommentChange={table.handleCommentChange}
                    onMarkChronic={table.handleMarkChronic}
                    onOpenPatient={() => table.openQuickView({
                      id: patient.id,
                      name: patient.name,
                      memberId: patient.memberId,
                      language: patient.language,
                    })}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {!table.isLoading && table.rows.length > 0 && (
          <Pagination
            currentPage={table.safePage}
            perPage={table.perPage}
            totalItems={table.rows.length}
            onPageChange={table.goToPage}
            onPerPageChange={(n) => { table.setPerPage(Number(n)); table.setCurrentPage(1); }}
          />
        )}
      </div>

      {table.tabSelectedIds.length > 0 && (
        <ApcmBillingBulkBar
          allSelected={table.allSelected}
          tabSelectedCount={table.tabSelectedIds.length}
          onSelectAll={table.handleSelectAll}
          onTriggerBill={() => table.handleTriggerBill(table.tabSelectedIds)}
          onClearSelection={() => table.setSelectedIds(prev => prev.filter(id => !table.allFilteredIdSet.has(id)))}
        />
      )}

      {table.attestationFor && (
        <AttestationModal
          patients={table.patients.filter(p => table.attestationForSet?.has(p.id))}
          onClose={() => table.setAttestationFor(null)}
          onSubmit={table.handleAttestationSubmit}
        />
      )}
    </>
  );
}
