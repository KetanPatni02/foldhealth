import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import diagStyles from './DiagPanel/DiagPanel.module.css';
import styles from './ChartDetailDrawer.module.css';

// Support-only Doc Review toolbar. Mirrors the DiagPanel toolbar 1:1
// (Figma HCC / DiagPanel) with the Coder-only actions stripped:
//   • no Bulk select and no Add ICD (both are coding actions)
//   • no Documents toggle (this drawer's whole right pane IS the docs list)
// Keeps: Search, Filter, Comment, Timeline, More overflow. Toggles map
// to the same shared state the DOS-level buttons used to drive.
const STATUS_FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'passed', label: 'Passed' },
  { key: 'failed', label: 'Failed' },
];

export function ChartReviewToolbar({
  searchQuery,
  setSearchQuery,
  filterOpen,
  setFilterOpen,
  statusFilter,
  setStatusFilter,
  commentsCount,
  leftPanel,
  setLeftPanel,
  moreOpen,
  setMoreOpen,
  moreWrapRef,
  actionsLocked,
  actionsLockedTip,
}) {
  const filterCount = (statusFilter && statusFilter !== 'all') ? 1 : 0;
  const commentsActive = leftPanel === 'comments';
  const activityActive = leftPanel === 'activity';
  const toggleLeftPanel = (target) => setLeftPanel(v => v === target ? 'preview' : target);

  return (
    <>
      <div className={diagStyles.toolbar}>
        <div className={diagStyles.toolbarSearch}>
          <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-300)" />
          <input
            aria-label="Search documents"
            type="text"
            placeholder="Search by document name or type"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className={diagStyles.searchClear}
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <Icon name="solar:close-linear" size={13} color="var(--neutral-300)" />
            </button>
          )}
        </div>
        <div className={diagStyles.toolbarIcons}>
          <ActionButton
            icon="custom:filter"
            size="S"
            tooltip="Filter"
            notification={filterCount > 0}
            count={filterCount > 0 ? String(filterCount) : undefined}
            className={filterOpen ? diagStyles.activeIcon : ''}
            onClick={() => setFilterOpen(v => !v)}
          />
          <span className={diagStyles.divider} />
          <ActionButton
            icon="solar:chat-round-line-linear"
            size="S"
            tooltip={actionsLocked ? actionsLockedTip : 'Comments'}
            count={commentsCount > 0 ? String(commentsCount) : undefined}
            className={[
              diagStyles.hideBelow540,
              commentsActive ? diagStyles.activeIcon : '',
            ].filter(Boolean).join(' ')}
            onClick={actionsLocked ? undefined : () => toggleLeftPanel('comments')}
            aria-pressed={commentsActive}
            state={actionsLocked ? 'disabled' : 'active'}
          />
          <span className={[diagStyles.divider, diagStyles.hideBelow540].join(' ')} />
          <ActionButton
            icon="solar:history-linear"
            size="S"
            tooltip="Timeline"
            className={[
              diagStyles.hideBelow640,
              activityActive ? diagStyles.activeIcon : '',
            ].filter(Boolean).join(' ')}
            onClick={() => toggleLeftPanel('activity')}
            aria-pressed={activityActive}
          />
          <span className={[diagStyles.divider, diagStyles.showToolbarMore].join(' ')} />
          <span className={[diagStyles.toolbarMoreWrap, diagStyles.showToolbarMore].join(' ')} ref={moreWrapRef}>
            <ActionButton
              icon="solar:menu-dots-linear"
              size="S"
              tooltip="More"
              onClick={(e) => { e.stopPropagation(); setMoreOpen(v => !v); }}
              className={moreOpen ? diagStyles.activeIcon : ''}
            />
            {moreOpen && (
              <div className={diagStyles.toolbarMoreDropdown} role="menu">
                <button
                  type="button"
                  className={[diagStyles.toolbarMoreItem, diagStyles.showBelow540].join(' ')}
                  role="menuitem"
                  disabled={actionsLocked}
                  onClick={() => {
                    setMoreOpen(false);
                    if (!actionsLocked) toggleLeftPanel('comments');
                  }}
                >
                  <Icon name="solar:chat-round-line-linear" size={16} color="var(--neutral-400)" />
                  <span>Comments</span>
                  <span className={diagStyles.toolbarMoreItemCount}>{commentsCount}</span>
                </button>
                <button
                  type="button"
                  className={[diagStyles.toolbarMoreItem, diagStyles.showBelow640].join(' ')}
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    toggleLeftPanel('activity');
                  }}
                >
                  <Icon name="solar:history-linear" size={16} color="var(--neutral-400)" />
                  <span>Timeline</span>
                </button>
              </div>
            )}
          </span>
        </div>
      </div>

      {filterOpen && (
        <div className={styles.toolbarFilterRow}>
          <span className={styles.toolbarFilterLabel}>Status</span>
          <div className={styles.toolbarFilterChips}>
            {STATUS_FILTER_OPTIONS.map(opt => (
              <button
                key={opt.key}
                type="button"
                className={`${styles.toolbarFilterChip} ${statusFilter === opt.key ? styles.toolbarFilterChipActive : ''}`}
                onClick={() => setStatusFilter(opt.key)}
                aria-pressed={statusFilter === opt.key}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
