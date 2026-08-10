import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { CloseIcon } from '../../../components/Icon/CloseIcon';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Icon } from '../../../components/Icon/Icon';
import { PatientBanner } from '../../../components/PatientBanner/PatientBanner';
import { BulkBar } from '../../../components/BulkBar/BulkBar';
import { LeftWorkspace } from './LeftWorkspace';
import { DiagPanelFilterBar } from './DiagPanelFilterBar';
import { ReviewProgressPopover, ProgressRing } from './ReviewProgressPopover';
import { UnassignedAssignTrigger, AssigneeAvatar } from './DiagPanelAssignee';
import { IcdSections, SweepList } from './DiagPanelSections';
import { HccGroupRow as HccCard } from './HccGroupRow';
import { DosStatusMenu } from './DosStatusMenu';
import { DosSelector } from './DosSelector';
import styles from './DiagPanel.module.css';

export function DiagPanelView(p) {
  const {
    member, closeDiagPanel, diagLeftPanel, setDiagLeftPanel, setDiagTab, diagActivityIcd,
    showToast, activeGroups, rafImpact, noop, viewMode, setViewMode, filters, setFilters,
    assocICDs, allNotAssoc, overriddenICDs, closedICDs, filteredAssoc, dosList, memberName,
    searchQuery, setSearchQuery, selectedKeys, bulkMode, toggleBulkMode, rejectOpen, setRejectOpen,
    progress, stages, currentDos, currentStatus, currentBucket, dosState, assigneeResolved,
    complianceGates, handleDosStatusChange, handleMarkComplete, handleRejectConfirm,
    clearFilters, activeFilterCount, toggleKey, handleSelectAll, allSelected, someSelected,
    diagViewMode, setDiagViewMode, diagnosisGapsLoading, diagDosFilter, overriddenGroups, closedGroups,
  } = p;
  return (
    <Drawer
      title={<span className={styles.drawerTitle}>Diagnosis Gaps Details</span>}
      onClose={closeDiagPanel}
      className={[styles.panel, diagLeftPanel ? styles.panelExpanded : ''].join(' ')}
      bodyClassName={[styles.body, diagLeftPanel ? styles.bodyExpanded : ''].join(' ')}
      headerStyle={{ display: 'none' }}
    >
      {/* ── Row 1: Title + Close — spans the FULL drawer width, above both
          panes, so the close button stays accessible regardless of which
          pane is expanded. ── */}
      <div className={styles.titleRow}>
        <span className={styles.titleText}>Diagnosis Gaps Details</span>
        <ActionButton size="L" tooltip="Close" onClick={closeDiagPanel}>
          <CloseIcon size={20} color="var(--neutral-300)" />
        </ActionButton>
      </div>

      {/* When expanded, the workspace sits to the RIGHT of the Diagnosis Gaps
          section (ICD cards on the left, workspace on the right). The content
          row contains both panes so the title row above can span the full
          width. */}
      <div className={styles.contentRow}>
      <div className={diagLeftPanel ? styles.rightPane : styles.rightPaneFull}>
      {/* ── Row 2: Patient Banner — shared <PatientBanner> from
          components/. Maps member.* fields onto the component's props so
          this drawer renders identical chrome to every other patient-scoped
          drawer (Care Gap, Quick View, etc.). ── */}
      <PatientBanner
        initials={member.in}
        name={member.name}
        gender={member.g === 'M' ? 'Male' : member.g === 'F' ? 'Female' : member.g}
        age={member.age || ''}
        dob={member.dob}
        memberId={member.memberId || `#${member.id}`}
        raf={member.raf}
        rafChange={rafImpact}
        rafUp={member.ru !== false}
        onCall={noop('Call')}
      />

      {/* ── DOS selector + status pill ── */}
      <div className={styles.dosRow}>
        <div className={styles.dosRowLeft}>
          <DosSelector
            value={diagDosFilter ?? dosList[0]?.date}
            dosList={dosList}
            includeAllDOSs={true}
            onChange={(v) => setDiagDosFilter(v)}
          />
          {!isSweep && (
            <>
              <span className={styles.dosRowDivider} />
              {/* "With <Stage>" pill — hover opens the Review Progress
                   popover; the green ring on the left is a real progress
                   bar driven by the engine state. */}
              <span
                ref={pillRef}
                className={styles.withCoderPill}
                onMouseEnter={onPillEnter}
                onMouseLeave={onPillLeave}
                tabIndex={0}
                aria-label={`${pillLabel} — review ${Math.round(reviewProgress * 100)}% complete. Hover for details.`}
              >
                <ProgressRing progress={reviewProgress} size={16} stroke={2} />
                <span>{pillLabel}</span>
              </span>
              {pillRect && (
                <ReviewProgressPopover
                  anchorRect={pillRect}
                  stages={reviewStages}
                  onEnter={cancelClose}
                  onLeave={requestClose}
                  onClose={() => setPillRect(null)}
                />
              )}
            </>
          )}
        </div>
        <div className={styles.dosRowRight}>
          <AssigneeAvatar member={member} dosState={dosState} currentDos={currentDos} />
          <span className={styles.dosRowDivider} />
          {isSweep ? (
            <span className={styles.sweepBadge}>Sweep Mode</span>
          ) : (
            <DosStatusMenu
              value={currentStatus}
              onChange={handleStatusChange}
              gates={complianceGates}
            />
          )}
        </div>
      </div>

      {/* ── DOS toolbar — mirrors Figma node 1:41104. Left cluster:
          Bulk select + HCC/ICD toggle. Right cluster: + ICD, Filter,
          Documents, Comments, Activity Log, Search, More. ── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <ActionButton
            icon="solar:check-square-linear"
            size="S"
            tooltip="Bulk Action"
            onClick={noop('Bulk Action')}
          />
          <span className={styles.divider} />
          <Toggle items={VIEW_MODES} active={diagViewMode} onChange={setDiagViewMode} size="S" />
        </div>

        <div className={styles.toolbarIcons}>
          <button type="button" className={styles.addIcdBtn} onClick={noop('Add ICD')}>
            <Icon name="solar:add-circle-linear" size={16} color="var(--primary-300)" />
            <span>ICD</span>
          </button>
          <span className={styles.divider} />
          <ActionButton
            icon="custom:filter"
            size="S"
            tooltip="Filter"
            notification
            count="1"
            onClick={noop('Filter')}
          />
          <span className={styles.divider} />
          <ActionButton
            icon="solar:file-text-linear"
            size="S"
            tooltip="Documents"
            count={String(member?.docStatus?.length || member?.ch || 0)}
            /* Highlight only for the DOS-level Documents panel — an
               ICD-scoped open (from an ICD card's docs count) must NOT light
               up this global icon. Same rule as the Activity Log icon. */
            className={diagLeftPanel === 'documents' && !diagActivityIcd ? styles.activeIcon : ''}
            onClick={() => setDiagLeftPanel(diagLeftPanel === 'documents' && !diagActivityIcd ? null : 'documents')}
          />
          <span className={styles.divider} />
          <ActionButton
            icon="solar:chat-square-linear"
            size="S"
            tooltip="Comments"
            count="6"
            className={diagLeftPanel === 'comments' && !diagActivityIcd ? styles.activeIcon : ''}
            onClick={() => setDiagLeftPanel(diagLeftPanel === 'comments' && !diagActivityIcd ? null : 'comments')}
          />
          <span className={styles.divider} />
          <ActionButton
            icon="solar:history-linear"
            size="S"
            tooltip="Activity Log"
            /* Only highlight for the DOS-level log — an ICD-scoped activity
               log (opened from an ICD code) must NOT light up this global
               icon. */
            className={diagLeftPanel === 'activity' && !diagActivityIcd ? styles.activeIcon : ''}
            onClick={() => setDiagLeftPanel(diagLeftPanel === 'activity' && !diagActivityIcd ? null : 'activity')}
          />
          <span className={styles.divider} />
          <ActionButton
            icon="solar:magnifer-linear"
            size="S"
            tooltip="Search"
            onClick={() => setSearchOpen(o => !o)}
          />
          <span className={styles.divider} />
          <ActionButton
            icon="solar:menu-dots-linear"
            size="S"
            tooltip="More"
            onClick={noop('More')}
          />
        </div>
      </div>

      {/* ── Patient Summary tiles ── */}
      {!isSweep && (
        <SnapshotTiles
          counts={snapCounts}
          filter={diagSnapFilter}
          onFilter={setDiagSnapFilter}
          open={diagSnapOpen}
          onToggle={setDiagSnapOpen}
        />
      )}

      {/* ── Search bar (shown when search icon toggled) ── */}
      {searchOpen && (
        <div className={styles.searchBar}>
          <div className={styles.searchInput}>
            <Icon name="solar:magnifer-linear" size={15} color="var(--neutral-300)" />
            <input
              autoFocus
              type="text"
              placeholder="Search by code or description"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              className={styles.searchClose}
              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
              aria-label="Close search"
            >
              <Icon name="solar:close-linear" size={14} color="var(--neutral-300)" />
            </button>
          </div>
        </div>
      )}

      {/* ── Body: Sweep / ICD mode / HCC mode ────────────────────────────
          ICD mode is the default and matches the prototype's 4-section
          layout (Associated / Not Associated / Overridden / Closed). HCC
          mode shows the grouped cards. Sweep mode renders SweepList. */}
      <div className={styles.cardsList}>
        {isSweep ? (
          <SweepList memberName={member.name} dosList={dosList} />
        ) : diagViewMode === 'ICD' ? (
          <IcdSections
            assocICDs={assocICDs}
            allNotAssoc={allNotAssoc}
            overriddenICDs={overriddenICDs}
            closedICDs={closedICDs}
          />
        ) : (
          <>
            {activeGroups.length === 0 && notLinked.length === 0 && (
              <div className={styles.empty}>
                <Icon name="solar:file-text-linear" size={32} color="var(--neutral-200)" />
                <p>No HCC codes recorded yet for this member.</p>
              </div>
            )}
            {activeGroups.map(g => (
              <HccCard
                key={g.hcc}
                hccTitle={g.hcc}
                assoc={g.assoc}
                unlinked={g.unlinked}
              />
            ))}
          </>
        )}
      </div>
      </div>{/* ── /rightPane ── */}

      {diagLeftPanel && (
        <LeftWorkspace
          active={diagLeftPanel}
          icdScope={diagActivityIcd}
          onChange={setDiagTab}
          onClose={() => setDiagLeftPanel(null)}
          member={member}
          currentDos={currentDos}
        />
      )}
      </div>{/* ── /contentRow ── */}
    </Drawer>
  );
}

// ── SweepList — deduplicated ICD list across all DOSes. Phase 2d. ────────
function SweepList({ memberName, dosList }) {
}
