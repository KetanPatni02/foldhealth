/**
 * PopulationGroupsView.jsx — Fold Health · Population Groups panel
 * Ported from the Pop-group-creation-via-file-upload prototype.
 */

import { usePopulationGroupsView } from './usePopulationGroupsView.js';
import { PopulationGroupsViewTable } from './PopulationGroupsViewTable.jsx';
import { PopulationGroupsCreateDrawer } from './PopulationGroupsCreateDrawer.jsx';
import './popgroups.css';

function PopulationGroupsView({
  activeFilter,
  onToggleSidebar,
  onMiniBarOpen,
  miniBarExpandRef,
  miniBarCloseRef,
  onModalClose,
  onBackdropChange,
  onGroupCreated,
  onUploadError,
  onMemberAdded,
}) {
  const vm = usePopulationGroupsView({
    activeFilter,
    onModalClose,
    onBackdropChange,
    onGroupCreated,
    onUploadError,
    onMemberAdded,
  });

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--neutral-0)', minWidth:0, position:'relative' }}>
      <PopulationGroupsViewTable vm={vm} onToggleSidebar={onToggleSidebar} />
      <PopulationGroupsCreateDrawer vm={vm} onMemberAdded={onMemberAdded} onGroupCreated={onGroupCreated} />
    </div>
  );
}

export { PopulationGroupsView };
