import { Drawer } from '../../../components/Drawer/Drawer';
import { BulkBar } from '../../../components/BulkBar/BulkBar';
import { CloseIcon } from '../../../components/Icon/CloseIcon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { LeftWorkspace } from './LeftWorkspace';
import { RejectRecordDialog } from './DiagPanelRejectDialog';
import { DiagPanelViewHeader } from './DiagPanelViewHeader';
import { DiagPanelViewToolbar } from './DiagPanelViewToolbar';
import { DiagPanelViewCards } from './DiagPanelViewCards';
import styles from './DiagPanel.module.css';

export function DiagPanelView(props) {
  const {
    member,
    closeDiagPanel,
    diagLeftPanel,
    contentRowRef,
    diagActivityIcd,
    activeIcdCode,
    setDiagTab,
    setFocusIdx,
    setDiagLeftPanel,
    pendingStatusChange,
    confirmPendingStatusChange,
    setPendingStatusChange,
    startResize,
    rhsWidth,
    bulkMode,
    selectedKeys,
    setSelectedKeys,
    bulkApply,
    bulkUndo,
    rejectPrompt,
    setRejectPrompt,
    confirmReject,
  } = props;

  if (!member) return null;

  return (
    <Drawer
      title={<span className={styles.drawerTitle}>Diagnosis Gaps Details</span>}
      onClose={closeDiagPanel}
      className={[styles.panel, diagLeftPanel ? styles.panelExpanded : ''].join(' ')}
      bodyClassName={[styles.body, diagLeftPanel ? styles.bodyExpanded : ''].join(' ')}
      headerStyle={{ display: 'none' }}
    >
      <div className={styles.titleRow}>
        <span className={styles.titleText}>Diagnosis Gaps Details</span>
        <ActionButton size="L" tooltip="Close" onClick={closeDiagPanel}>
          <CloseIcon size={20} color="var(--neutral-300)" />
        </ActionButton>
      </div>

      <div className={styles.contentRow} ref={contentRowRef}>
        {diagLeftPanel && (
          <>
            <LeftWorkspace
              active={diagLeftPanel}
              icdScope={diagActivityIcd ? (activeIcdCode ?? diagActivityIcd) : null}
              onChange={setDiagTab}
              onClose={() => { setFocusIdx(-1); setDiagLeftPanel(null); }}
              member={member}
              pendingStatusChange={pendingStatusChange}
              onConfirmStatusChange={confirmPendingStatusChange}
              onCancelStatusChange={() => setPendingStatusChange(null)}
            />
            <div
              className={styles.resizeHandle}
              onPointerDown={startResize}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize document workspace"
            />
          </>
        )}
        <div
          className={diagLeftPanel ? styles.rightPane : styles.rightPaneFull}
          style={diagLeftPanel && rhsWidth != null ? { flex: `0 0 ${rhsWidth}px` } : undefined}
        >
          <DiagPanelViewHeader {...props} />
          <DiagPanelViewToolbar {...props} />
          <DiagPanelViewCards {...props} />
        </div>
      </div>

      {bulkMode && (
        <BulkBar
          className={styles.bulkBarInDrawer}
          selectedIds={[...selectedKeys]}
          onClear={() => setSelectedKeys(new Set())}
          actions={[
            { label: 'Accept', icon: 'solar:check-read-linear', variant: 'primary', onClick: () => bulkApply('accepted') },
            { label: 'Dismiss', icon: 'solar:close-circle-linear', variant: 'secondary', onClick: () => bulkApply('rejected') },
          ]}
          moreActions={[
            { label: 'Missed Opportunity', icon: 'solar:flag-linear', onClick: () => bulkApply('missed') },
            { label: 'Defer', icon: 'solar:alarm-linear', onClick: () => bulkApply('deferred') },
            { label: 'Undo', icon: 'solar:undo-left-round-linear', onClick: bulkUndo },
          ]}
        />
      )}
      {rejectPrompt && (
        <RejectRecordDialog
          onCancel={() => setRejectPrompt(null)}
          onConfirm={confirmReject}
        />
      )}
    </Drawer>
  );
}
