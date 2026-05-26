import { useMemo, useState } from 'react';
import { Checkbox } from '../../components/ui/checkbox';
import { Button } from '../../components/Button/Button';
import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { SearchIconButton } from '../../components/SearchIconButton/SearchIconButton';
import { ApcmBillingRow } from './ApcmBillingRow';
import { AttestationModal } from './AttestationModal';
import { APCM_PATIENTS } from './data/mock';
import styles from './ApcmBillingTable.module.css';
import rowStyles from './ApcmBillingRow.module.css';


const PER_PAGE_OPTIONS = [10, 20, 50];

function buildPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '…', total);
  } else if (current >= total - 3) {
    pages.push(1, '…', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '…', current - 1, current, current + 1, '…', total);
  }
  return pages;
}

export function ApcmBillingTable() {
  const activeTab = 'new-changes';
  const [patients, setPatients] = useState(APCM_PATIENTS);
  const [comments, setComments] = useState({});

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters] = useState({});

  const [selectedIds, setSelectedIds] = useState([]);
  const [attestationFor, setAttestationFor] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [goToInput, setGoToInput] = useState('');

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

  // Bulk selection (scoped to current page's ids)
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

  // Count selected across all filtered rows (not just current page)
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

  const pageNumbers = buildPages(safePage, totalPages);

  return (
    <>
      <div className={styles.wrap}>

        {/* ── Header bar ── */}
        <div className={styles.headerBar}>
          <div className={styles.headerLeft}>
            <span className={styles.pageTitle}>APCM Billing</span>
          </div>

          <div className={styles.headerRight}>
            {searchOpen ? (
              <div className={styles.searchInput}>
                <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-300)" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search member, ID…"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
                <button className={styles.searchClose} onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>✕</button>
              </div>
            ) : (
              <SearchIconButton title="Search" onClick={() => setSearchOpen(true)} />
            )}
            <span className={styles.iconDivider} />
            <ActionButton icon="solar:upload-minimalistic-linear" size="L" tooltip="Export" onClick={() => {}} />
          </div>
        </div>

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
                <th className={`${rowStyles.stickyLeft} ${rowStyles.stickyMember} ${styles.memberTh}`}>Member</th>
                <th>EHR ID</th>
                <th>Month</th>
                <th>Date of Service</th>
                <th>CPT Code</th>
                <th style={{ minWidth: 220 }}>ICD Codes</th>
                <th>Last Encounter</th>
                <th style={{ minWidth: 220 }}>Reasons</th>
                <th>Rendering Provider</th>
                <th style={{ minWidth: 160 }}>Comment</th>
                <th className={rowStyles.stickyRight}>Actions</th>
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
                    onSelect={toggleSelect}
                    onTriggerBill={handleTriggerBill}
                    onCommentChange={handleCommentChange}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {rows.length > 0 && (
          <div className={styles.pagination}>
            <select
              className={styles.pgPerPage}
              value={perPage}
              onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
            >
              {PER_PAGE_OPTIONS.map(n => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>

            <button className={styles.pgBtn} disabled={safePage === 1} onClick={() => goToPage(safePage - 1)}>
              <Icon name="solar:alt-arrow-left-linear" size={14} />
            </button>

            {pageNumbers.map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className={styles.pgEllipsis}>…</span>
              ) : (
                <button
                  key={p}
                  className={[styles.pgBtn, safePage === p ? styles.pgBtnActive : ''].join(' ')}
                  onClick={() => goToPage(p)}
                >
                  {p}
                </button>
              )
            )}

            <button className={styles.pgBtn} disabled={safePage === totalPages} onClick={() => goToPage(safePage + 1)}>
              <Icon name="solar:alt-arrow-right-linear" size={14} />
            </button>

            <div className={styles.pgGoWrap}>
              <input
                type="number"
                className={styles.pgGoInput}
                placeholder="Pg #"
                value={goToInput}
                min={1}
                max={totalPages}
                onChange={e => setGoToInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { goToPage(Number(goToInput)); setGoToInput(''); } }}
              />
              <button
                className={styles.pgGoBtn}
                onClick={() => { goToPage(Number(goToInput)); setGoToInput(''); }}
              >
                Go
              </button>
            </div>
          </div>
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
          selectedCount={attestationFor.length}
          onClose={() => setAttestationFor(null)}
          onSubmit={handleAttestationSubmit}
        />
      )}
    </>
  );
}
