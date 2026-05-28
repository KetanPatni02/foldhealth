import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icon/Icon';
import { Button } from '../../components/Button/Button';
import { Badge } from '../../components/Badge/Badge';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { SearchIconButton } from '../../components/SearchIconButton/SearchIconButton';
import { Pagination } from '../../components/Pagination/Pagination';
import { ConfirmDialog } from '../../components/Modal/ConfirmDialog';
import { useAppStore } from '../../store/useAppStore';
import { EmailPreviewDrawer } from './EmailPreviewDrawer';
import styles from './ContentSettings.module.css';

// Compact "2h ago", "3d ago" formatter for the Last Updated column. Falls
// back to the date itself once we're past a week.
function formatRelative(iso) {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return 'Just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Skeleton row that matches the live email row layout — 5 columns + action
// cluster on the right. Reused for the initial load and per-page fetches.
function EmailRowSkeleton() {
  return (
    <tr className={styles.row}>
      <td className={styles.tdName}>
        <div className={styles.skelNameRow}>
          <span className={`${styles.skelBone} ${styles.skelIcon}`} />
          <div className={styles.nameStack}>
            <span className={`${styles.skelBone} ${styles.skelTextLg}`} />
            <span className={`${styles.skelBone} ${styles.skelTextSm}`} />
          </div>
        </div>
      </td>
      <td className={styles.tdCategory}><span className={`${styles.skelBone} ${styles.skelChip}`} /></td>
      <td className={styles.tdSubject}><span className={`${styles.skelBone} ${styles.skelTextMd}`} /></td>
      <td className={styles.tdDate}><span className={`${styles.skelBone} ${styles.skelTextSm}`} /></td>
      <td className={styles.tdUpdatedBy}><span className={`${styles.skelBone} ${styles.skelTextMd}`} /></td>
      <td className={styles.tdAction}>
        <div className={styles.actionCell}>
          <span className={`${styles.skelBone} ${styles.skelDot}`} />
          <span className={`${styles.skelBone} ${styles.skelDot}`} />
          <span className={`${styles.skelBone} ${styles.skelDot}`} />
        </div>
      </td>
    </tr>
  );
}

const CONTENT_TABS = [
  { key: 'emails',     label: 'Emails' },
  { key: 'components', label: 'Components' },
  { key: 'forms',      label: 'Forms' },
  { key: 'sms',        label: 'SMS' },
  { key: 'push',       label: 'Push Notifications' },
  { key: 'media',      label: 'Media' },
  { key: 'articles',   label: 'Articles' },
];

const STATUS_BADGE = {
  running:   { variant: 'health-ok',     label: 'Running' },
  paused:    { variant: 'status-review', label: 'Paused' },
  scheduled: { variant: 'ai-neutral',    label: 'Scheduled' },
  draft:     { variant: 'compliance-na', label: 'Draft' },
  ended:     { variant: 'compliance-na', label: 'Ended' },
};

const STATUS_CYCLE = ['all', 'running', 'paused', 'scheduled', 'draft', 'ended'];

// ────────────────────────────────────────────────────────────────────────────
// Row-level kebab menu (Preview + Delete)
// ────────────────────────────────────────────────────────────────────────────
function RowMenu({ onPreview, onDuplicate, onDelete }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const openMenu = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.right - 180 });
    setOpen(v => !v);
  };

  const wrap = (fn) => () => { setOpen(false); fn(); };

  return (
    <>
      <div ref={btnRef} style={{ display: 'inline-flex' }}>
        <ActionButton
          icon="solar:menu-dots-linear"
          size="S"
          tooltip="More"
          onClick={openMenu}
        />
      </div>
      {open && createPortal(
        <div className={styles.overflowScrim} onClick={() => setOpen(false)}>
          <div
            className={styles.overflowMenu}
            style={{ top: pos.top, left: pos.left }}
            onClick={e => e.stopPropagation()}
          >
            <button className={styles.overflowItem} onClick={wrap(onPreview)}>
              <Icon name="solar:eye-linear" size={15} color="var(--neutral-300)" />
              Preview
            </button>
            <button className={styles.overflowItem} onClick={wrap(onDuplicate)}>
              <Icon name="solar:copy-linear" size={15} color="var(--neutral-300)" />
              Duplicate
            </button>
            <button className={`${styles.overflowItem} ${styles.overflowItemDanger}`} onClick={wrap(onDelete)}>
              <Icon name="solar:trash-bin-trash-linear" size={15} color="var(--status-error)" />
              Delete
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Emails tab
// ────────────────────────────────────────────────────────────────────────────
function EmailsTab({ searchVal, statusFilter, onPreview, onDuplicate, onDelete }) {
  const emails                  = useAppStore(s => s.contentEmails);
  const total                   = useAppStore(s => s.contentEmailsTotal);
  const loading                 = useAppStore(s => s.contentEmailsLoading);
  const fetchContentEmails      = useAppStore(s => s.fetchContentEmails);
  const openContentEmailBuilder = useAppStore(s => s.openContentEmailBuilder);
  const showToast               = useAppStore(s => s.showToast);

  const [page, setPage]       = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Reset to page 1 whenever filters/search change so the user never lands on
  // an empty page (e.g. searching while on page 5 of unfiltered results).
  useEffect(() => { setPage(1); }, [searchVal, statusFilter]);

  // Server-side fetch — runs on mount and whenever pagination/filter inputs
  // change. Supabase returns only the rows for the current page plus a total
  // count, so the table never holds the full dataset in memory.
  useEffect(() => {
    fetchContentEmails?.({ page, perPage, search: searchVal, status: statusFilter });
  }, [fetchContentEmails, page, perPage, searchVal, statusFilter]);

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <colgroup>
            <col className={styles.colName} />
            <col className={styles.colCategory} />
            <col className={styles.colSubject} />
            <col className={styles.colDate} />
            <col className={styles.colUpdatedBy} />
            <col className={styles.colAction} />
          </colgroup>
          <thead>
            <tr className={styles.headerRow}>
              <th>Name</th>
              <th>Category</th>
              <th>Subject</th>
              <th>Last Updated</th>
              <th>Last Updated By</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: Math.max(1, perPage > 5 ? 5 : perPage) }).map((_, i) => (
                <EmailRowSkeleton key={`skel-${i}`} />
              ))
            ) : emails.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  <Icon name="solar:letter-linear" size={32} color="var(--neutral-150)" />
                  <p>No emails match the current filters.</p>
                </td>
              </tr>
            ) : (
              emails.map(campaign => (
                <tr key={campaign.id} className={styles.row}>
                  <td className={styles.tdName}>
                    <button
                      type="button"
                      className={styles.nameLink}
                      onClick={() => onPreview(campaign)}
                    >
                      <Icon name="solar:letter-linear" size={15} color="var(--neutral-300)" />
                      <div className={styles.nameStack}>
                        <span className={styles.nameText}>{campaign.name}</span>
                        {campaign.description ? (
                          <span className={styles.nameDesc}>{campaign.description}</span>
                        ) : null}
                      </div>
                    </button>
                  </td>
                  <td className={styles.tdCategory}>
                    {campaign.category ? (
                      <Badge variant="ai-neutral" label={campaign.category} />
                    ) : (
                      <span className={styles.cellMuted}>—</span>
                    )}
                  </td>
                  <td className={styles.tdSubject}>
                    <span className={styles.cellText} title={campaign.subjectLine || ''}>
                      {campaign.subjectLine || <span className={styles.cellMuted}>—</span>}
                    </span>
                  </td>
                  <td className={styles.tdDate}>
                    <span className={styles.cellText}>{formatRelative(campaign.updatedAt)}</span>
                  </td>
                  <td className={styles.tdUpdatedBy}>
                    <span className={styles.cellText}>
                      {campaign.updatedByName || <span className={styles.cellMuted}>—</span>}
                    </span>
                  </td>
                  <td className={styles.tdAction}>
                    <div className={styles.actionCell}>
                      <ActionButton
                        icon="solar:pen-linear"
                        size="S"
                        tooltip="Edit template"
                        onClick={() => openContentEmailBuilder(campaign)}
                      />
                      <div className={styles.vDivider} />
                      <ActionButton
                        icon="solar:chart-linear"
                        size="S"
                        tooltip="Analytics"
                        onClick={() => showToast('Analytics – coming soon')}
                      />
                      <div className={styles.vDivider} />
                      <RowMenu
                        onPreview={() => onPreview(campaign)}
                        onDuplicate={() => onDuplicate(campaign)}
                        onDelete={() => onDelete(campaign)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 ? (
        <Pagination
          totalItems={total}
          currentPage={page}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
        />
      ) : null}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Placeholder for unbuilt tabs
// ────────────────────────────────────────────────────────────────────────────
function PlaceholderTab({ label }) {
  return (
    <div className={styles.placeholder}>
      <Icon name="solar:document-text-linear" size={40} color="var(--neutral-150)" />
      <p className={styles.placeholderTitle}>{label}</p>
      <p className={styles.placeholderSub}>Coming soon</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────────────────────
const STATUS_FILTER_BADGE = STATUS_BADGE;

export function ContentSettings() {
  const openContentEmailBuilder = useAppStore(s => s.openContentEmailBuilder);
  const campaignBuilderSaving   = useAppStore(s => s.campaignBuilderSaving);
  const deleteCampaign          = useAppStore(s => s.deleteCampaign);
  const duplicateCampaign       = useAppStore(s => s.duplicateCampaign);
  const fetchContentEmails      = useAppStore(s => s.fetchContentEmails);

  // Tab state lives in the store so the URL hash (#/settings/content/<tab>)
  // round-trips with the active tab.
  const activeTab    = useAppStore(s => s.contentTab) || 'emails';
  const setActiveTab = useAppStore(s => s.setContentTab);

  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchVal, setSearchVal]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [previewCampaign, setPreviewCampaign] = useState(null);
  const [deleteTarget, setDeleteTarget]       = useState(null);
  const [deleting, setDeleting]               = useState(false);

  const isEmails    = activeTab === 'emails';
  const statusBadge = STATUS_FILTER_BADGE[statusFilter];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const ok = await deleteCampaign(deleteTarget.id);
    setDeleting(false);
    if (ok) {
      setDeleteTarget(null);
      // Refresh the current page so totals are accurate.
      fetchContentEmails?.({ page: 1, perPage: 10, search: searchVal, status: statusFilter });
    }
  };

  const handleDuplicate = async (campaign) => {
    const fresh = await duplicateCampaign(campaign.id);
    if (fresh) {
      fetchContentEmails?.({ page: 1, perPage: 10, search: searchVal, status: statusFilter });
    }
  };

  const handleEditFromPreview = () => {
    const c = previewCampaign;
    setPreviewCampaign(null);
    if (c) openContentEmailBuilder(c);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabBar}>
        <div className={styles.tabs}>
          {CONTENT_TABS.map(tab => (
            <button
              key={tab.key}
              className={[styles.tab, activeTab === tab.key ? styles.tabActive : ''].filter(Boolean).join(' ')}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isEmails ? (
          <div className={styles.tabActions}>
            <div className={styles.searchWrap}>
              {searchOpen ? (
                <div className={styles.searchInput}>
                  <Icon name="solar:magnifer-linear" size={15} color="var(--neutral-300)" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search emails..."
                    value={searchVal}
                    onChange={e => setSearchVal(e.target.value)}
                  />
                  <button
                    className={styles.searchClose}
                    onClick={() => { setSearchOpen(false); setSearchVal(''); }}
                  >✕</button>
                </div>
              ) : (
                <SearchIconButton title="Search" onClick={() => setSearchOpen(true)} />
              )}
            </div>
            <span className={styles.tabDivider} />
            <ActionButton
              icon="custom:filter"
              size="L"
              tooltip="Filter"
              onClick={() => {
                const idx = STATUS_CYCLE.indexOf(statusFilter);
                setStatusFilter(STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]);
              }}
            />
            {statusBadge ? (
              <span
                className={styles.filterChip}
                onClick={() => setStatusFilter('all')}
                title="Clear filter"
              >
                <Badge variant={statusBadge.variant} label={statusBadge.label} />
              </span>
            ) : null}
            <span className={styles.tabDivider} />
            <Button
              variant="secondary"
              size="L"
              leadingIcon="solar:add-circle-linear"
              disabled={campaignBuilderSaving}
              onClick={() => openContentEmailBuilder(null)}
            >
              {campaignBuilderSaving ? 'Creating…' : 'New Email'}
            </Button>
          </div>
        ) : null}
      </div>

      <div className={styles.content}>
        {isEmails ? (
          <EmailsTab
            searchVal={searchVal}
            statusFilter={statusFilter}
            onPreview={setPreviewCampaign}
            onDuplicate={handleDuplicate}
            onDelete={setDeleteTarget}
          />
        ) : (
          <PlaceholderTab
            label={CONTENT_TABS.find(t => t.key === activeTab)?.label ?? ''}
          />
        )}
      </div>

      {/* Preview drawer */}
      {previewCampaign ? (
        <EmailPreviewDrawer
          campaign={previewCampaign}
          onClose={() => setPreviewCampaign(null)}
          onEdit={handleEditFromPreview}
        />
      ) : null}

      {/* Delete confirmation */}
      {deleteTarget ? (
        <ConfirmDialog
          icon="solar:danger-triangle-linear"
          iconColor="var(--status-error)"
          title={`Delete "${deleteTarget.name}"`}
          description="Are you sure you want to delete this email? This action cannot be undone."
          confirmLabel="Delete Email"
          cancelLabel="Cancel"
          variant="error"
          loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  );
}
