import { useMemo, useState, useEffect } from 'react';
import { Checkbox } from '../../components/ui/checkbox';
import { Button } from '../../components/Button/Button';
import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Pagination } from '../../components/Pagination/Pagination';
import { ApcmBillingRow } from './ApcmBillingRow';
import { AttestationModal } from './AttestationModal';
import { useAppStore } from '../../store/useAppStore';
import styles from './ApcmBillingTable.module.css';
import rowStyles from './ApcmBillingRow.module.css';

const thStyle = {
  padding: '8px 14px',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--neutral-300)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

export function ApcmBillingTable({ searchQuery = '' }) {
  const activeTab = 'new-changes';
  const storePatients = useAppStore(s => s.apcmPatients);
  const apcmPatientsLoading = useAppStore(s => s.apcmPatientsLoading);
  const fetchApcmPatients = useAppStore(s => s.fetchApcmPatients);

  const [patients, setPatients] = useState([]);

  // Fetch from Supabase on first mount; falls back to local mock on error.
  useEffect(() => {
    if (storePatients.length === 0 && !apcmPatientsLoading) {
      fetchApcmPatients();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync store → local state once data arrives (local state handles UI mutations).
  useEffect(() => {
    if (storePatients.length > 0 && patients.length === 0) {
      setPatients(storePatients);
    }
  }, [storePatients, patients.length]);
  const [comments, setComments] = useState({});
  const [activeFilters] = useState({});

  const [selectedIds, setSelectedIds] = useState([]);
  const [attestationFor, setAttestationFor] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const handleCommentChange = (id, value) =>
    setComments(prev => ({ ...prev, [id]: value }));

  const filtered = useMemo(() => {
    let result = patients.filter(p => p.tab === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.memberId.toLowerCase().includes(q) ||
        p.ehrId.includes(q)
      );
    }
    if (activeFilters.cpt) result = result.filter(p => p.cptCode === activeFilters.cpt);
    if (activeFilters.provider) result = result.filter(p => p.renderingProvider === activeFilters.provider);
    return result;
  }, [patients, activeTab, searchQuery, activeFilters]);

  const rows = useMemo(() =>
    filtered.map(p => ({ ...p, comment: comments[p.id] ?? p.comment })),
    [filtered, comments]
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = rows.slice((safePage - 1) * perPage, safePage * perPage);

  const goToPage = (p) => {
    const n = Math.max(1, Math.min(p, totalPages));
    setCurrentPage(n);
  };

  // Bulk selection (scoped to current page)
  const allIds = paginated.map(p => p.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.includes(id));
  const someSelected = selectedIds.some(id => allIds.includes(id)) && !allSelected;

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSelectAll = (checked) =>
    setSelectedIds(checked
      ? [...new Set([...selectedIds, ...allIds])]
      : selectedIds.filter(id => !allIds.includes(id))
    );

  const allFilteredIds = rows.map(p => p.id);
  const tabSelectedIds = selectedIds.filter(id => allFilteredIds.includes(id));

  const handleTriggerBill = (ids) => setAttestationFor(ids);

  const handleAttestationSubmit = () => {
    if (attestationFor) {
      setPatients(prev => prev.filter(p => !attestationFor.includes(p.id)));
      setSelectedIds(prev => prev.filter(id => !attestationFor.includes(id)));
    }
    setAttestationFor(null);
  };

  return (
    <>
      <div className={styles.wrap}>

        {/* ── Table ── */}
        <div className={styles.scrollWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={`${rowStyles.stickyLeft} ${rowStyles.stickyCheck} ${styles.checkTh}`}>
                  <Checkbox
                    checked={someSelected ? 'indeterminate' : allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className={`${rowStyles.stickyLeft} ${rowStyles.stickyMember}`} style={{ ...thStyle, borderRight: '1px solid var(--neutral-150)', minWidth: 220 }}>Member</th>
                <th style={thStyle}>EHR ID</th>
                <th style={thStyle}>Month</th>
                <th style={thStyle}>Date of Service</th>
                <th style={thStyle}>CPT Code</th>
                <th style={{ ...thStyle, minWidth: 360 }}>ICD Codes</th>
                <th style={thStyle}>Last Encounter</th>
                <th style={{ ...thStyle, minWidth: 320 }}>Reasons</th>
                <th style={thStyle}>Rendering Provider</th>
                <th style={{ ...thStyle, minWidth: 280 }}>Comment</th>
                <th className={rowStyles.stickyRight} style={{ ...thStyle, width: '1%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
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
                paginated.map(patient => (
                  <ApcmBillingRow
                    key={patient.id}
                    patient={patient}
                    isSelected={selectedIds.includes(patient.id)}
                    isActive={attestationFor?.includes(patient.id) ?? false}
                    onSelect={toggleSelect}
                    onTriggerBill={handleTriggerBill}
                    onCommentChange={handleCommentChange}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Shared Pagination component (controlled mode) — same UI as
            the TOC Worklist + HCC. APCM owns its page state locally, so
            it passes currentPage/perPage/totalItems + change handlers. */}
        {rows.length > 0 && (
          <Pagination
            currentPage={safePage}
            perPage={perPage}
            totalItems={rows.length}
            onPageChange={goToPage}
            onPerPageChange={(n) => { setPerPage(Number(n)); setCurrentPage(1); }}
          />
        )}
      </div>

      {/* ── Floating bulk action bar ── */}
      {tabSelectedIds.length > 0 && (
        <div className={styles.bulkBar}>
          <div className={styles.bulkCount}>
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              aria-label="Select all on page"
            />
            <span>{tabSelectedIds.length} selected</span>
          </div>
          <span className={styles.bulkDivider} />
          <Button
            variant="primary"
            size="S"
            leadingIcon="solar:bill-list-linear"
            onClick={() => handleTriggerBill(tabSelectedIds)}
          >
            Trigger Bill
          </Button>
          <span className={styles.bulkDivider} />
          <ActionButton icon="solar:menu-dots-linear" size="L" tooltip="More options" onClick={() => {}} />
          <span className={styles.bulkDivider} />
          <button
            className={styles.bulkClose}
            title="Clear selection"
            onClick={() => setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)))}
          >
            <Icon name="solar:close-circle-linear" size={16} />
          </button>
        </div>
      )}

      {attestationFor && (
        <AttestationModal
          patients={patients.filter(p => attestationFor.includes(p.id))}
          onClose={() => setAttestationFor(null)}
          onSubmit={handleAttestationSubmit}
        />
      )}
    </>
  );
}
