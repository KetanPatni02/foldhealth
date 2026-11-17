import { useAppStore } from '../../../store/useAppStore';
import { Icon } from '../../../components/Icon/Icon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { CloseIcon } from '../../../components/Icon/CloseIcon';
import { IcdSearch } from '../../../components/IcdSearch/IcdSearch';
import { makeCard } from './IcdCard.utils';
import { DiagPanelFilterBar } from './DiagPanelFilterBar';
import { EMPTY_FILTERS } from './DiagPanelFilterBar.utils';
import { canLogOutreach } from '../outreach/outreachModel';
import styles from './DiagPanel.module.css';

export function DiagPanelViewToolbar(p) {
  const {
    addIcdMode, gapExcludeCodes, setPendingGaps, exitAddIcdMode, hccUserRole, bulkMode,
    toggleBulkMode, searchQuery, setSearchQuery, setAddIcdMode, filterCount, filterOpen,
    setFilterOpen, docsCount, commentsCount,
    docsUnread, commentsUnread, docsUnreadCount, commentsUnreadCount,
    diagLeftPanel, setDiagLeftPanel, setFocusIdx,
    setDiagTab, openDocsFromToolbar, openCommentsFromToolbar,
    moreOpen, setMoreOpen, moreWrapRef, filters, setFilters,
    icdsRaw, notLinkedRaw, member, diagActivityIcd,
  } = p;
  // More Action (Figma OIQR1ru428nPupFBrG7HaR 4315:197261): Upload Document,
  // Log Outreach (HCC Outreach orgs), Tutorial, Provider Report; at narrow
  // widths it also takes the toolbar icons that no longer fit.
  const hccOutreachEnabled = useAppStore(s => s.hccOutreachEnabled);
  const requestHccOutreachLog = useAppStore(s => s.requestHccOutreachLog);
  const openHccDocsUploader = useAppStore(s => s.openHccDocsUploader);
  return (
    <>
      {/* ── Toolbar: bulk | inline search | + ICD, filter, docs, comments,
          history, more (Paper 1WXT). In addIcdMode the toolbar collapses
          to a single dedicated search row, all sibling actions hide so
          the user's focus stays on adding an ICD. Exit via the X inside
          the search field. */}
      <div className={styles.toolbar}>
        {addIcdMode ? (
          <div className={styles.toolbarAddIcd}>
            <IcdSearch
              placeholder="Search & Add ICD"
              autoFocus
              excludeCodes={gapExcludeCodes}
              onSelect={(icd) => setPendingGaps(prev => [makeCard(icd), ...prev])}
            />
            <button
              type="button"
              className={styles.toolbarAddIcdClose}
              onClick={exitAddIcdMode}
              aria-label="Close ICD search"
            >
              <Icon name="solar:close-circle-linear" size={16} color="var(--neutral-300)" />
            </button>
          </div>
        ) : (
          <>
            {/* Bulk select is an ICD coding action, Support can't code,
                so hide the entry entirely (matches row-level gating). */}
            {hccUserRole !== 'Support' && (
              <>
                <ActionButton
                  icon={bulkMode ? 'custom:bulk-select-close' : 'custom:bulk-select'}
                  size="sm"
                  tooltip={bulkMode ? 'Exit bulk select' : 'Bulk select'}
                  className={bulkMode ? styles.toolbarBtnActive : ''}
                  onClick={toggleBulkMode}
                />
                <span className={styles.divider} />
              </>
            )}
            <div className={styles.toolbarSearch}>
              <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-300)" />
              <input aria-label="Search by code or description"
                type="text"
                placeholder="Search by code or description"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className={styles.searchClear}
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <Icon name="solar:close-linear" size={13} color="var(--neutral-300)" />
                </button>
              )}
            </div>
            <div className={styles.toolbarIcons}>
              {hccUserRole !== 'Support' && (
                <>
                  <span className={styles.addIcdWrap}>
                    <button
                      type="button"
                      className={styles.addIcdBtn}
                      onClick={() => setAddIcdMode(true)}
                      aria-label="Add ICD"
                    >
                      <Icon
                        name="solar:add-circle-linear"
                        size={16}
                        color="var(--primary-300)"
                      />
                      <span>ICD</span>
                    </button>
                  </span>
                  <span className={styles.divider} />
                </>
              )}
              <ActionButton
                icon="custom:filter"
                size="sm"
                tooltip="Filter"
                notification={filterCount > 0}
                count={filterCount > 0 ? String(filterCount) : undefined}
                className={filterOpen ? styles.activeIcon : ''}
                onClick={() => setFilterOpen(v => !v)}
              />
              <span className={styles.divider} />
              <ActionButton
                icon="solar:file-text-linear"
                size="sm"
                tooltip="Documents"
                notification={docsUnread}
                count={docsUnread ? String(docsUnreadCount) : undefined}
                className={[
                  styles.hideBelow460,
                  diagLeftPanel === 'documents' && !diagActivityIcd ? styles.activeIcon : '',
                ].filter(Boolean).join(' ')}
                onClick={openDocsFromToolbar}
              />
              <span className={[styles.divider, styles.hideBelow460].join(' ')} />
              <ActionButton
                icon="solar:chat-round-line-linear"
                size="sm"
                tooltip="Comments"
                notification={commentsUnread}
                count={commentsUnread ? String(commentsUnreadCount) : undefined}
                className={[
                  styles.hideBelow540,
                  diagLeftPanel === 'comments' && !diagActivityIcd ? styles.activeIcon : '',
                ].filter(Boolean).join(' ')}
                onClick={openCommentsFromToolbar}
              />
              <span className={[styles.divider, styles.hideBelow540].join(' ')} />
              <ActionButton
                icon="solar:history-linear"
                size="sm"
                tooltip="Timeline"
                className={[
                  styles.hideBelow640,
                  diagLeftPanel === 'activity' && !diagActivityIcd ? styles.activeIcon : '',
                ].filter(Boolean).join(' ')}
                onClick={() => {
                  const closing = diagLeftPanel === 'activity' && !diagActivityIcd;
                  // Deselect the currently-focused ICD so the right-pane ICD
                  // card highlight clears at the same time the left panel
                  // drops out of ICD scope.
                  setFocusIdx(-1);
                  setDiagLeftPanel(closing ? null : 'activity');
                }}
              />
              <span className={styles.divider} />
              <span className={styles.toolbarMoreWrap} ref={moreWrapRef}>
                <ActionButton
                  icon="solar:menu-dots-linear"
                  size="sm"
                  tooltip="More"
                  onClick={(e) => { e.stopPropagation(); setMoreOpen(v => !v); }}
                  className={moreOpen ? styles.activeIcon : ''}
                />
                {moreOpen && (
                  <div className={styles.toolbarMoreDropdown} role="menu" aria-label="More Action">
                    <div className={styles.toolbarMoreTitle}>More Action</div>
                    <button
                      type="button"
                      className={styles.toolbarMoreItem}
                      role="menuitem"
                      onClick={() => {
                        // The Documents tab's inline uploader, in the left workspace.
                        setMoreOpen(false);
                        setFocusIdx(-1);
                        setDiagLeftPanel('documents');
                        openHccDocsUploader();
                      }}
                    >
                      <Icon name="solar:upload-minimalistic-linear" size={16} color="var(--neutral-400)" />
                      <span>Upload Document</span>
                    </button>
                    <button
                      type="button"
                      className={[styles.toolbarMoreItem, styles.showBelow460].join(' ')}
                      role="menuitem"
                      onClick={() => { setMoreOpen(false); openDocsFromToolbar(); }}
                    >
                      <Icon name="solar:file-text-linear" size={16} color="var(--neutral-400)" />
                      <span>Documents</span>
                      <span className={styles.toolbarMoreItemCount}>{docsCount}</span>
                    </button>
                    <button
                      type="button"
                      className={[styles.toolbarMoreItem, styles.showBelow540].join(' ')}
                      role="menuitem"
                      onClick={() => { setMoreOpen(false); openCommentsFromToolbar(); }}
                    >
                      <Icon name="solar:chat-round-line-linear" size={16} color="var(--neutral-400)" />
                      <span>Comments</span>
                      <span className={styles.toolbarMoreItemCount}>{commentsCount}</span>
                    </button>
                    <button
                      type="button"
                      className={[styles.toolbarMoreItem, styles.showBelow640].join(' ')}
                      role="menuitem"
                      onClick={() => {
                        setMoreOpen(false);
                        setDiagLeftPanel(diagLeftPanel === 'activity' && !diagActivityIcd ? null : 'activity');
                      }}
                    >
                      <Icon name="solar:history-linear" size={16} color="var(--neutral-400)" />
                      <span>Timeline</span>
                    </button>
                    {hccOutreachEnabled && canLogOutreach(hccUserRole) && (
                      <button
                        type="button"
                        className={styles.toolbarMoreItem}
                        role="menuitem"
                        onClick={() => {
                          setMoreOpen(false);
                          // Outreach is member-level: leave any ICD scope first.
                          setFocusIdx(-1);
                          requestHccOutreachLog();
                          setDiagLeftPanel('outreach');
                        }}
                      >
                        <Icon name="solar:call-chat-linear" size={16} color="var(--neutral-400)" />
                        <span>Log Outreach</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className={[styles.toolbarMoreItem, diagLeftPanel === 'tutorial' ? styles.toolbarMoreItemActive : ''].filter(Boolean).join(' ')}
                      role="menuitem"
                      onClick={() => {
                        setMoreOpen(false);
                        setFocusIdx(-1);
                        setDiagLeftPanel(diagLeftPanel === 'tutorial' ? null : 'tutorial');
                      }}
                    >
                      <Icon name="solar:book-2-linear" size={16} color="var(--neutral-400)" />
                      <span>Tutorial</span>
                    </button>
                    <button
                      type="button"
                      className={styles.toolbarMoreItem}
                      role="menuitem"
                      aria-disabled="true"
                      disabled
                      title="Coming soon"
                    >
                      <Icon name="solar:download-minimalistic-linear" size={16} color="var(--neutral-200)" />
                      <span>Provider Report</span>
                    </button>
                  </div>
                )}
              </span>
            </div>
          </>
        )}
      </div>

      {filterOpen && (
        <DiagPanelFilterBar
          filters={filters}
          icds={[...icdsRaw, ...notLinkedRaw]}
          member={member}
          onChange={setFilters}
          onClearAll={() => setFilters(EMPTY_FILTERS)}
        />
      )}
    </>
  );
}
