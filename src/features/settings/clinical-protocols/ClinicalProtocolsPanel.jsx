import { useEffect, useMemo, useState } from 'react';
import { SectionTitleBar } from '../../../components/SectionTitleBar/SectionTitleBar';
import { WorklistShell } from '../../../components/WorklistShell/WorklistShell';
import { FilterChip } from '../../../components/FilterChip/FilterChip';
import { Badge } from '../../../components/Badge/Badge';
import { BadgeRow } from '../../../components/BadgeRow/BadgeRow';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Alert } from '../../../components/Alert/Alert';
import { Icon } from '../../../components/Icon/Icon';
import { TableSkeleton } from '../../../components/TableSkeleton/TableSkeleton';
import { RingEmptyState } from '../../../components/RingEmptyState/RingEmptyState';
import { useAppStore } from '../../../store/useAppStore';
import { protocolCounts, protocolStatus } from './lib/protocolSchema';
import { ProtocolUploadDrawer } from './ProtocolUploadDrawer';
import { ProtocolReviewDrawer } from './ProtocolReviewDrawer';
import styles from './ClinicalProtocols.module.css';

const TABS = [
  { key: 'all', label: 'All Protocols' },
  { key: 'draft', label: 'Needs Review' },
  { key: 'active', label: 'Active' },
  { key: 'archived', label: 'Superseded & Retired' },
];
const IN_TAB = {
  all: () => true,
  draft: p => p.status === 'draft' || p.status === 'processing' || p.status === 'failed',
  active: p => p.status === 'active',
  archived: p => p.status === 'superseded' || p.status === 'retired',
};

const COLUMNS = [
  { key: 'title', label: 'Protocol', sortKey: 'title', sticky: 'left', left: 0, width: 300 },
  { key: 'conditions', label: 'Conditions', width: 210 },
  { key: 'programs', label: 'Programs', width: 130 },
  { key: 'effective', label: 'Effective', sortKey: 'effectiveDate', width: 110 },
  { key: 'review', label: 'Next Review', sortKey: 'reviewDate', width: 120 },
  { key: 'status', label: 'Status', sortKey: 'status', width: 140 },
  { key: 'items', label: 'Items', width: 80 },
  { key: 'updated', label: 'Updated', sortKey: 'updatedAt', width: 120 },
  { key: 'actions', label: 'Actions', sticky: 'right', width: 72 },
];

const fmtDay = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return y && m && d ? `${m}/${d}/${y}` : '—';
};
const todayIso = () => new Date().toISOString().slice(0, 10);
const optionsOf = values => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b)).map(v => ({ value: v, label: v }));

/**
 * Settings > Clinical Protocols: the library of client clinical practice
 * guidance (clinical_protocols). Upload PDFs, Word files or Fold JSON, review
 * each parsed draft, approve it to Active; newer approvals supersede older
 * versions. Built to stay usable with hundreds of protocols: tabs by status,
 * search, condition / program / organization filters, pagination.
 */
export function ClinicalProtocolsPanel() {
  const protocols = useAppStore(s => s.clinicalProtocols);
  const loading = useAppStore(s => s.clinicalProtocolsLoading);
  const didFetch = useAppStore(s => s.clinicalProtocolsDidFetch);
  const isSample = useAppStore(s => s.clinicalProtocolsSample);
  const fetchClinicalProtocols = useAppStore(s => s.fetchClinicalProtocols);
  const careProgramTypes = useAppStore(s => s.careProgramTypes);
  const fetchCareProgramTypes = useAppStore(s => s.fetchCareProgramTypes);
  useEffect(() => { fetchClinicalProtocols(); fetchCareProgramTypes?.(); }, [fetchClinicalProtocols, fetchCareProgramTypes]);

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [conditionFilter, setConditionFilter] = useState([]);
  const [programFilter, setProgramFilter] = useState([]);
  const [orgFilter, setOrgFilter] = useState([]);
  const [sort, setSort] = useState({ key: 'updatedAt', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reviewId, setReviewId] = useState(null);

  const programName = useMemo(() => Object.fromEntries((careProgramTypes || []).map(t => [t.code, t.name])), [careProgramTypes]);
  const conditionOptions = useMemo(() => optionsOf(protocols.flatMap(p => p.conditions)), [protocols]);
  const programOptions = useMemo(() => optionsOf(protocols.flatMap(p => p.programCodes))
    .map(o => ({ ...o, label: programName[o.value] ? `${programName[o.value]} (${o.value})` : o.value })), [protocols, programName]);
  const orgOptions = useMemo(() => optionsOf(protocols.map(p => p.organization)), [protocols]);
  const activeFilters = conditionFilter.length + programFilter.length + orgFilter.length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const conditions = new Set(conditionFilter);
    const programs = new Set(programFilter);
    const orgs = new Set(orgFilter);
    const rows = protocols.filter(p => IN_TAB[tab](p)
      && (!q || `${p.title} ${p.organization} ${p.author} ${p.conditions.join(' ')} ${p.sourceName}`.toLowerCase().includes(q))
      && (!conditions.size || p.conditions.some(c => conditions.has(c)))
      && (!programs.size || p.programCodes.some(c => programs.has(c)))
      && (!orgs.size || orgs.has(p.organization)));
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => String(a[sort.key] || '').localeCompare(String(b[sort.key] || '')) * dir);
  }, [protocols, tab, search, conditionFilter, programFilter, orgFilter, sort]);
  // Narrowing the list can leave the page past its end.
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / perPage)));
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
  // A new tab, search or filter starts from the first page.
  const fromFirstPage = setter => (value) => { setter(value); setPage(1); };

  const onSort = key => setSort(cur => ({ key, dir: cur.key === key && cur.dir === 'asc' ? 'desc' : 'asc' }));
  const today = todayIso();

  const renderRow = (p) => {
    const status = protocolStatus(p.status);
    const total = protocolCounts(p.protocol).total;
    const reviewDue = p.status === 'active' && p.reviewDate && p.reviewDate <= today;
    return (
      <tr key={p.id} className={styles.row}>
        <td className={`${styles.td} ${styles.tdName}`}>
          <span className={styles.nameCell}>
            <button type="button" className={styles.nameLink} onClick={() => setReviewId(p.id)}>{p.title}</button>
            <span className={styles.nameSub}>{[p.organization, p.version && `v${p.version}`, p.sourceName].filter(Boolean).join(' · ')}</span>
          </span>
        </td>
        <td className={styles.td}>{p.conditions.length ? <BadgeRow items={p.conditions} maxLines={2} /> : '—'}</td>
        <td className={styles.td}>{p.programCodes.length ? <BadgeRow items={p.programCodes} maxLines={1} /> : '—'}</td>
        <td className={`${styles.td} ${styles.nowrap}`}>{fmtDay(p.effectiveDate)}</td>
        <td className={`${styles.td} ${styles.nowrap} ${reviewDue ? styles.overdue : ''}`}>{fmtDay(p.reviewDate)}{reviewDue ? ' · due' : ''}</td>
        <td className={styles.td}><Badge tone={status.tone} size="S" label={status.label} /></td>
        <td className={styles.td}>{p.status === 'processing' ? '…' : total}</td>
        <td className={`${styles.td} ${styles.nowrap}`}>{fmtDay(p.updatedAt)}</td>
        <td className={`${styles.td} ${styles.tdActions}`}>
          <span className={styles.actionCell}>
            <ActionButton icon={p.status === 'draft' ? 'solar:shield-check-linear' : 'solar:eye-linear'} size="S" tooltip={p.status === 'draft' ? 'Review' : 'Open'} tooltipLeft onClick={() => setReviewId(p.id)} />
          </span>
        </td>
      </tr>
    );
  };

  const showSkeleton = loading && !didFetch;
  return (
    <div className={styles.wrapper}>
      <SectionTitleBar
        tabs={TABS}
        activeTab={tab}
        onTabChange={fromFirstPage(setTab)}
        actions={['search', 'filter']}
        onFilter={() => setFiltersOpen(v => !v)}
        filterActive={filtersOpen}
        filterBadgeCount={activeFilters || undefined}
        searchPlaceholder="Search protocols…"
        searchValue={search}
        onSearchChange={fromFirstPage(setSearch)}
        primaryActionLabel="Upload Protocols"
        primaryActionIcon="solar:upload-minimalistic-linear"
        primaryActionDisabled={isSample}
        onPrimaryAction={() => setUploadOpen(true)}
      />
      {filtersOpen && (
        <div className={styles.filterBar}>
          <FilterChip label="Condition" options={conditionOptions} selected={conditionFilter} onChange={fromFirstPage(setConditionFilter)} searchable />
          <FilterChip label="Program" options={programOptions} selected={programFilter} onChange={fromFirstPage(setProgramFilter)} />
          <FilterChip label="Organization" options={orgOptions} selected={orgFilter} onChange={fromFirstPage(setOrgFilter)} searchable />
        </div>
      )}
      {isSample && (
        <div className={styles.notice}>
          <Alert tone="info" message="Showing a sample protocol. Run supabase/clinical_protocols_migration.sql to upload and review your own." />
        </div>
      )}
      <div className={styles.content}>
        {showSkeleton ? <TableSkeleton rows={8} /> : protocols.length === 0 ? (
          <RingEmptyState icon="solar:document-medicine-linear" label="Upload your first clinical protocol" />
        ) : (
          <WorklistShell
            header={null}
            columns={COLUMNS}
            rows={paged}
            renderRow={renderRow}
            sortKey={sort.key}
            sortDir={sort.dir}
            onSort={onSort}
            page={currentPage}
            perPage={perPage}
            totalItems={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(n) => { setPerPage(n); setPage(1); }}
            emptyState={(
              <div className={styles.emptyState}>
                <Icon name="solar:document-medicine-linear" size={32} color="var(--neutral-150)" />
                <p>No protocols match these filters.</p>
              </div>
            )}
            minTableWidth={1180}
          />
        )}
      </div>
      {uploadOpen && (
        <ProtocolUploadDrawer
          onClose={() => setUploadOpen(false)}
          onReview={(id) => { setUploadOpen(false); setReviewId(id); }}
        />
      )}
      {reviewId && <ProtocolReviewDrawer key={reviewId} protocolId={reviewId} onClose={() => setReviewId(null)} />}
    </div>
  );
}
